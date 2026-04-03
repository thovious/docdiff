import type { ThreeWayDiffResult } from '../diff/types';
import type { ChangeRecord } from '../diff/types';

const MAX_TEXT_LENGTH = 200;
/** Rough character-to-token ratio for English text. */
const CHARS_PER_TOKEN = 4;
const TOKEN_BUDGET = 6000;

/**
 * Truncate a string to a maximum number of characters, appending `…` if cut.
 *
 * @param str - The string to truncate.
 * @param max - Maximum allowed length.
 * @returns The original or truncated string.
 */
function trunc(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

/**
 * Format a single {@link ChangeRecord} as a compact text block for the agent prompt.
 *
 * @param c - The change record to format.
 * @returns A multi-line string block describing the change.
 */
function formatChange(c: ChangeRecord): string {
  const lines = [
    `[${c.id}]`,
    `View: ${c.view}`,
    `Type: ${c.type} | Category: ${c.category}`,
    `Location: ${c.location}`,
    `Summary: ${c.summary}`,
  ];

  if (c.origText) lines.push(`Before: ${trunc(c.origText, MAX_TEXT_LENGTH)}`);
  if (c.changedText) lines.push(`After: ${trunc(c.changedText, MAX_TEXT_LENGTH)}`);
  if (c.metadataField) lines.push(`Field: ${c.metadataField}`);

  return lines.join('\n');
}

/**
 * Assign a numeric signal weight to a change record for budget-trimming purposes.
 * Higher = more important = keep when trimming.
 *
 * @param c - The change record to score.
 * @returns A numeric signal score.
 */
function signalScore(c: ChangeRecord): number {
  if (c.type === 'modified' || c.type === 'added' || c.type === 'removed') return 3;
  if (c.type === 'format') return 1;
  if (c.type === 'metadata') return 1;
  return 2;
}

/**
 * Transform a {@link ThreeWayDiffResult} into a structured prompt payload for
 * the contract analysis agent.
 *
 * Groups changes by view (tmplV2 first, then v1V2, then tmplV1) and trims
 * low-signal changes if the total token budget would be exceeded.
 *
 * @param diff - The three-way diff result to summarize.
 * @returns A single string to be appended to the agent's user turn.
 */
export function buildAnalysisPrompt(diff: ThreeWayDiffResult): string {
  // Order: tmplV2 (highest signal), then v1V2, then tmplV1
  const orderedChanges: ChangeRecord[] = [
    ...diff.tmplV2.changes,
    ...diff.v1V2.changes,
    ...diff.tmplV1.changes,
  ];

  // Sort within each group: content changes first, then format/metadata (lower signal)
  const sorted = [...orderedChanges].sort((a, b) => signalScore(b) - signalScore(a));

  // Trim to token budget
  const kept: ChangeRecord[] = [];
  let charCount = 0;
  const budgetChars = TOKEN_BUDGET * CHARS_PER_TOKEN;

  for (const c of sorted) {
    const block = formatChange(c);
    if (charCount + block.length > budgetChars) break;
    kept.push(c);
    charCount += block.length + 2; // +2 for separator
  }

  const sections: string[] = [];

  const tmplV2Changes = kept.filter((c) => c.view === 'tmpl-v2');
  const v1V2Changes = kept.filter((c) => c.view === 'v1-v2');
  const tmplV1Changes = kept.filter((c) => c.view === 'tmpl-v1');

  if (tmplV2Changes.length > 0) {
    sections.push(
      `## Template → V2 (Net Deviation from Template)\n${tmplV2Changes.map(formatChange).join('\n\n')}`
    );
  }
  if (v1V2Changes.length > 0) {
    sections.push(
      `## V1 → V2 (Negotiation Round Changes)\n${v1V2Changes.map(formatChange).join('\n\n')}`
    );
  }
  if (tmplV1Changes.length > 0) {
    sections.push(
      `## Template → V1 (First Draft Changes)\n${tmplV1Changes.map(formatChange).join('\n\n')}`
    );
  }

  const trimmedNote =
    orderedChanges.length > kept.length
      ? `\n\n[Note: ${orderedChanges.length - kept.length} lower-signal changes omitted to fit token budget.]`
      : '';

  return `The following changes were detected across three comparison views:\n\n${sections.join('\n\n')}${trimmedNote}`;
}
