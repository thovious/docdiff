import type JSZip from 'jszip';
import type { DocMetadata } from './types';

/**
 * Extract document metadata from the docProps/core.xml entry of a .docx archive.
 *
 * All fields are nullable — a missing property returns null, never throws.
 *
 * @param file - The original File object (used for filename).
 * @param zip - The loaded JSZip archive of the .docx file.
 * @returns A Promise resolving to a {@link DocMetadata} object.
 */
export async function extractMetadata(
  file: File,
  zip: JSZip
): Promise<DocMetadata> {
  const metadata: DocMetadata = {
    filename: file.name,
    title: null,
    author: null,
    lastModifiedBy: null,
    createdAt: null,
    modifiedAt: null,
    revision: null,
  };

  try {
    const coreEntry = zip.file('docProps/core.xml');
    if (!coreEntry) return metadata;

    const xmlString = await coreEntry.async('string');
    const doc = new DOMParser().parseFromString(xmlString, 'application/xml');

    metadata.title = getElementText(doc, 'dc:title') ?? getElementTextNS(doc, 'http://purl.org/dc/elements/1.1/', 'title');
    metadata.author = getElementText(doc, 'dc:creator') ?? getElementTextNS(doc, 'http://purl.org/dc/elements/1.1/', 'creator');
    metadata.lastModifiedBy = getElementText(doc, 'cp:lastModifiedBy') ?? getElementTextNS(doc, 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties', 'lastModifiedBy');
    metadata.createdAt = getElementText(doc, 'dcterms:created') ?? getElementTextNS(doc, 'http://purl.org/dc/terms/', 'created');
    metadata.modifiedAt = getElementText(doc, 'dcterms:modified') ?? getElementTextNS(doc, 'http://purl.org/dc/terms/', 'modified');
    metadata.revision = getElementText(doc, 'cp:revision') ?? getElementTextNS(doc, 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties', 'revision');
  } catch {
    // Silently return partial metadata on any parse error.
  }

  return metadata;
}

/**
 * Get the text content of an element by its prefixed tag name.
 *
 * @param doc - The parsed XML document.
 * @param tagName - Prefixed tag name, e.g. "dc:title".
 * @returns The trimmed text content, or null if the element is absent or empty.
 */
function getElementText(doc: Document, tagName: string): string | null {
  const el = doc.getElementsByTagName(tagName)[0];
  if (!el) return null;
  const text = el.textContent?.trim();
  return text || null;
}

/**
 * Get the text content of an element by namespace URI and local name.
 *
 * @param doc - The parsed XML document.
 * @param ns - The namespace URI.
 * @param localName - The element local name.
 * @returns The trimmed text content, or null if the element is absent or empty.
 */
function getElementTextNS(doc: Document, ns: string, localName: string): string | null {
  const els = doc.getElementsByTagNameNS(ns, localName);
  if (!els.length) return null;
  const text = els[0].textContent?.trim();
  return text || null;
}
