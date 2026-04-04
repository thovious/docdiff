'use client';

import { useFileUpload } from '@/hooks/useFileUpload';
import { useDocxAnalysis } from '@/hooks/useDocxAnalysis';
import { UploadPanel } from '@/components/upload/UploadPanel';
import { AnalysisView } from '@/components/analysis/AnalysisView';
import { ChatPanel } from '@/components/chat/ChatPanel';

/**
 * Top-level application shell.
 *
 * Manages the two-phase workflow:
 * 1. Upload panel — user selects three .docx files and triggers analysis
 * 2. Results view — diff results, agent analysis, and chat panel
 */
export function AppShell() {
  const upload = useFileUpload();
  const analysis = useDocxAnalysis();

  const isAnalyzing =
    analysis.status === 'parsing' ||
    analysis.status === 'diffing' ||
    analysis.status === 'analyzing';

  const handleAnalyze = () => {
    if (!upload.template || !upload.v1 || !upload.v2) return;
    analysis.analyze(upload.template, upload.v1, upload.v2);
  };

  const handleReset = () => {
    analysis.reset();
    upload.reset();
  };

  // Results view
  if (analysis.status === 'done' && analysis.threeWayDiff && analysis.analysisResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <AnalysisView
            diffResult={analysis.threeWayDiff}
            analysisResult={analysis.analysisResult}
            documentNames={{
              template: upload.template?.name ?? 'Template',
              v1: upload.v1?.name ?? 'Version 1',
              v2: upload.v2?.name ?? 'Version 2',
            }}
            onReset={handleReset}
          />
        </div>

        <ChatPanel
          diffResult={analysis.threeWayDiff}
          analysisResult={analysis.analysisResult}
          documentNames={{
            template: upload.template?.name ?? 'Template',
            v1: upload.v1?.name ?? 'Version 1',
            v2: upload.v2?.name ?? 'Version 2',
          }}
        />
      </div>
    );
  }

  // Upload + progress view
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      {isAnalyzing ? (
        <div className="w-full max-w-sm text-center">
          <p className="mb-2 text-sm font-medium text-gray-700">{analysis.progressLabel}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${analysis.progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">{analysis.progress}%</p>
        </div>
      ) : analysis.status === 'error' ? (
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Analysis failed</p>
            <p className="mt-1 text-xs text-red-600">{analysis.error}</p>
            <button
              onClick={handleReset}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <UploadPanel
          template={upload.template}
          v1={upload.v1}
          v2={upload.v2}
          errors={upload.errors}
          onTemplate={upload.setTemplate}
          onV1={upload.setV1}
          onV2={upload.setV2}
          isReady={upload.isReady}
          isAnalyzing={isAnalyzing}
          onAnalyze={handleAnalyze}
        />
      )}
    </div>
  );
}
