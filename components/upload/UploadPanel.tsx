'use client';

import { UploadZone } from './UploadZone';

interface UploadPanelProps {
  template: File | null;
  v1: File | null;
  v2: File | null;
  errors: { template: string | null; v1: string | null; v2: string | null };
  onTemplate: (f: File | null) => void;
  onV1: (f: File | null) => void;
  onV2: (f: File | null) => void;
  isReady: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

/**
 * Three-zone upload panel for Template, Version 1, and Version 2 documents.
 *
 * The Analyze button is disabled until all three zones contain valid .docx files.
 *
 * @param template - Currently selected template file.
 * @param v1 - Currently selected V1 file.
 * @param v2 - Currently selected V2 file.
 * @param errors - Per-slot validation error messages.
 * @param onTemplate - Setter for the template file.
 * @param onV1 - Setter for the V1 file.
 * @param onV2 - Setter for the V2 file.
 * @param isReady - True when all three slots are valid and ready to analyze.
 * @param isAnalyzing - True during an active analysis run.
 * @param onAnalyze - Callback to trigger analysis.
 */
export function UploadPanel({
  template,
  v1,
  v2,
  errors,
  onTemplate,
  onV1,
  onV2,
  isReady,
  isAnalyzing,
  onAnalyze,
}: UploadPanelProps) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">DocDiff</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload three Word documents to compare Template → V1 → V2
        </p>
      </div>

      <div className="mb-4 flex justify-center">
        <div className="w-full max-w-sm">
          <UploadZone
            label="Template"
            file={template}
            onFile={onTemplate}
            error={errors.template}
            disabled={isAnalyzing}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UploadZone
          label="Version 1"
          file={v1}
          onFile={onV1}
          error={errors.v1}
          disabled={isAnalyzing}
        />
        <UploadZone
          label="Version 2"
          file={v2}
          onFile={onV2}
          error={errors.v2}
          disabled={isAnalyzing}
        />
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={onAnalyze}
          disabled={!isReady || isAnalyzing}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </>
          ) : (
            'Analyze Documents'
          )}
        </button>
      </div>

      {!isReady && !isAnalyzing && (
        <p className="mt-3 text-center text-xs text-gray-400">
          Upload all three .docx files to enable analysis
        </p>
      )}
    </div>
  );
}
