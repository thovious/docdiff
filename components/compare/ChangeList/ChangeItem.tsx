'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DiffBlock } from './DiffBlock';
import type { ChangeRecord, ChangeType } from '@/lib/diff/types';

interface ChangeItemProps {
  change: ChangeRecord;
}

const TYPE_CONFIG: Record<ChangeType, { label: string; badgeClass: string }> = {
  added:    { label: 'Added',     badgeClass: 'bg-green-100 text-green-800 border-green-200' },
  removed:  { label: 'Removed',   badgeClass: 'bg-red-100 text-red-800 border-red-200' },
  modified: { label: 'Modified',  badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  format:   { label: 'Formatting',badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
};

/**
 * Expandable accordion row showing a single change.
 * Collapsed: badge, location, summary.
 * Expanded: adds DiffBlock with before/after content.
 *
 * @param change - The {@link ChangeRecord} to display.
 */
export function ChangeItem({ change }: ChangeItemProps) {
  const [open, setOpen] = useState(false);
  const { label, badgeClass } = TYPE_CONFIG[change.type];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm">
      {/* Header row — always visible */}
      <button
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {/* Badge */}
        <Badge className={`mt-0.5 shrink-0 border ${badgeClass}`}>
          {label}
        </Badge>

        {/* Location + summary */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-gray-700">
            <span className="text-xs text-gray-400">{change.location} · </span>
            {change.summary}
          </p>
        </div>

        {/* Chevron */}
        <svg
          className={`mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-gray-100 px-4 py-3">
          <DiffBlock change={change} />
        </div>
      )}
    </div>
  );
}
