import { Card, CardContent } from '@/components/ui/card';
import type { InsightSummary } from '@/lib/diff/types';

interface InsightBoxProps {
  insight: InsightSummary;
}

/**
 * Displays the AI-generated plain-English summary of document changes.
 *
 * @param insight - The {@link InsightSummary} returned from /api/summarize.
 */
export function InsightBox({ insight }: InsightBoxProps) {
  return (
    <Card className="border-blue-100 bg-blue-50/60">
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <div className="mt-0.5 flex-shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-sm">
              ✦
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-blue-900">AI Summary</h3>
              {insight.confidence === 'medium' && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  fallback
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-blue-800">{insight.summary}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
