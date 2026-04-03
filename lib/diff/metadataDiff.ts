import type { DocMetadata } from '../parser/types';
import type { ChangeRecord, ComparisonView } from './types';

type MetadataField = keyof Omit<DocMetadata, 'modifiedAt' | 'createdAt'>;

const COMPARED_FIELDS: MetadataField[] = [
  'filename',
  'title',
  'author',
  'lastModifiedBy',
  'revision',
];

const FIELD_LABEL: Record<MetadataField, string> = {
  filename: 'Filename',
  title: 'Document title',
  author: 'Original author',
  lastModifiedBy: 'Last modified by',
  revision: 'Revision number',
};

/**
 * Compare metadata from two documents and return a {@link ChangeRecord} for
 * each field that differs.
 *
 * @param orig - Metadata from the left-hand document.
 * @param changed - Metadata from the right-hand document.
 * @param view - Which comparison view this diff belongs to.
 * @returns An array of metadata {@link ChangeRecord} objects, one per differing field.
 */
export function metadataDiff(
  orig: DocMetadata,
  changed: DocMetadata,
  view: ComparisonView
): ChangeRecord[] {
  const records: ChangeRecord[] = [];

  for (const field of COMPARED_FIELDS) {
    const origVal = orig[field] ?? null;
    const changedVal = changed[field] ?? null;

    if (origVal === changedVal) continue;

    const label = FIELD_LABEL[field];
    const origDisplay = origVal ?? '(none)';
    const changedDisplay = changedVal ?? '(none)';

    let summary: string;
    if (field === 'filename') {
      summary = `Filename changed: "${origDisplay}" → "${changedDisplay}"`;
    } else {
      summary = `${label} changed: "${origDisplay}" → "${changedDisplay}"`;
    }

    records.push({
      id: `metadata-${field}`,
      type: 'metadata',
      category: 'metadata',
      view,
      location: 'Document Properties',
      summary,
      origText: origDisplay,
      changedText: changedDisplay,
      origIndex: null,
      changedIndex: null,
      inlineDiff: [],
      formatDetails: [],
      metadataField: field,
    });
  }

  return records;
}
