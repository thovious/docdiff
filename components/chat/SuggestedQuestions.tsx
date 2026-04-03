import type { AnalysisResult } from '@/lib/agent/types';
import type { ThreeWayDiffResult } from '@/lib/diff/types';

interface SuggestedQuestionsProps {
  analysisResult: AnalysisResult;
  diffResult: ThreeWayDiffResult;
  onSelect: (question: string) => void;
}

/**
 * Dynamically generated question chips based on the analysis result.
 *
 * Logic per PRD §13:
 * - If risk flags exist → "What are the risk flags I should know about?"
 * - If any critical change → "Walk me through the critical changes"
 * - If tmplV2 has more changes than v1V2 → "What's the net difference from the original template?"
 * - If any metadata changes → "Were there any document metadata changes?"
 * - Always: "Summarize what changed between V1 and V2" and "Which changes should I review first?"
 *
 * @param analysisResult - The agent analysis result.
 * @param diffResult - The three-way diff result.
 * @param onSelect - Callback when a question chip is selected.
 */
export function SuggestedQuestions({ analysisResult, diffResult, onSelect }: SuggestedQuestionsProps) {
  const questions: string[] = [];

  if (analysisResult.riskFlags.length > 0) {
    questions.push('What are the risk flags I should know about?');
  }

  const hasCritical = analysisResult.annotations.some((a) => a.significance === 'critical');
  if (hasCritical) {
    questions.push('Walk me through the critical changes');
  }

  if (diffResult.tmplV2.totalChanges > diffResult.v1V2.totalChanges) {
    questions.push("What's the net difference from the original template?");
  }

  const hasMetadata = diffResult.allChanges.some((c) => c.type === 'metadata');
  if (hasMetadata) {
    questions.push('Were there any document metadata changes?');
  }

  questions.push('Summarize what changed between V1 and V2');
  questions.push('Which changes should I review first?');

  return (
    <div className="flex flex-col gap-3 px-3 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Suggested questions</p>
      <div className="flex flex-col gap-2">
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
