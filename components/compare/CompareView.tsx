'use client';

import { useState } from 'react';
import { UploadZone } from './UploadZone';
import { AnalyzeButton } from './AnalyzeButton';
import { ProgressBar } from './ProgressBar';
import { MetricsDashboard } from './MetricsDashboard';
import { InsightBox } from './InsightBox';
import { ChangeList } from './ChangeList/ChangeList';
import { useDocxAnalysis } from '@/hooks/useDocxAnalysis';

/**
 * Top-level orchestrator component for the DocDiff comparison workflow.
 * Holds file state, delegates all analysis to useDocxAnalysis, and renders
 * the appropriate UI for each pipeline phase.
 */
export function CompareView() {
  const [origFile, setOrigFile] = useState<File | null>(null);
  const [changedFile, setChangedFile] = useState<File | null>(null);

  const {
    status,
    progress,
    progressLabel,
    result,
    insight,
    error,
    analyze,
    reset,
  } = useDocxAnalysis();

  const canAnalyze = origFile !== null && changedFile !== null;
  const isBusy = status === 'parsing' || status === 'diffing' || status === 'summarizing';
  const isDone = status === 'done' || status === 'error';

  const handleAnalyze = () => {
    if (origFile && changedFile) {
      analyze(origFile, changedFile);
    }
  };

  const handleReset = () => {
    setOrigFile(null);
    setChangedFile(null);
    reset();
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">DocDiff</h1>
        <p className="mt-1 text-sm text-gray-500 sm:text-base">
          Upload two Word documents to get a deterministic, AI-enhanced comparison report.
        </p>
      </div>

      {/* Upload + action section */}
      {!isDone && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <UploadZone
              label="Original document"
              file={origFile}
              onFile={setOrigFile}
              disabled={isBusy}
            />
            <UploadZone
              label="Changed document"
              file={changedFile}
              onFile={setChangedFile}
              disabled={isBusy}
            />
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {status !== 'idle' && (
              <ProgressBar status={status} progress={progress} label={progressLabel} />
            )}

            <div className="flex justify-end">
              <AnalyzeButton
                status={status}
                canAnalyze={canAnalyze}
                onAnalyze={handleAnalyze}
                onReset={handleReset}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-red-800">Analysis failed</p>
              <p className="mt-0.5 text-sm text-red-700">{error}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-start">
            <AnalyzeButton
              status={status}
              canAnalyze={canAnalyze}
              onAnalyze={handleAnalyze}
              onReset={handleReset}
            />
          </div>
        </div>
      )}

      {/* Results section */}
      {result && (
        <div className="flex flex-col gap-6">
          {/* File names + reset button */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-gray-500">
              <span className="max-w-[140px] truncate rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs sm:max-w-[220px]">
                {origFile?.name}
              </span>
              <span className="shrink-0">→</span>
              <span className="max-w-[140px] truncate rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs sm:max-w-[220px]">
                {changedFile?.name}
              </span>
            </div>
            <div className="shrink-0">
              <AnalyzeButton
                status={status}
                canAnalyze={canAnalyze}
                onAnalyze={handleAnalyze}
                onReset={handleReset}
              />
            </div>
          </div>

          {/* Metrics */}
          <MetricsDashboard result={result} />

          {/* AI insight */}
          {insight && <InsightBox insight={insight} />}

          {/* Separator */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Changes
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Change list */}
          <ChangeList result={result} />
        </div>
      )}
    </div>
  );
}
