'use client';

import type { AnalysisResult } from '@/lib/agent/types';

interface ExecutiveSummaryProps {
  analysis: AnalysisResult;
  onPriorityClick: (changeId: string) => void;
}

/**
 * Executive summary card with agent-generated brief and priority change pills.
 *
 * @param analysis - The {@link AnalysisResult} from the agent pass.
 * @param onPriorityClick - Callback when a priority change pill is clicked.
 */
export function ExecutiveSummary({ analysis, onPriorityClick }: ExecutiveSummaryProps) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-indigo-100 p-2">
          <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-indigo-900">Executive Summary</h2>
          <p className="mt-1 text-sm text-indigo-800 leading-relaxed">{analysis.executiveSummary}</p>
        </div>
      </div>

      {analysis.riskFlags.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-600">Risk Flags</p>
          <ul className="space-y-1">
            {analysis.riskFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-red-700">
                <span className="mt-0.5 shrink-0 text-red-500">⚠</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.priorityChanges.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Review These First
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.priorityChanges.map((id) => (
              <button
                key={id}
                onClick={() => onPriorityClick(id)}
                className="rounded-full bg-white px-3 py-1 font-mono text-[10px] text-indigo-700 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
