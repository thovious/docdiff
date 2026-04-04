import type { ThreeWayDiffResult, ChangeRecord, DiffResult } from '@/lib/diff/types';
import type { AnalysisResult, ChangeAnnotation, SignificanceTier } from '@/lib/agent/types';

interface GenerateReportParams {
  diffResult: ThreeWayDiffResult;
  analysisResult: AnalysisResult;
  documentNames: { template: string; v1: string; v2: string };
}

const TIER_ORDER: Record<SignificanceTier, number> = {
  critical: 0,
  moderate: 1,
  minor: 2,
  informational: 3,
};

const TIER_LABEL: Record<SignificanceTier, string> = {
  critical: 'Critical',
  moderate: 'Moderate',
  minor: 'Minor',
  informational: 'Informational',
};

const TIER_COLOR: Record<SignificanceTier, string> = {
  critical: '#b91c1c',
  moderate: '#b45309',
  minor: '#6b7280',
  informational: '#2563eb',
};

const TIER_BG: Record<SignificanceTier, string> = {
  critical: '#fee2e2',
  moderate: '#fef3c7',
  minor: '#f3f4f6',
  informational: '#dbeafe',
};

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tierBadge(tier: SignificanceTier): string {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:0.04em;background:${TIER_BG[tier]};color:${TIER_COLOR[tier]}">${TIER_LABEL[tier]}</span>`;
}

function typeBadge(type: string): string {
  const colors: Record<string, [string, string]> = {
    modified: ['#92400e', '#fef3c7'],
    added:    ['#166534', '#dcfce7'],
    removed:  ['#991b1b', '#fee2e2'],
    format:   ['#1d4ed8', '#dbeafe'],
    metadata: ['#6b21a8', '#f3e8ff'],
  };
  const [color, bg] = colors[type] ?? ['#374151', '#f3f4f6'];
  return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;background:${bg};color:${color}">${esc(type)}</span>`;
}

function metricsRow(result: DiffResult): string {
  const items = [
    { label: 'Total', value: result.totalChanges },
    { label: 'Content', value: result.contentChanges },
    { label: 'Formatting', value: result.formattingChanges },
    { label: 'Metadata', value: result.metadataChanges },
    { label: 'Added', value: result.addedCount },
    { label: 'Removed', value: result.removedCount },
    { label: 'Modified', value: result.modifiedCount },
  ];
  return `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;padding:12px 16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
    ${items.map(({ label, value }) => `<span style="font-size:13px;color:#6b7280"><strong style="color:#111827">${value}</strong> ${label}</span>`).join('')}
  </div>`;
}

function diffBlocks(change: ChangeRecord): string {
  if (change.type === 'metadata') {
    return `
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;font-family:monospace;font-size:12px">
        <div style="padding:6px 10px;background:#fee2e2;border:1px solid #fca5a5;border-radius:4px;color:#991b1b">Before: ${esc(change.origText)}</div>
        <div style="padding:6px 10px;background:#dcfce7;border:1px solid #86efac;border-radius:4px;color:#166534">After: ${esc(change.changedText)}</div>
      </div>`;
  }
  if (change.type === 'format') {
    return `<ul style="margin:8px 0 0;padding-left:18px;font-size:12px;color:#1d4ed8">${change.formatDetails.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`;
  }
  if (change.type === 'added') {
    return `<div style="margin-top:8px;padding:8px 10px;background:#dcfce7;border:1px solid #86efac;border-radius:4px;font-family:monospace;font-size:12px;color:#166534"><span style="margin-right:6px;font-weight:700">+</span>${esc(change.changedText || '(empty paragraph)')}</div>`;
  }
  if (change.type === 'removed') {
    return `<div style="margin-top:8px;padding:8px 10px;background:#fee2e2;border:1px solid #fca5a5;border-radius:4px;font-family:monospace;font-size:12px;color:#991b1b;text-decoration:line-through"><span style="margin-right:6px;font-weight:700">−</span>${esc(change.origText || '(empty paragraph)')}</div>`;
  }
  // modified
  return `
    <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
      <div style="padding:8px 10px;background:#fee2e2;border:1px solid #fca5a5;border-radius:4px;font-family:monospace;font-size:12px;color:#991b1b"><span style="margin-right:6px;font-weight:700">−</span>${esc(change.origText || '(empty)')}</div>
      <div style="padding:8px 10px;background:#dcfce7;border:1px solid #86efac;border-radius:4px;font-family:monospace;font-size:12px;color:#166534"><span style="margin-right:6px;font-weight:700">+</span>${esc(change.changedText || '(empty)')}</div>
    </div>`;
}

function changeRow(change: ChangeRecord, annotation: ChangeAnnotation | undefined): string {
  const tier: SignificanceTier = annotation?.significance ?? 'informational';
  const borderColor = TIER_COLOR[tier];

  return `<div style="border:1px solid #e5e7eb;border-left:3px solid ${borderColor};border-radius:6px;padding:12px 14px;margin-bottom:10px;break-inside:avoid;background:#fff">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
      ${tierBadge(tier)}
      ${typeBadge(change.type)}
      <span style="font-size:12px;color:#6b7280">${esc(change.location)}</span>
      ${annotation?.citation ? `<span style="font-size:11px;color:#3b82f6;font-style:italic">· ${esc(annotation.citation)}</span>` : ''}
    </div>
    <p style="margin:0 0 4px;font-size:13px;font-weight:500;color:#111827">${esc(change.summary)}</p>
    ${diffBlocks(change)}
    ${annotation?.annotation ? `<p style="margin:10px 0 0;font-size:12px;color:#374151;background:#f9fafb;border-radius:4px;padding:8px 10px;border:1px solid #e5e7eb">${esc(annotation.annotation)}</p>` : ''}
  </div>`;
}

function section(title: string, result: DiffResult, annotationMap: Map<string, ChangeAnnotation>): string {
  const sorted = [...result.changes].sort((a, b) => {
    const ta = TIER_ORDER[annotationMap.get(a.id)?.significance ?? 'informational'];
    const tb = TIER_ORDER[annotationMap.get(b.id)?.significance ?? 'informational'];
    return ta - tb;
  });

  const rows = sorted.length === 0
    ? '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:24px 0">No changes in this view</p>'
    : sorted.map((c) => changeRow(c, annotationMap.get(c.id))).join('');

  return `
    <section style="margin-bottom:36px">
      <h2 style="margin:0 0 14px;font-size:16px;font-weight:700;color:#111827;padding-bottom:8px;border-bottom:2px solid #e5e7eb">${esc(title)}</h2>
      ${metricsRow(result)}
      ${rows}
    </section>`;
}

/**
 * Generates a self-contained HTML report string from the analysis results.
 * The returned string can be saved as a .html file and opened in any browser.
 * Printing the file (Cmd+P) produces a clean PDF.
 */
export function generateReport({ diffResult, analysisResult, documentNames }: GenerateReportParams): string {
  const annotationMap = new Map<string, ChangeAnnotation>(
    analysisResult.annotations.map((a) => [a.changeId, a])
  );

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const tmplV1Section = section(
    `Template → V1 (${documentNames.template} → ${documentNames.v1})`,
    diffResult.tmplV1,
    annotationMap,
  );

  const v1V2Section = section(
    `V1 → V2 (${documentNames.v1} → ${documentNames.v2})`,
    diffResult.v1V2,
    annotationMap,
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DocDiff Report — ${generatedDate}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #111827;
      background: #f9fafb;
      margin: 0;
      padding: 24px;
    }
    .page {
      max-width: 860px;
      margin: 0 auto;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
      padding: 36px 40px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; border-radius: 0; padding: 20px; max-width: 100%; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e5e7eb">
    <div>
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827">DocDiff Report</h1>
      <p style="margin:0;font-size:12px;color:#9ca3af">Generated ${generatedDate}</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#6b7280;line-height:1.8">
      <div><strong>Template:</strong> ${esc(documentNames.template)}</div>
      <div><strong>V1:</strong> ${esc(documentNames.v1)}</div>
      <div><strong>V2:</strong> ${esc(documentNames.v2)}</div>
    </div>
  </div>

  <!-- Executive Summary -->
  <div style="margin-bottom:32px;padding:14px 18px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#0369a1">Executive Summary</p>
    <p style="margin:0;font-size:13px;color:#0c4a6e;line-height:1.6">${esc(analysisResult.executiveSummary)}</p>
  </div>

  ${tmplV1Section}
  ${v1V2Section}

</div>
</body>
</html>`;
}
