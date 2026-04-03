'use client';

import { useCallback } from 'react';
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
 * Sorted change list — renders all provided changes ordered by significance tier.
 * Filtering and accordion state are managed by the parent.
 *
 * @param changes - Array of change records to display.
 * @param annotations - Agent-generated annotations keyed by change ID.
 */
export function ChangeList({ changes, annotations }: ChangeListProps) {
  const annotationMap = new Map(annotations.map((a) => [a.changeId, a]));

  const sorted = [...changes].sort((a, b) => {
    const ta = TIER_ORDER[tierOf(a.id, annotationMap)];
    const tb = TIER_ORDER[tierOf(b.id, annotationMap)];
    return ta - tb;
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

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((change) => (
        <ChangeItem
          key={change.id}
          change={change}
          annotation={annotationMap.get(change.id)}
          onRelatedClick={scrollToChange}
        />
      ))}
    </div>
  );
}
