import { Card, CardContent } from '@/components/ui/card';
import type { DiffResult } from '@/lib/diff/types';

interface MetricsDashboardProps {
  result: DiffResult;
  onCardClick?: (filter: 'all' | 'content' | 'formatting' | 'metadata') => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  sub?: string;
  textClass: string;
  bgClass: string;
  iconPath: string;
  highlight?: boolean;
  onClick?: () => void;
}

function MetricCard({ title, value, sub, textClass, bgClass, iconPath, highlight, onClick }: MetricCardProps) {
  return (
    <Card
      className={`transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${highlight ? 'border-green-200 bg-green-50/50' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className={`mt-1 text-2xl font-bold ${textClass}`}>{value}</p>
            {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`shrink-0 rounded-lg p-2 ${bgClass}`}>
            <svg className={`h-4 w-4 ${textClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Summary metric cards for a single comparison view.
 *
 * @param result - The {@link DiffResult} for the active view.
 */
export function MetricsDashboard({ result, onCardClick }: MetricsDashboardProps) {
  const { totalChanges, contentChanges, formattingChanges, metadataChanges, addedCount, removedCount, modifiedCount } = result;
  const isIdentical = totalChanges === 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricCard
        title="Total Changes"
        value={totalChanges}
        sub={isIdentical ? 'Documents are identical' : `${totalChanges} change${totalChanges !== 1 ? 's' : ''}`}
        textClass={isIdentical ? 'text-green-600' : 'text-blue-600'}
        bgClass={isIdentical ? 'bg-green-100' : 'bg-blue-100'}
        iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        highlight={isIdentical}
        onClick={onCardClick ? () => onCardClick('all') : undefined}
      />
      <MetricCard
        title="Content"
        value={contentChanges}
        sub={`+${addedCount} −${removedCount} ~${modifiedCount}`}
        textClass="text-amber-600"
        bgClass="bg-amber-100"
        iconPath="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        onClick={onCardClick ? () => onCardClick('content') : undefined}
      />
      <MetricCard
        title="Formatting"
        value={formattingChanges}
        sub="style / indent / font"
        textClass="text-gray-600"
        bgClass="bg-gray-100"
        iconPath="M4 6h16M4 12h8m-8 6h16"
        onClick={onCardClick ? () => onCardClick('formatting') : undefined}
      />
      <MetricCard
        title="Metadata"
        value={metadataChanges}
        sub="filename / author / revision"
        textClass="text-purple-600"
        bgClass="bg-purple-100"
        iconPath="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        onClick={onCardClick ? () => onCardClick('metadata') : undefined}
      />
    </div>
  );
}
