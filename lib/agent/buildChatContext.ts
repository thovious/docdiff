import type { ChatContext } from './types';

const MAX_CONTEXT_CHARS = 3000 * 4; // ~3,000 tokens

/**
 * Build a compact, token-efficient context string for the chat system prompt.
 *
 * Includes: document names, executive summary, risk flags, priority change IDs,
 * all change record summaries + locations, and all agent annotations.
 *
 * Omits `origText`/`changedText` from change records to conserve tokens.
 *
 * @param ctx - The full chat context containing diff and analysis data.
 * @returns A string to be embedded in the chat system prompt.
 */
export function buildChatContext(ctx: ChatContext): string {
  const { threeWayDiff, analysisResult, documentNames } = ctx;

  const lines: string[] = [];

  // Document names
  lines.push('DOCUMENTS:');
  lines.push(`- Template: ${documentNames.template}`);
  lines.push(`- Version 1: ${documentNames.v1}`);
  lines.push(`- Version 2: ${documentNames.v2}`);
  lines.push('');

  // Executive summary
  lines.push('EXECUTIVE SUMMARY:');
  lines.push(analysisResult.executiveSummary);
  lines.push('');

  // Risk flags
  if (analysisResult.riskFlags.length > 0) {
    lines.push('RISK FLAGS:');
    for (const flag of analysisResult.riskFlags) {
      lines.push(`- ${flag}`);
    }
    lines.push('');
  }

  // Priority changes
  if (analysisResult.priorityChanges.length > 0) {
    lines.push('PRIORITY CHANGES (review these first):');
    lines.push(analysisResult.priorityChanges.join(', '));
    lines.push('');
  }

  // Build a map from changeId → annotation for quick lookup
  const annotationMap = new Map(
    analysisResult.annotations.map((a) => [a.changeId, a])
  );

  // All changes: summary + location + annotation (no raw text)
  const total = threeWayDiff.allChanges.length;
  lines.push(`CHANGES (${total} total across all views):`);

  for (const c of threeWayDiff.allChanges) {
    const annotation = annotationMap.get(c.id);
    const sig = annotation?.significance ?? 'informational';
    const ann = annotation?.annotation ?? '';
    const cite = annotation?.citation ?? '';

    lines.push(`[${c.id}] [${sig}] ${c.view} | ${c.location} | ${c.summary}`);
    if (cite) lines.push(`  Citation: ${cite}`);
    if (ann) lines.push(`  Analysis: ${ann}`);
  }

  const fullContext = lines.join('\n');

  // If over budget, trim the changes section while preserving the header
  if (fullContext.length <= MAX_CONTEXT_CHARS) {
    return fullContext;
  }

  // Truncate at the budget, preserving complete lines
  const truncated = fullContext.slice(0, MAX_CONTEXT_CHARS);
  const lastNewline = truncated.lastIndexOf('\n');
  return truncated.slice(0, lastNewline) + '\n[...additional changes omitted for brevity]';
}
