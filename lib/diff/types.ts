/**
 * The kind of change detected between two paragraphs.
 * - 'added': paragraph exists only in the changed document
 * - 'removed': paragraph exists only in the original document
 * - 'modified': paragraph text changed between documents
 * - 'format': paragraph text is identical but formatting differs
 * - 'metadata': a document metadata field differs (filename, author, etc.)
 */
export type ChangeType = 'added' | 'removed' | 'modified' | 'format' | 'metadata';

/**
 * High-level category grouping for a change record.
 */
export type ChangeCategory = 'content' | 'formatting' | 'metadata';

/**
 * Which three-way comparison view produced this change.
 */
export type ComparisonView = 'tmpl-v1' | 'v1-v2' | 'tmpl-v2';

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
  /** Deterministic ID: prefixed with view slug for global uniqueness in three-way results. */
  id: string;
  type: ChangeType;
  category: ChangeCategory;
  /** Which comparison view this change belongs to. */
  view: ComparisonView;
  /** Human-readable location, e.g. "Paragraph 12" or "Document Properties". */
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
  /** The metadata field name for 'metadata' changes, e.g. "filename", "author". */
  metadataField?: string;
}

/**
 * The complete result of comparing two documents.
 */
export interface DiffResult {
  /** Which comparison view produced this result. */
  view: ComparisonView;
  changes: ChangeRecord[];
  totalChanges: number;
  contentChanges: number;
  formattingChanges: number;
  metadataChanges: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

/**
 * The combined result of all three comparison views.
 */
export interface ThreeWayDiffResult {
  tmplV1: DiffResult;
  v1V2: DiffResult;
  tmplV2: DiffResult;
  /** Flat union of all three views; each change ID is prefixed by view slug. */
  allChanges: ChangeRecord[];
}

/**
 * The AI-generated plain-English summary returned from /api/summarize.
 * @deprecated Use AnalysisResult from lib/agent/types instead.
 */
export interface InsightSummary {
  summary: string;
  confidence: 'high' | 'medium';
}
