'use client';

import type { ComparisonView, ThreeWayDiffResult } from '@/lib/diff/types';

interface ComparisonTabsProps {
  diffResult: ThreeWayDiffResult;
  activeView: ComparisonView;
  onViewChange: (view: ComparisonView) => void;
}

const TABS: { view: ComparisonView; label: string }[] = [
  { view: 'tmpl-v2', label: 'Template → V2' },
  { view: 'v1-v2',   label: 'V1 → V2' },
  { view: 'tmpl-v1', label: 'Template → V1' },
];

/**
 * Three-tab navigation for switching between comparison views.
 *
 * Each tab shows a change count badge. Switching tabs does not re-run analysis.
 *
 * @param diffResult - The three-way diff result containing all view data.
 * @param activeView - The currently displayed comparison view.
 * @param onViewChange - Callback when the user selects a different tab.
 */
export function ComparisonTabs({ diffResult, activeView, onViewChange }: ComparisonTabsProps) {
  const countFor = (view: ComparisonView): number => {
    if (view === 'tmpl-v1') return diffResult.tmplV1.totalChanges;
    if (view === 'v1-v2') return diffResult.v1V2.totalChanges;
    return diffResult.tmplV2.totalChanges;
  };

  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {TABS.map(({ view, label }) => {
        const count = countFor(view);
        const isActive = activeView === view;
        return (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
