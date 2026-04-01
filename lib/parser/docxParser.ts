import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { ParsedDoc, ParagraphNode, RunFormat } from './types';

// Word XML namespace prefix used throughout OOXML.
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

/**
 * Parse a .docx File object into a {@link ParsedDoc}.
 *
 * All structural parsing (paragraphs, runs, formatting) is performed directly
 * against the OOXML XML in word/document.xml. mammoth.js is used only to
 * extract a plain-text representation for the AI context field.
 *
 * @param file - The .docx File object uploaded by the user.
 * @returns A Promise resolving to a fully-populated {@link ParsedDoc}.
 */
export async function parseDocx(file: File): Promise<ParsedDoc> {
  const arrayBuffer = await file.arrayBuffer();

  const [zip, mammothResult] = await Promise.all([
    JSZip.loadAsync(arrayBuffer),
    mammoth.extractRawText({ arrayBuffer }),
  ]);

  const xmlEntry = zip.file('word/document.xml');
  if (!xmlEntry) {
    throw new Error(`word/document.xml not found in ${file.name}`);
  }

  const xmlString = await xmlEntry.async('string');
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml');

  const paragraphEls = Array.from(doc.getElementsByTagNameNS(W, 'p'));
  const paragraphs: ParagraphNode[] = paragraphEls.map((el, index) =>
    parseParagraph(el, index)
  );

  return {
    paragraphs,
    rawText: mammothResult.value,
    filename: file.name,
  };
}

/**
 * Convert a single `<w:p>` element into a {@link ParagraphNode}.
 *
 * @param el - The `<w:p>` DOM element.
 * @param index - Zero-based document-order index.
 * @returns A populated {@link ParagraphNode}.
 */
function parseParagraph(el: Element, index: number): ParagraphNode {
  const pPr = firstChildNS(el, W, 'pPr');

  // --- Paragraph style ---
  const style =
    pPr
      ? attr(firstChildNS(pPr, W, 'pStyle'), W, 'val') ?? 'Normal'
      : 'Normal';

  // --- Alignment ---
  const alignment = pPr
    ? attr(firstChildNS(pPr, W, 'jc'), W, 'val') ?? 'left'
    : 'left';

  // --- Indentation ---
  const indEl = pPr ? firstChildNS(pPr, W, 'ind') : null;
  const indentLeft = parseIntAttr(indEl, W, 'left');
  const indentRight = parseIntAttr(indEl, W, 'right');

  // --- List numbering ---
  const numPrEl = pPr ? firstChildNS(pPr, W, 'numPr') : null;
  const numId = numPrEl
    ? attr(firstChildNS(numPrEl, W, 'numId'), W, 'val') ?? ''
    : '';

  // --- Runs ---
  const runEls = Array.from(el.getElementsByTagNameNS(W, 'r'));
  const runs: RunFormat[] = runEls.map((r) => parseRun(r));

  // --- Text: concatenate all <w:t> nodes ---
  const tNodes = Array.from(el.getElementsByTagNameNS(W, 't'));
  const text = tNodes.map((t) => t.textContent ?? '').join('');

  return { index, text, style, alignment, indentLeft, indentRight, numId, runs };
}

/**
 * Parse the formatting properties of a single `<w:r>` run element.
 *
 * @param el - The `<w:r>` DOM element.
 * @returns A {@link RunFormat} describing the run's visual properties.
 */
function parseRun(el: Element): RunFormat {
  const rPr = firstChildNS(el, W, 'rPr');

  if (!rPr) {
    return {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      fontSize: null,
      color: null,
      fontFamily: null,
    };
  }

  // Bold: <w:b/> present and not w:val="0"
  const bold = isFlagSet(rPr, W, 'b');
  const italic = isFlagSet(rPr, W, 'i');
  const underline =
    firstChildNS(rPr, W, 'u') !== null &&
    attr(firstChildNS(rPr, W, 'u'), W, 'val') !== 'none';
  const strikethrough = isFlagSet(rPr, W, 'strike');

  // Font size: <w:sz w:val="24"/> (half-points)
  const fontSize = attr(firstChildNS(rPr, W, 'sz'), W, 'val');

  // Color: <w:color w:val="FF0000"/>
  const colorVal = attr(firstChildNS(rPr, W, 'color'), W, 'val');
  const color = colorVal === 'auto' || colorVal === null ? null : colorVal;

  // Font family: <w:rFonts w:ascii="Arial"/>
  const fontFamily = attr(firstChildNS(rPr, W, 'rFonts'), W, 'ascii') ?? null;

  return { bold, italic, underline, strikethrough, fontSize, color, fontFamily };
}

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

/**
 * Return the first direct child element with the given namespace and local name.
 *
 * @param parent - The parent element to search within.
 * @param ns - The XML namespace URI.
 * @param localName - The element local name.
 * @returns The first matching child element, or null.
 */
function firstChildNS(
  parent: Element | null,
  ns: string,
  localName: string
): Element | null {
  if (!parent) return null;
  for (const child of Array.from(parent.children)) {
    if (child.namespaceURI === ns && child.localName === localName) {
      return child;
    }
  }
  return null;
}

/**
 * Read a namespaced attribute value from an element.
 *
 * @param el - The element to read from (may be null).
 * @param ns - The attribute namespace URI.
 * @param localName - The attribute local name.
 * @returns The string value, or null if the element or attribute is absent.
 */
function attr(
  el: Element | null,
  ns: string,
  localName: string
): string | null {
  if (!el) return null;
  return el.getAttributeNS(ns, localName);
}

/**
 * Read a namespaced integer attribute, returning 0 if absent or non-numeric.
 *
 * @param el - The element to read from (may be null).
 * @param ns - The attribute namespace URI.
 * @param localName - The attribute local name.
 * @returns The parsed integer value, or 0.
 */
function parseIntAttr(
  el: Element | null,
  ns: string,
  localName: string
): number {
  const raw = attr(el, ns, localName);
  if (raw === null) return 0;
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Determine whether a toggle flag element (e.g. `<w:b/>`) is set.
 *
 * A flag element is considered ON when it is present and either has no `w:val`
 * attribute or has `w:val` set to anything other than `"0"` or `"false"`.
 *
 * @param rPr - The `<w:rPr>` element to search within.
 * @param ns - The XML namespace URI.
 * @param localName - The flag element local name.
 * @returns True if the flag is active.
 */
function isFlagSet(rPr: Element, ns: string, localName: string): boolean {
  const el = firstChildNS(rPr, ns, localName);
  if (!el) return false;
  const val = el.getAttributeNS(ns, 'val');
  return val !== '0' && val !== 'false';
}
