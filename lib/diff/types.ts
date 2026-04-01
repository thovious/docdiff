/**
 * The kind of change detected between two paragraphs.
 * - 'added': paragraph exists only in the changed document
 * - 'removed': paragraph exists only in the original document
 * - 'modified': paragraph text changed between documents
 * - 'format': paragraph text is identical but formatting differs
 */
export type ChangeType = 'added' | 'removed' | 'modified' | 'format';

/**
 * High-level category grouping for a change record.
 */
export type ChangeCategory = 'content' | 'formatting';

/**
 * A single segment of a word-level inline diff between two strings.
 */
export interface InlineDiffSegment {
  type: 'equal' | 'added' | 'removed';
  value: string;
}

/**
 * A single detected change between the original and changed documents.
 */
export interface ChangeRecord {
  /** Deterministic ID: `${type}-${origIdx ?? ''}-${changedIdx ?? ''}` */
  id: string;
  type: ChangeType;
  category: ChangeCategory;
  /** Human-readable location, e.g. "Paragraph 12". */
  location: string;
  /** Short description shown in collapsed list row. */
  summary: string;
  origText: string;
  changedText: string;
  origIndex: number | null;
  changedIndex: number | null;
  /** Word-level diff segments. Populated for 'modified' changes. */
  inlineDiff: InlineDiffSegment[];
  /** Human-readable format change descriptions. Populated for 'format' changes. */
  formatDetails: string[];
}

/**
 * The complete result of comparing two documents.
 */
export interface DiffResult {
  changes: ChangeRecord[];
  totalChanges: number;
  contentChanges: number;
  formattingChanges: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

/**
 * The AI-generated plain-English summary returned from /api/summarize.
 */
export interface InsightSummary {
  summary: string;
  confidence: 'high' | 'medium';
}
