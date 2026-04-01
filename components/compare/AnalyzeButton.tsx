'use client';

import { Button } from '@/components/ui/button';
import type { AnalysisStatus } from '@/hooks/useDocxAnalysis';

interface AnalyzeButtonProps {
  status: AnalysisStatus;
  canAnalyze: boolean;
  onAnalyze: () => void;
  onReset: () => void;
}

const BUSY_STATUSES: AnalysisStatus[] = ['parsing', 'diffing', 'summarizing'];

/**
 * Primary action button that triggers analysis or resets results.
 *
 * @param status - Current analysis pipeline status.
 * @param canAnalyze - True when both files have been selected.
 * @param onAnalyze - Callback to start analysis.
 * @param onReset - Callback to reset all state.
 */
export function AnalyzeButton({ status, canAnalyze, onAnalyze, onReset }: AnalyzeButtonProps) {
  const isBusy = BUSY_STATUSES.includes(status);
  const isDone = status === 'done' || status === 'error';

  if (isDone) {
    return (
      <Button variant="outline" onClick={onReset} className="w-full sm:w-auto">
        ↩ Compare new documents
      </Button>
    );
  }

  return (
    <Button
      onClick={onAnalyze}
      disabled={!canAnalyze || isBusy}
      className="w-full sm:w-auto min-w-[180px]"
    >
      {isBusy ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Analyzing…
        </span>
      ) : (
        'Compare Documents'
      )}
    </Button>
  );
}
