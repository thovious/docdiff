'use client';

import { useState, useCallback } from 'react';
import { parseDocx } from '@/lib/parser/docxParser';
import { threeWayDiff } from '@/lib/diff/threeWayDiff';
import type { ThreeWayDiffResult } from '@/lib/diff/types';
import type { AnalysisResult } from '@/lib/agent/types';

export type AnalysisStatus =
  | 'idle'
  | 'parsing'
  | 'diffing'
  | 'analyzing'
  | 'done'
  | 'error';

export interface DocxAnalysisState {
  status: AnalysisStatus;
  /** 0–100 */
  progress: number;
  progressLabel: string;
  threeWayDiff: ThreeWayDiffResult | null;
  analysisResult: AnalysisResult | null;
  error: string | null;
  /** Start a full three-document analysis pipeline. */
  analyze: (template: File, v1: File, v2: File) => Promise<void>;
  /** Reset all state back to idle. */
  reset: () => void;
}

const IDLE_STATE = {
  status: 'idle' as AnalysisStatus,
  progress: 0,
  progressLabel: '',
  threeWayDiff: null,
  analysisResult: null,
  error: null,
};

/**
 * Orchestrate the full DocDiff v2 analysis pipeline for three documents.
 *
 * Progress milestones:
 *  5%  — Reading document files
 * 20%  — Parsing Template structure
 * 35%  — Parsing V1 structure
 * 50%  — Parsing V2 structure
 * 65%  — Running three-way diff
 * 78%  — Sending to analysis agent
 * 95%  — Processing agent response
 * 100% — Complete
 *
 * @returns A {@link DocxAnalysisState} object with state and control functions.
 */
export function useDocxAnalysis(): DocxAnalysisState {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgressVal] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [diffResult, setDiffResult] = useState<ThreeWayDiffResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setProgress = useCallback((pct: number, label: string) => {
    setProgressVal(pct);
    setProgressLabel(label);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgressVal(0);
    setProgressLabel('');
    setDiffResult(null);
    setAnalysisResult(null);
    setError(null);
  }, []);

  const analyze = useCallback(
    async (template: File, v1: File, v2: File): Promise<void> => {
      reset();

      try {
        // ── Parsing ───────────────────────────────────────────────────────
        setStatus('parsing');
        setProgress(5, 'Reading document files…');

        setProgress(20, 'Parsing Template structure…');
        const parsedTemplate = await parseDocx(template);

        setProgress(35, 'Parsing V1 structure…');
        const parsedV1 = await parseDocx(v1);

        setProgress(50, 'Parsing V2 structure…');
        const parsedV2 = await parseDocx(v2);

        // ── Diffing ───────────────────────────────────────────────────────
        setStatus('diffing');
        setProgress(65, 'Running three-way diff…');

        const diff = threeWayDiff(parsedTemplate, parsedV1, parsedV2);
        setDiffResult(diff);

        // ── Agent analysis ────────────────────────────────────────────────
        setStatus('analyzing');
        setProgress(78, 'Sending to analysis agent…');

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            diff,
            documentNames: {
              template: template.name,
              v1: v1.name,
              v2: v2.name,
            },
          }),
        });

        setProgress(95, 'Processing agent response…');

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error ?? `API returned ${response.status}`);
        }

        const analysis: AnalysisResult = await response.json();
        setAnalysisResult(analysis);

        setProgress(100, 'Analysis complete');
        setStatus('done');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred.';
        setError(message);
        setStatus('error');
      }
    },
    [reset, setProgress]
  );

  return {
    status,
    progress,
    progressLabel,
    threeWayDiff: diffResult,
    analysisResult,
    error,
    analyze,
    reset,
  };
}
