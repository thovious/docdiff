'use client';

import { useState, useCallback } from 'react';
import type { ChangeRecord } from '@/lib/diff/types';
import type { ChangeAnnotation, SignificanceTier } from '@/lib/agent/types';
import { ChangeItem } from './ChangeItem';

interface ChangeListProps {
  changes: ChangeRecord[];
  annotations: ChangeAnnotation[];
}

const TIER_ORDER: Record<SignificanceTier, number> = {
  critical: 0,
  moderate: 1,
  minor: 2,
  informational: 3,
};

function tierOf(id: string, annotationMap: Map<string, ChangeAnnotation>): SignificanceTier {
  return annotationMap.get(id)?.significance ?? 'informational';
}

/**
 * Change list with significance-tier sorting, a Material/All pill toggle,
 * and a collapsed expander for minor and informational changes.
 *
 * @param changes - Array of change records to display.
 * @param annotations - Agent-generated annotations keyed by change ID.
 */
export function ChangeList({ changes, annotations }: ChangeListProps) {
  const [showAll, setShowAll] = useState(false);
  const [minorExpanded, setMinorExpanded] = useState(false);

  const annotationMap = new Map(annotations.map((a) => [a.changeId, a]));

  const sorted = [...changes].sort((a, b) => {
    const ta = TIER_ORDER[tierOf(a.id, annotationMap)];
    const tb = TIER_ORDER[tierOf(b.id, annotationMap)];
    return ta - tb;
  });

  const material = sorted.filter((c) => {
    const t = tierOf(c.id, annotationMap);
    return t === 'critical' || t === 'moderate';
  });

  const minor = sorted.filter((c) => {
    const t = tierOf(c.id, annotationMap);
    return t !== 'critical' && t !== 'moderate';
  });

  const scrollToChange = useCallback((id: string) => {
    const el = document.getElementById(`change-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  if (changes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
        <svg className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium text-gray-500">No changes found</p>
        <p className="mt-1 text-xs text-gray-400">These documents are identical in this view</p>
      </div>
    );
  }

  const visibleMaterial = showAll ? sorted : material;
  const visibleMinor = showAll ? [] : minor;

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle */}
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-full bg-gray-100 p-0.5 text-xs font-medium">
          <button
            onClick={() => { setShowAll(false); setMinorExpanded(false); }}
            className={`rounded-full px-3 py-1 transition-colors ${
              !showAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Material changes
            {material.length > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                !showAll ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-400'
              }`}>
                {material.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`rounded-full px-3 py-1 transition-colors ${
              showAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All changes
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              showAll ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-400'
            }`}>
              {changes.length}
            </span>
          </button>
        </div>
      </div>

      {/* Material (or all) changes */}
      {visibleMaterial.length === 0 && !showAll ? (
        <p className="py-6 text-center text-sm text-gray-400">No material changes in this view</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleMaterial.map((change) => (
            <ChangeItem
              key={change.id}
              change={change}
              annotation={annotationMap.get(change.id)}
              onRelatedClick={scrollToChange}
            />
          ))}
        </div>
      )}

      {/* Minor / informational expander (Material mode only) */}
      {!showAll && visibleMinor.length > 0 && (
        <div className="mt-1">
          <button
            onClick={() => setMinorExpanded((v) => !v)}
            className="flex w-full items-center gap-2 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className={`h-3 w-3 transition-transform ${minorExpanded ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {minorExpanded
              ? `Hide minor and formatting changes`
              : `Show ${visibleMinor.length} minor and formatting change${visibleMinor.length !== 1 ? 's' : ''}`}
          </button>

          {minorExpanded && (
            <div className="flex flex-col gap-2 mt-2">
              {visibleMinor.map((change) => (
                <ChangeItem
                  key={change.id}
                  change={change}
                  annotation={annotationMap.get(change.id)}
                  onRelatedClick={scrollToChange}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
