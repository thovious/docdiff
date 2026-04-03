'use client';

import { useState, useCallback } from 'react';
import type { ChatMessage, ChatContext } from '@/lib/agent/types';

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
}

interface ChatActions {
  sendMessage: (content: string, context: ChatContext) => Promise<void>;
  clearHistory: () => void;
}

const MAX_LOCAL_MESSAGES = 20;
const MAX_API_HISTORY = 10;

/**
 * Manage chat state and handle streaming responses from /api/chat.
 *
 * Consumers must pass the full {@link ChatContext} (threeWayDiff + analysisResult
 * + documentNames) on each sendMessage call. The hook caps local history at 20
 * messages and trims to 10 before sending to the API.
 *
 * @returns Chat state and action functions.
 */
export function useChat(): ChatState & ChatActions {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string, context: ChatContext): Promise<void> => {
      if (isStreaming) return;

      setError(null);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => {
        const next = [...prev, userMessage, assistantMessage];
        // Cap local history at MAX_LOCAL_MESSAGES
        return next.length > MAX_LOCAL_MESSAGES
          ? next.slice(next.length - MAX_LOCAL_MESSAGES)
          : next;
      });

      setIsStreaming(true);

      try {
        // Use the last MAX_API_HISTORY messages before the new ones for history
        const historySnapshot = messages.slice(-MAX_API_HISTORY);

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            history: historySnapshot,
            context,
          }),
        });

        if (!response.ok || !response.body) {
          const errText = await response.text().catch(() => 'Unknown error');
          throw new Error(errText || `API returned ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          setMessages((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
              next[lastIdx] = {
                ...next[lastIdx],
                content: next[lastIdx].content + chunk,
              };
            }
            return next;
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Chat error';
        setError(msg);
        // Update the assistant message to show the error
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
            next[lastIdx] = {
              ...next[lastIdx],
              content: `Sorry, something went wrong: ${msg}`,
            };
          }
          return next;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages]
  );

  return { messages, isStreaming, error, sendMessage, clearHistory };
}
