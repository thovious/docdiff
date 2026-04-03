'use client';

import type { AnalysisResult, ChangeAnnotation } from '@/lib/agent/types';
import type { ChangeRecord } from '@/lib/diff/types';

interface ExecutiveBriefProps {
  analysis: AnalysisResult;
  allChanges: ChangeRecord[];
  onPriorityClick: (changeId: string) => void;
}

/**
 * Executive brief card shown at the top of the results panel.
 *
 * Displays a headline count of material changes, a bulleted list of the top
 * priority changes with citations, and a compact risk flag warning block.
 *
 * @param analysis - The agent analysis result.
 * @param allChanges - All change records (used to look up summaries by ID).
 * @param onPriorityClick - Callback when a priority change row is clicked.
 */
export function ExecutiveBrief({ analysis, allChanges, onPriorityClick }: ExecutiveBriefProps) {
  const annotationMap = new Map<string, ChangeAnnotation>(
    analysis.annotations.map((a) => [a.changeId, a])
  );
  const changeMap = new Map<string, ChangeRecord>(allChanges.map((c) => [c.id, c]));

  const materialCount = analysis.annotations.filter(
    (a) => a.significance === 'critical' || a.significance === 'moderate'
  ).length;

  const topChanges = analysis.priorityChanges.slice(0, 5);

  const headline =
    materialCount === 0
      ? 'No material changes detected'
      : `${materialCount} material change${materialCount !== 1 ? 's' : ''} require${materialCount === 1 ? 's' : ''} your review`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Headline */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          materialCount === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {materialCount}
        </span>
        <h2 className="text-sm font-semibold text-gray-900">{headline}</h2>
      </div>

      {/* Priority changes list */}
      {topChanges.length > 0 && (
        <ul className="mb-4 space-y-2">
          {topChanges.map((id) => {
            const annotation = annotationMap.get(id);
            const change = changeMap.get(id);
            const summary = change?.summary ?? id;
            const citation = annotation?.citation;
            const tier = annotation?.significance ?? 'informational';
            const dotColor =
              tier === 'critical' ? 'bg-red-500' :
              tier === 'moderate' ? 'bg-amber-400' : 'bg-gray-300';

            return (
              <li key={id}>
                <button
                  onClick={() => onPriorityClick(id)}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 leading-snug">{summary}</p>
                    {citation && (
                      <p className="mt-0.5 text-[11px] text-gray-400 italic">{citation}</p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Risk flags */}
      {analysis.riskFlags.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Risk flags
          </p>
          <ul className="space-y-1">
            {analysis.riskFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                <span className="mt-0.5 shrink-0">⚠</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
