'use client';

import type { AnalysisStatus } from '@/hooks/useDocxAnalysis';

interface ProgressBarProps {
  status: AnalysisStatus;
  progress: number;
  label: string;
}

const STEPS: { key: AnalysisStatus; label: string }[] = [
  { key: 'parsing', label: 'Parse' },
  { key: 'diffing', label: 'Diff' },
  { key: 'summarizing', label: 'Summarize' },
  { key: 'done', label: 'Done' },
];

const STATUS_ORDER: AnalysisStatus[] = ['idle', 'parsing', 'diffing', 'summarizing', 'done', 'error'];

/**
 * Step-by-step progress indicator with a fill bar.
 *
 * @param status - Current pipeline status.
 * @param progress - Numeric 0–100 fill value.
 * @param label - Human-readable description of the current step.
 */
export function ProgressBar({ status, progress, label }: ProgressBarProps) {
  if (status === 'idle') return null;

  const currentIdx = STATUS_ORDER.indexOf(status);
  const isError = status === 'error';

  return (
    <div className="flex flex-col gap-3">
      {/* Step indicators */}
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, i) => {
          const stepIdx = STATUS_ORDER.indexOf(step.key);
          const isActive = step.key === status;
          const isComplete = !isError && currentIdx > stepIdx;

          return (
            <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isError && isActive
                    ? 'bg-red-100 text-red-600'
                    : isComplete
                    ? 'bg-blue-600 text-white'
                    : isActive
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isComplete ? '✓' : i + 1}
              </div>
              <span className={`hidden text-xs sm:block ${isActive ? 'font-medium text-gray-700' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fill bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isError ? 'bg-red-400' : 'bg-blue-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Label */}
      {label && (
        <p className={`text-center text-xs ${isError ? 'text-red-600' : 'text-gray-500'}`}>
          {label}
        </p>
      )}
    </div>
  );
}
