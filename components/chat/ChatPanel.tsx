'use client';

import { useRef, useEffect, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import type { AnalysisResult } from '@/lib/agent/types';
import type { ThreeWayDiffResult } from '@/lib/diff/types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';

interface ChatPanelProps {
  diffResult: ThreeWayDiffResult;
  analysisResult: AnalysisResult;
  documentNames: { template: string; v1: string; v2: string };
}

/**
 * Fixed right-side collapsible chat panel.
 *
 * Shows suggested questions when the thread is empty. Renders streaming
 * responses in real time (typewriter effect).
 *
 * @param diffResult - The three-way diff result for chat context.
 * @param analysisResult - The agent analysis result for chat context.
 * @param documentNames - The names of the three uploaded documents.
 */
export function ChatPanel({ diffResult, analysisResult, documentNames }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const { messages, isStreaming, error, sendMessage, clearHistory } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const context = { threeWayDiff: diffResult, analysisResult, documentNames };

  const handleSend = (content: string) => {
    sendMessage(content, context);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 flex h-[600px] w-[380px] flex-col rounded-xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Ask about the analysis</h3>
              <p className="text-xs text-gray-400">Grounded in your document diff</p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages or suggested questions */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <SuggestedQuestions
                analysisResult={analysisResult}
                diffResult={diffResult}
                onSelect={handleSend}
              />
            ) : (
              <div className="flex flex-col gap-3 p-3">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                {error && (
                  <p className="text-center text-xs text-red-500">{error}</p>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      )}
    </>
  );
}
