/**
 * Formatting properties for a single text run within a paragraph.
 */
export interface RunFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  /** Half-points, e.g. "24" = 12pt. Null if not explicitly set. */
  fontSize: string | null;
  /** Hex color, e.g. "FF0000". Null if not explicitly set. */
  color: string | null;
  fontFamily: string | null;
}

/**
 * A single paragraph extracted from a .docx document, including its text,
 * structural style, and per-run formatting details.
 */
export interface ParagraphNode {
  /** Zero-based document order index. */
  index: number;
  /** Concatenated plain text of all runs in this paragraph. */
  text: string;
  /** Paragraph style name, e.g. "Heading1", "Normal", "ListParagraph". */
  style: string;
  /** Text alignment: "left" | "center" | "right" | "both". */
  alignment: string;
  /** Left indent in twentieths of a point (twips). */
  indentLeft: number;
  /** Right indent in twentieths of a point (twips). */
  indentRight: number;
  /** List numbering ID. Empty string if not a list item. */
  numId: string;
  /** Ordered array of run-level formatting for each <w:r> in the paragraph. */
  runs: RunFormat[];
}

/**
 * Document-level metadata extracted from docProps/core.xml.
 */
export interface DocMetadata {
  /** Original filename of the uploaded file (File.name). */
  filename: string;
  /** dc:title */
  title: string | null;
  /** dc:creator */
  author: string | null;
  /** cp:lastModifiedBy */
  lastModifiedBy: string | null;
  /** dcterms:created */
  createdAt: string | null;
  /** dcterms:modified */
  modifiedAt: string | null;
  /** cp:revision */
  revision: string | null;
}

/**
 * The full parsed representation of a .docx file.
 */
export interface ParsedDoc {
  paragraphs: ParagraphNode[];
  /** Full document plain text, extracted via mammoth.js. Used as AI context. */
  rawText: string;
  /** Original filename of the uploaded file. */
  filename: string;
  /** Document metadata extracted from docProps/core.xml. */
  metadata: DocMetadata;
}
