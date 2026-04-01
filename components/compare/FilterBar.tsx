'use client';

import type { ChangeType } from '@/lib/diff/types';

export type FilterValue = ChangeType | 'all';

interface FilterBarProps {
  active: FilterValue;
  counts: Record<ChangeType, number>;
  onChange: (f: FilterValue) => void;
}

interface PillDef {
  value: FilterValue;
  label: string;
  activeClass: string;
}

const PILLS: PillDef[] = [
  { value: 'all',      label: 'All',       activeClass: 'bg-gray-800 text-white' },
  { value: 'modified', label: 'Modified',  activeClass: 'bg-amber-500 text-white' },
  { value: 'added',    label: 'Added',     activeClass: 'bg-green-600 text-white' },
  { value: 'removed',  label: 'Removed',   activeClass: 'bg-red-600  text-white' },
  { value: 'format',   label: 'Formatting',activeClass: 'bg-blue-600 text-white' },
];

/**
 * Filter pills for the change list — shows per-type counts.
 *
 * @param active - Currently active filter value.
 * @param counts - Per-{@link ChangeType} record of change counts.
 * @param onChange - Callback when a different filter is selected.
 */
export function FilterBar({ active, counts, onChange }: FilterBarProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-wrap gap-2">
      {PILLS.map(({ value, label, activeClass }) => {
        const count = value === 'all' ? total : (counts[value as ChangeType] ?? 0);
        const isActive = active === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? activeClass
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                isActive ? 'bg-white/20' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
