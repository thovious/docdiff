import type { ParagraphNode, RunFormat } from '../parser/types';

/**
 * Compare two {@link ParagraphNode} objects that have identical text and
 * produce human-readable descriptions of any formatting differences.
 *
 * @param orig - The paragraph from the original document.
 * @param changed - The paragraph from the changed document.
 * @returns An array of human-readable change descriptions, e.g.
 *   `["Style: 'Normal' → 'Heading1'", "Bold added to run 2"]`.
 *   Returns an empty array when no formatting differences are detected.
 */
export function formatDiff(
  orig: ParagraphNode,
  changed: ParagraphNode
): string[] {
  const details: string[] = [];

  // --- Paragraph-level properties ---
  if (orig.style !== changed.style) {
    details.push(`Style: '${orig.style}' → '${changed.style}'`);
  }
  if (orig.alignment !== changed.alignment) {
    details.push(`Alignment: '${orig.alignment}' → '${changed.alignment}'`);
  }
  if (orig.indentLeft !== changed.indentLeft) {
    details.push(`Left indent: ${orig.indentLeft} → ${changed.indentLeft}`);
  }
  if (orig.indentRight !== changed.indentRight) {
    details.push(`Right indent: ${orig.indentRight} → ${changed.indentRight}`);
  }
  if (orig.numId !== changed.numId) {
    details.push(`List ID: '${orig.numId}' → '${changed.numId}'`);
  }

  // --- Run-level properties ---
  const maxRuns = Math.max(orig.runs.length, changed.runs.length);
  for (let i = 0; i < maxRuns; i++) {
    const oRun = orig.runs[i];
    const cRun = changed.runs[i];
    const runLabel = `run ${i + 1}`;

    if (!oRun && cRun) {
      details.push(`${runLabel} added`);
      continue;
    }
    if (oRun && !cRun) {
      details.push(`${runLabel} removed`);
      continue;
    }
    if (!oRun || !cRun) continue;

    details.push(...diffRunFormat(oRun, cRun, runLabel));
  }

  return details;
}

/**
 * Compare two {@link RunFormat} objects and return descriptions of differences.
 *
 * @param orig - Original run formatting.
 * @param changed - Changed run formatting.
 * @param runLabel - Label used in descriptions, e.g. "run 1".
 * @returns Array of change description strings for this run.
 */
function diffRunFormat(
  orig: RunFormat,
  changed: RunFormat,
  runLabel: string
): string[] {
  const details: string[] = [];

  const boolProps: Array<[keyof RunFormat, string]> = [
    ['bold', 'Bold'],
    ['italic', 'Italic'],
    ['underline', 'Underline'],
    ['strikethrough', 'Strikethrough'],
  ];

  for (const [key, label] of boolProps) {
    const o = orig[key] as boolean;
    const c = changed[key] as boolean;
    if (o !== c) {
      details.push(`${label} ${c ? 'added' : 'removed'} in ${runLabel}`);
    }
  }

  if (orig.fontSize !== changed.fontSize) {
    details.push(
      `Font size changed in ${runLabel}: ${orig.fontSize ?? 'default'} → ${changed.fontSize ?? 'default'}`
    );
  }
  if (orig.color !== changed.color) {
    details.push(
      `Color changed in ${runLabel}: ${orig.color ?? 'default'} → ${changed.color ?? 'default'}`
    );
  }
  if (orig.fontFamily !== changed.fontFamily) {
    details.push(
      `Font family changed in ${runLabel}: ${orig.fontFamily ?? 'default'} → ${changed.fontFamily ?? 'default'}`
    );
  }

  return details;
}
