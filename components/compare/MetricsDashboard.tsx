import { Card, CardContent } from '@/components/ui/card';
import type { DiffResult } from '@/lib/diff/types';

interface MetricsDashboardProps {
  result: DiffResult;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  sub?: string;
  textClass: string;
  bgClass: string;
  iconPath: string;
  highlight?: boolean;
}

function MetricCard({ title, value, sub, textClass, bgClass, iconPath, highlight }: MetricCardProps) {
  return (
    <Card className={highlight ? 'border-green-200 bg-green-50/50' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
            <p className={`mt-1 text-2xl font-bold sm:text-3xl ${textClass}`}>{value}</p>
            {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`shrink-0 rounded-lg p-2 ${bgClass}`}>
            <svg className={`h-4 w-4 sm:h-5 sm:w-5 ${textClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Four summary metric cards: total changes, content, formatting, and status.
 *
 * @param result - The {@link DiffResult} from the diff engine.
 */
export function MetricsDashboard({ result }: MetricsDashboardProps) {
  const { totalChanges, contentChanges, formattingChanges, addedCount, removedCount, modifiedCount } = result;

  const isIdentical = totalChanges === 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <MetricCard
        title="Total Changes"
        value={totalChanges}
        sub={isIdentical ? 'Documents are identical' : `across ${totalChanges} paragraph${totalChanges !== 1 ? 's' : ''}`}
        textClass={isIdentical ? 'text-green-600' : 'text-blue-600'}
        bgClass={isIdentical ? 'bg-green-100' : 'bg-blue-100'}
        iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        highlight={isIdentical}
      />
      <MetricCard
        title="Content"
        value={contentChanges}
        sub={`+${addedCount} −${removedCount} ~${modifiedCount}`}
        textClass="text-amber-600"
        bgClass="bg-amber-100"
        iconPath="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
      <MetricCard
        title="Formatting"
        value={formattingChanges}
        sub="style / indent / font"
        textClass="text-gray-600"
        bgClass="bg-gray-100"
        iconPath="M4 6h16M4 12h8m-8 6h16"
      />
      <MetricCard
        title="Documents"
        value="✓"
        sub="Both parsed"
        textClass="text-green-600"
        bgClass="bg-green-100"
        iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </div>
  );
}
