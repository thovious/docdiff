'use client';

import { useState } from 'react';
import type { ChangeRecord } from '@/lib/diff/types';
import type { ChangeAnnotation, SignificanceTier } from '@/lib/agent/types';
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

/** Left border accent + optional background tint per tier. */
const TIER_CARD: Record<SignificanceTier, string> = {
  critical:      'border-l-[3px] border-l-red-500 bg-red-50/30',
  moderate:      'border-l-[3px] border-l-amber-400',
  minor:         '',
  informational: '',
};

/** Summary text color — muted for low-signal changes. */
const TIER_SUMMARY_TEXT: Record<SignificanceTier, string> = {
  critical:      'text-gray-900',
  moderate:      'text-gray-900',
  minor:         'text-gray-500',
  informational: 'text-gray-500',
};

/**
 * Expandable change record row with tier-based card styling, significance badge,
 * agent annotation, and inline diff display.
 *
 * @param change - The change record to display.
 * @param annotation - The agent-generated annotation for this change, if available.
 * @param onRelatedClick - Optional callback when a related change ID is clicked.
 */
export function ChangeItem({ change, annotation, onRelatedClick }: ChangeItemProps) {
  const [expanded, setExpanded] = useState(false);

  const tier: SignificanceTier = annotation?.significance ?? 'informational';
  const typeBadge = TYPE_BADGE[change.type] ?? 'bg-gray-100 text-gray-600';
  const cardClass = TIER_CARD[tier];
  const summaryTextClass = TIER_SUMMARY_TEXT[tier];

  return (
    <div
      id={`change-${change.id}`}
      className={`rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden ${cardClass}`}
    >
      {/* Collapsed header */}
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
          <p className={`text-sm font-medium leading-snug ${summaryTextClass}`}>{change.summary}</p>
          <p className="mt-0.5 text-xs text-gray-400">{change.location}</p>
          {annotation?.citation && (
            <p className="mt-0.5 truncate text-xs text-blue-500 italic">{annotation.citation}</p>
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
            <div className="rounded-md bg-gray-50 px-3 py-3 text-sm text-gray-700 shadow-inner">
              <p className="mb-1.5 text-xs text-gray-400">
                <span className="font-semibold">Analysis:</span>
              </p>
              <p className="leading-relaxed">{annotation.annotation}</p>
              {annotation.citation && (
                <p className="mt-2 text-xs italic text-gray-400">{annotation.citation}</p>
              )}
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
