'use client';

import { useState } from 'react';
import type { ChangeRecord } from '@/lib/diff/types';
import type { ChangeAnnotation } from '@/lib/agent/types';
import { SignificanceBadge } from './SignificanceBadge';
import { DiffBlock } from './DiffBlock';

interface ChangeItemProps {
  change: ChangeRecord;
  annotation: ChangeAnnotation | undefined;
  onRelatedClick?: (changeId: string) => void;
}

const TYPE_BADGE: Record<string, string> = {
  modified: 'bg-amber-100 text-amber-800',
  added: 'bg-green-100 text-green-800',
  removed: 'bg-red-100 text-red-800',
  format: 'bg-blue-100 text-blue-700',
  metadata: 'bg-purple-100 text-purple-800',
};

/**
 * Expandable change record row with significance badge, agent annotation,
 * and inline diff display.
 *
 * @param change - The change record to display.
 * @param annotation - The agent-generated annotation for this change, if available.
 * @param onRelatedClick - Optional callback when a related change ID is clicked.
 */
export function ChangeItem({ change, annotation, onRelatedClick }: ChangeItemProps) {
  const [expanded, setExpanded] = useState(false);

  const tier = annotation?.significance ?? 'informational';
  const typeBadge = TYPE_BADGE[change.type] ?? 'bg-gray-100 text-gray-600';

  return (
    <div
      id={`change-${change.id}`}
      className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="flex shrink-0 flex-col items-start gap-1.5 pt-0.5">
          <SignificanceBadge tier={tier} />
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeBadge}`}>
            {change.type}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 leading-snug">{change.summary}</p>
          <p className="mt-0.5 text-xs text-gray-500">{change.location}</p>
          {annotation?.citation && (
            <p className="mt-0.5 truncate text-xs text-blue-600 italic">{annotation.citation}</p>
          )}
        </div>

        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          <DiffBlock change={change} />

          {annotation?.annotation && (
            <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Analysis</p>
              {annotation.annotation}
            </div>
          )}

          {annotation?.relatedChangeIds && annotation.relatedChangeIds.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Related changes</p>
              <div className="flex flex-wrap gap-2">
                {annotation.relatedChangeIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => onRelatedClick?.(id)}
                    className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600 hover:bg-gray-200"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="font-mono text-[10px] text-gray-300">{change.id}</p>
        </div>
      )}
    </div>
  );
}
