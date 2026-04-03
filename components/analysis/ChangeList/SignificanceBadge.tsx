import type { SignificanceTier } from '@/lib/agent/types';

interface SignificanceBadgeProps {
  tier: SignificanceTier;
}

const TIER_STYLES: Record<SignificanceTier, { bg: string; text: string; label: string }> = {
  critical:      { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Critical' },
  moderate:      { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'Moderate' },
  minor:         { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Minor' },
  informational: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Info' },
};

/**
 * Visual badge indicating the AI-assigned significance tier of a change.
 *
 * @param tier - The significance tier to render.
 */
export function SignificanceBadge({ tier }: SignificanceBadgeProps) {
  const { bg, text, label } = TIER_STYLES[tier];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${bg} ${text}`}>
      {label}
    </span>
  );
}
