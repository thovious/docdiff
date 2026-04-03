'use client';

import { useState, useCallback } from 'react';
import type { ThreeWayDiffResult, ComparisonView } from '@/lib/diff/types';
import type { AnalysisResult } from '@/lib/agent/types';
import { ComparisonTabs } from './ComparisonTabs';
import { MetricsDashboard } from './MetricsDashboard';
import { ExecutiveBrief } from './ExecutiveBrief';
import { ChangeList } from './ChangeList/ChangeList';

interface AnalysisViewProps {
  diffResult: ThreeWayDiffResult;
  analysisResult: AnalysisResult;
  onReset: () => void;
}

/**
 * Main results container: executive brief, tabs, metrics, and change list.
 *
 * @param diffResult - The three-way diff result.
 * @param analysisResult - The agent analysis result.
 * @param onReset - Callback to return to the upload panel.
 */
export function AnalysisView({ diffResult, analysisResult, onReset }: AnalysisViewProps) {
  const [activeView, setActiveView] = useState<ComparisonView>('v1-v2');

  const activeResult =
    activeView === 'tmpl-v1'
      ? diffResult.tmplV1
      : activeView === 'v1-v2'
      ? diffResult.v1V2
      : diffResult.tmplV2;

  const scrollToChange = useCallback((id: string) => {
    const el = document.getElementById(`change-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
        <button
          onClick={onReset}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          New Analysis
        </button>
      </div>

      {/* Executive brief — above tabs */}
      <ExecutiveBrief
        analysis={analysisResult}
        allChanges={diffResult.allChanges}
        onPriorityClick={scrollToChange}
      />

      {/* View tabs */}
      <ComparisonTabs
        diffResult={diffResult}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Metrics for active view */}
      <MetricsDashboard result={activeResult} />

      {/* Change list for active view */}
      <ChangeList
        changes={activeResult.changes}
        annotations={analysisResult.annotations}
      />
    </div>
  );
}
