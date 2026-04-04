'use client';

import { generateReport } from '@/lib/export/generateReport';
import type { ThreeWayDiffResult } from '@/lib/diff/types';
import type { AnalysisResult } from '@/lib/agent/types';

interface ExportButtonProps {
  diffResult: ThreeWayDiffResult;
  analysisResult: AnalysisResult;
  documentNames: { template: string; v1: string; v2: string };
}

/**
 * Downloads a self-contained HTML report of the diff analysis.
 * The file can be opened in any browser and printed to PDF via Cmd+P.
 */
export function ExportButton({ diffResult, analysisResult, documentNames }: ExportButtonProps) {
  function handleExport() {
    const html = generateReport({ diffResult, analysisResult, documentNames });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docdiff-report-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
    >
      Export Report
    </button>
  );
}
