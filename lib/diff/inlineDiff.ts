import { buildLCSMatrix, backtrack } from './lcs';
import type { InlineDiffSegment } from './types';

/**
 * Produce a word-level inline diff between two strings.
 *
 * Tokens are split on whitespace boundaries using `/(\s+)/` so that
 * whitespace is preserved as its own token and never lost.
 *
 * @param origText - The original paragraph text.
 * @param changedText - The changed paragraph text.
 * @returns An ordered array of {@link InlineDiffSegment} tagged as
 *   `equal`, `added`, or `removed`.
 */
export function inlineDiff(
  origText: string,
  changedText: string
): InlineDiffSegment[] {
  if (origText === changedText) {
    return origText === '' ? [] : [{ type: 'equal', value: origText }];
  }

  if (origText === '') {
    return [{ type: 'added', value: changedText }];
  }

  if (changedText === '') {
    return [{ type: 'removed', value: origText }];
  }

  // Split on whitespace boundaries, keeping separators as tokens.
  const origTokens = origText.split(/(\s+)/);
  const changedTokens = changedText.split(/(\s+)/);

  const matrix = buildLCSMatrix(origTokens, changedTokens);
  const ops = backtrack(matrix, origTokens, changedTokens);

  const segments: InlineDiffSegment[] = [];

  for (const op of ops) {
    if (op.op === 'equal') {
      const value = origTokens[op.aIdx];
      const last = segments[segments.length - 1];
      if (last?.type === 'equal') {
        last.value += value;
      } else {
        segments.push({ type: 'equal', value });
      }
    } else if (op.op === 'added') {
      const value = changedTokens[op.bIdx];
      const last = segments[segments.length - 1];
      if (last?.type === 'added') {
        last.value += value;
      } else {
        segments.push({ type: 'added', value });
      }
    } else {
      const value = origTokens[op.aIdx];
      const last = segments[segments.length - 1];
      if (last?.type === 'removed') {
        last.value += value;
      } else {
        segments.push({ type: 'removed', value });
      }
    }
  }

  return segments;
}
