'use client';

import { useState, useCallback } from 'react';
import { parseDocx } from '@/lib/parser/docxParser';
import { documentDiff } from '@/lib/diff/documentDiff';
import { fetchSummary } from '@/lib/api/summarize';
import type { DiffResult, InsightSummary } from '@/lib/diff/types';

export type AnalysisStatus =
  | 'idle'
  | 'parsing'
  | 'diffing'
  | 'summarizing'
  | 'done'
  | 'error';

export interface DocxAnalysisState {
  status: AnalysisStatus;
  /** 0–100 */
  progress: number;
  progressLabel: string;
  result: DiffResult | null;
  insight: InsightSummary | null;
  error: string | null;
  /** Start a new analysis. Calling this while a previous analysis is running resets and restarts. */
  analyze: (origFile: File, changedFile: File) => Promise<void>;
  /** Reset all state back to idle. */
  reset: () => void;
}

const IDLE_STATE = {
  status: 'idle' as AnalysisStatus,
  progress: 0,
  progressLabel: '',
  result: null,
  insight: null,
  error: null,
};

/**
 * Orchestrate the full DocDiff analysis pipeline.
 *
 * Phases and progress milestones:
 * - Parsing (0 → 40): Parse both .docx files via {@link parseDocx}.
 * - Diffing (40 → 70): Run {@link documentDiff} over the parsed documents.
 * - Summarizing (70 → 90): Call /api/summarize with the change list.
 * - Done (100): All phases complete.
 *
 * All data fetching and orchestration lives here. Components receive data
 * via props or context — they never call the API or parsers directly.
 *
 * @returns A {@link DocxAnalysisState} object with state and control functions.
 */
export function useDocxAnalysis(): DocxAnalysisState {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [result, setResult] = useState<DiffResult | null>(null);
  const [insight, setInsight] = useState<InsightSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setProgressLabel('');
    setResult(null);
    setInsight(null);
    setError(null);
  }, []);

  const analyze = useCallback(
    async (origFile: File, changedFile: File): Promise<void> => {
      // Reset before every run so calling analyze() twice is idempotent.
      setStatus('idle');
      setProgress(0);
      setProgressLabel('');
      setResult(null);
      setInsight(null);
      setError(null);

      try {
        // ── Phase 1: Parse ────────────────────────────────────────────────
        setStatus('parsing');
        setProgress(5);
        setProgressLabel('Parsing original document…');

        const origDoc = await parseDocx(origFile);

        setProgress(20);
        setProgressLabel('Parsing changed document…');

        const changedDoc = await parseDocx(changedFile);

        setProgress(40);
        setProgressLabel('Documents parsed.');

        // ── Phase 2: Diff ─────────────────────────────────────────────────
        setStatus('diffing');
        setProgress(45);
        setProgressLabel('Running diff algorithm…');

        const diffResult = documentDiff(origDoc, changedDoc);

        setProgress(70);
        setProgressLabel(`Found ${diffResult.totalChanges} change${diffResult.totalChanges !== 1 ? 's' : ''}.`);
        setResult(diffResult);

        // ── Phase 3: Summarize ────────────────────────────────────────────
        setStatus('summarizing');
        setProgress(75);
        setProgressLabel('Generating AI summary…');

        let insightResult: InsightSummary;
        try {
          insightResult = await fetchSummary(diffResult);
        } catch {
          // AI summary failure is non-fatal — degrade gracefully.
          insightResult = {
            summary:
              diffResult.totalChanges === 0
                ? 'The documents are identical — no changes were detected.'
                : `${diffResult.totalChanges} change${diffResult.totalChanges !== 1 ? 's' : ''} detected: ${diffResult.contentChanges} content and ${diffResult.formattingChanges} formatting.`,
            confidence: 'medium',
          };
        }

        setInsight(insightResult);
        setProgress(100);
        setProgressLabel('Analysis complete.');
        setStatus('done');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred.';
        setError(message);
        setStatus('error');
        setProgress(0);
        setProgressLabel('');
      }
    },
    []
  );

  return {
    status,
    progress,
    progressLabel,
    result,
    insight,
    error,
    analyze,
    reset,
  };
}

// Re-export for convenience
export { IDLE_STATE };
