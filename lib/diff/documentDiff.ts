import { buildLCSMatrix, backtrack } from './lcs';
import { inlineDiff } from './inlineDiff';
import { formatDiff } from './formatDiff';
import type { ParsedDoc } from '../parser/types';
import type { ChangeRecord, DiffResult } from './types';

/**
 * Compare two parsed documents and produce a complete {@link DiffResult}.
 *
 * Pipeline:
 * 1. Run LCS on paragraph text arrays.
 * 2. Backtrack to produce edit operations.
 * 3. Classify each operation: added / removed / modified / format.
 * 4. Populate inline word-level diff for modified paragraphs.
 * 5. Populate format details for format-only changes.
 * 6. Deduplicate by id and compute summary counts.
 *
 * @param origDoc - The parsed original document.
 * @param changedDoc - The parsed changed document.
 * @returns A {@link DiffResult} with all detected changes and aggregate counts.
 */
export function documentDiff(
  origDoc: ParsedDoc,
  changedDoc: ParsedDoc
): DiffResult {
  const origParas = origDoc.paragraphs;
  const changedParas = changedDoc.paragraphs;

  const origTexts = origParas.map((p) => p.text);
  const changedTexts = changedParas.map((p) => p.text);

  const matrix = buildLCSMatrix(origTexts, changedTexts);
  const ops = backtrack(matrix, origTexts, changedTexts);

  const seen = new Set<string>();
  const changes: ChangeRecord[] = [];

  for (const op of ops) {
    let record: ChangeRecord | null = null;

    if (op.op === 'equal') {
      const orig = origParas[op.aIdx];
      const ch = changedParas[op.bIdx];
      const fmtDetails = formatDiff(orig, ch);

      if (fmtDetails.length > 0) {
        record = {
          id: `format-${op.aIdx}-${op.bIdx}`,
          type: 'format',
          category: 'formatting',
          location: `Paragraph ${op.aIdx + 1}`,
          summary: `Formatting changed: ${fmtDetails[0]}${fmtDetails.length > 1 ? ` (+${fmtDetails.length - 1} more)` : ''}`,
          origText: orig.text,
          changedText: ch.text,
          origIndex: op.aIdx,
          changedIndex: op.bIdx,
          inlineDiff: [],
          formatDetails: fmtDetails,
        };
      }
    } else if (op.op === 'removed') {
      const orig = origParas[op.aIdx];
      record = {
        id: `removed-${op.aIdx}-`,
        type: 'removed',
        category: 'content',
        location: `Paragraph ${op.aIdx + 1}`,
        summary: truncate(`Removed: "${orig.text}"`, 120),
        origText: orig.text,
        changedText: '',
        origIndex: op.aIdx,
        changedIndex: null,
        inlineDiff: [],
        formatDetails: [],
      };
    } else {
      // op.op === 'added'
      const ch = changedParas[op.bIdx];
      record = {
        id: `added--${op.bIdx}`,
        type: 'added',
        category: 'content',
        location: `Paragraph ${op.bIdx + 1}`,
        summary: truncate(`Added: "${ch.text}"`, 120),
        origText: '',
        changedText: ch.text,
        origIndex: null,
        changedIndex: op.bIdx,
        inlineDiff: [],
        formatDetails: [],
      };
    }

    if (!record) continue;
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    changes.push(record);
  }

  // Pair adjacent removed/added operations that represent a modified paragraph.
  // LCS emits a removed + added pair when a paragraph's text changed; we merge
  // them into a single 'modified' record with an inline diff.
  const merged = mergeModified(changes);

  // Compute counts.
  let contentChanges = 0;
  let formattingChanges = 0;
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  for (const c of merged) {
    if (c.category === 'content') contentChanges++;
    else formattingChanges++;

    if (c.type === 'added') addedCount++;
    else if (c.type === 'removed') removedCount++;
    else if (c.type === 'modified') modifiedCount++;
  }

  return {
    changes: merged,
    totalChanges: merged.length,
    contentChanges,
    formattingChanges,
    addedCount,
    removedCount,
    modifiedCount,
  };
}

/**
 * Merge consecutive `removed` + `added` pairs into `modified` records.
 * A removed/added pair that are document-adjacent (neighbouring paragraphs)
 * is treated as a text modification rather than a deletion + insertion.
 *
 * @param changes - Ordered array of raw {@link ChangeRecord} objects.
 * @returns A new array with eligible pairs collapsed into `modified` records.
 */
function mergeModified(changes: ChangeRecord[]): ChangeRecord[] {
  const result: ChangeRecord[] = [];
  let i = 0;

  while (i < changes.length) {
    const cur = changes[i];
    const next = changes[i + 1];

    if (
      cur.type === 'removed' &&
      next?.type === 'added' &&
      cur.origIndex !== null &&
      next.changedIndex !== null
    ) {
      const segments = inlineDiff(cur.origText, next.changedText);
      result.push({
        id: `modified-${cur.origIndex}-${next.changedIndex}`,
        type: 'modified',
        category: 'content',
        location: `Paragraph ${cur.origIndex + 1}`,
        summary: truncate(`Modified: "${cur.origText}" → "${next.changedText}"`, 120),
        origText: cur.origText,
        changedText: next.changedText,
        origIndex: cur.origIndex,
        changedIndex: next.changedIndex,
        inlineDiff: segments,
        formatDetails: [],
      });
      i += 2;
    } else {
      result.push(cur);
      i++;
    }
  }

  return result;
}

/**
 * Truncate a string to `maxLen` characters, appending `…` if truncated.
 *
 * @param str - The string to truncate.
 * @param maxLen - Maximum allowed length.
 * @returns The original string or a truncated version ending in `…`.
 */
function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + '…';
}
