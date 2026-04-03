'use client';

import { useState, useCallback } from 'react';
import type { ChangeRecord, ChangeType } from '@/lib/diff/types';
import type { ChangeAnnotation } from '@/lib/agent/types';
import { ChangeItem } from './ChangeItem';

type FilterValue = ChangeType | 'all';

interface ChangeListProps {
  changes: ChangeRecord[];
  annotations: ChangeAnnotation[];
}

const PILLS: { value: FilterValue; label: string; activeClass: string }[] = [
  { value: 'all',      label: 'All',        activeClass: 'bg-gray-800 text-white' },
  { value: 'modified', label: 'Modified',   activeClass: 'bg-amber-500 text-white' },
  { value: 'added',    label: 'Added',      activeClass: 'bg-green-600 text-white' },
  { value: 'removed',  label: 'Removed',    activeClass: 'bg-red-600 text-white' },
  { value: 'format',   label: 'Formatting', activeClass: 'bg-blue-600 text-white' },
  { value: 'metadata', label: 'Metadata',   activeClass: 'bg-purple-600 text-white' },
];

/**
 * Filterable list of change records with agent annotations.
 *
 * @param changes - Array of change records to display.
 * @param annotations - Agent-generated annotations keyed by change ID.
 */
export function ChangeList({ changes, annotations }: ChangeListProps) {
  const [filter, setFilter] = useState<FilterValue>('all');

  const annotationMap = new Map(annotations.map((a) => [a.changeId, a]));

  const filtered = filter === 'all' ? changes : changes.filter((c) => c.type === filter);

  const counts = changes.reduce<Record<ChangeType, number>>(
    (acc, c) => {
      acc[c.type] = (acc[c.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<ChangeType, number>
  );

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
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {PILLS.map(({ value, label, activeClass }) => {
          const count = value === 'all' ? changes.length : (counts[value as ChangeType] ?? 0);
          if (count === 0 && value !== 'all') return null;
          const isActive = filter === value;
          return (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive ? activeClass : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isActive ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Change items */}
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No {filter} changes in this view</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((change) => (
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
  );
}
