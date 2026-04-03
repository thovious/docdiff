import type { ChangeRecord } from '@/lib/diff/types';

interface DiffBlockProps {
  change: ChangeRecord;
}

/**
 * Before/after diff display with labeled lines, larger text, and more padding
 * for critical and moderate changes. Includes word-level highlights for modified
 * paragraphs.
 *
 * @param change - The {@link ChangeRecord} to render.
 */
export function DiffBlock({ change }: DiffBlockProps) {
  if (change.type === 'metadata') {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
        <p className="mb-1 font-medium text-blue-800">Metadata change: {change.metadataField}</p>
        <div className="flex flex-col gap-1 font-mono text-xs">
          {change.origText && (
            <div className="rounded border border-red-200 bg-red-50 px-2 py-2 text-red-800">
              Before: {change.origText}
            </div>
          )}
          {change.changedText && (
            <div className="rounded border border-green-200 bg-green-50 px-2 py-2 text-green-800">
              After: {change.changedText}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (change.type === 'format') {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
        <p className="mb-2 font-medium text-blue-800">Formatting changes:</p>
        <ul className="space-y-1">
          {change.formatDetails.map((d, i) => (
            <li key={i} className="text-blue-700">· {d}</li>
          ))}
        </ul>
        <div className="mt-3 rounded border border-blue-200 bg-white px-3 py-2 font-mono text-[13px] text-gray-700">
          {change.origText || <span className="italic text-gray-400">(empty paragraph)</span>}
        </div>
      </div>
    );
  }

  if (change.type === 'added') {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-[11px] text-gray-400">After</p>
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 font-mono text-[13px]">
          <span className="mr-2 font-semibold text-green-700">+</span>
          <span className="text-green-900">
            {change.changedText || <span className="italic text-gray-400">(empty paragraph)</span>}
          </span>
        </div>
      </div>
    );
  }

  if (change.type === 'removed') {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-[11px] text-gray-400">Before</p>
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 font-mono text-[13px]">
          <span className="mr-2 font-semibold text-red-700">−</span>
          <span className="text-red-900 line-through">
            {change.origText || <span className="not-italic text-gray-400">(empty paragraph)</span>}
          </span>
        </div>
      </div>
    );
  }

  // modified — labeled before/after with inline diff
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] text-gray-400">Before</p>
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 font-mono text-[13px]">
          <span className="mr-2 font-semibold text-red-700">−</span>
          <span className="text-red-900">
            {change.origText || <span className="italic text-gray-400">(empty)</span>}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[11px] text-gray-400">After</p>
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 font-mono text-[13px]">
          <span className="mr-2 font-semibold text-green-700">+</span>
          <span className="text-green-900">
            {change.changedText || <span className="italic text-gray-400">(empty)</span>}
          </span>
        </div>
      </div>

      {change.inlineDiff.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 font-mono text-[13px] leading-relaxed">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Word-level diff
          </span>
          {change.inlineDiff.map((seg, i) => {
            if (seg.type === 'equal') return <span key={i} className="text-gray-700">{seg.value}</span>;
            if (seg.type === 'added') return (
              <mark key={i} className="rounded bg-green-200 px-0.5 text-green-900 not-italic">{seg.value}</mark>
            );
            return (
              <mark key={i} className="rounded bg-red-200 px-0.5 text-red-900 line-through not-italic">{seg.value}</mark>
            );
          })}
        </div>
      )}
    </div>
  );
}
