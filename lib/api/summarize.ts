import type { DiffResult, InsightSummary } from '@/lib/diff/types';

/**
 * The request payload sent to /api/summarize.
 */
interface SummarizePayload {
  changes: Array<{
    type: string;
    category: string;
    summary: string;
  }>;
  totalChanges: number;
  contentChanges: number;
  formattingChanges: number;
}

/**
 * Call the server-side /api/summarize proxy and return an {@link InsightSummary}.
 *
 * Only a structured, anonymised change list is sent to the server — no raw
 * document text ever leaves the browser.
 *
 * @param result - The {@link DiffResult} produced by the diff engine.
 * @returns A Promise resolving to an {@link InsightSummary}.
 * @throws An Error if the server returns a non-OK response.
 */
export async function fetchSummary(result: DiffResult): Promise<InsightSummary> {
  const payload: SummarizePayload = {
    changes: result.changes.slice(0, 20).map((c) => ({
      type: c.type,
      category: c.category,
      summary: c.summary,
    })),
    totalChanges: result.totalChanges,
    contentChanges: result.contentChanges,
    formattingChanges: result.formattingChanges,
  };

  const res = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Summarize API returned ${res.status}`);
  }

  const data = await res.json() as { summary: string };
  return {
    summary: data.summary,
    confidence: 'high',
  };
}
