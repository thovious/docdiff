'use client';

import { useState, useMemo } from 'react';
import { FilterBar, type FilterValue } from '@/components/compare/FilterBar';
import { ChangeItem } from './ChangeItem';
import type { DiffResult } from '@/lib/diff/types';
import type { ChangeType } from '@/lib/diff/types';

interface ChangeListProps {
  result: DiffResult;
}

/**
 * Filterable, scrollable list of all detected changes.
 * FilterBar controls which change types are visible.
 *
 * @param result - The full {@link DiffResult} from the diff engine.
 */
export function ChangeList({ result }: ChangeListProps) {
  const [filter, setFilter] = useState<FilterValue>('all');

  const counts = useMemo<Record<ChangeType, number>>(
    () => ({
      added:    result.addedCount,
      removed:  result.removedCount,
      modified: result.modifiedCount,
      format:   result.formattingChanges,
    }),
    [result]
  );

  const visible = useMemo(
    () =>
      filter === 'all'
        ? result.changes
        : result.changes.filter((c) => c.type === filter),
    [result.changes, filter]
  );

  if (result.totalChanges === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
        <div className="text-4xl">✓</div>
        <p className="mt-2 text-lg font-medium text-gray-700">No changes found</p>
        <p className="mt-1 text-sm text-gray-400">The documents are identical.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FilterBar active={filter} counts={counts} onChange={setFilter} />

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          No {filter} changes in this document.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((change) => (
            <ChangeItem key={change.id} change={change} />
          ))}
        </div>
      )}
    </div>
  );
}
