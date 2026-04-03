import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import type { ChatMessage as ChatMessageType } from '@/lib/agent/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

const markdownComponents: Components = {
  // Render headings as bold paragraphs — no h1/h2/h3 in chat
  h1: ({ children }) => <p className="font-medium text-gray-900 mb-1">{children}</p>,
  h2: ({ children }) => <p className="font-medium text-gray-900 mb-1">{children}</p>,
  h3: ({ children }) => <p className="font-medium text-gray-900 mb-1">{children}</p>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-medium">{children}</strong>,
  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-');
    return isBlock ? (
      <code className="block rounded-md bg-gray-200 px-3 py-2 font-mono text-xs text-gray-800 my-2">{children}</code>
    ) : (
      <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-xs text-gray-800">{children}</code>
    );
  },
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

/**
 * Renders a single chat message bubble.
 * Assistant messages are rendered through ReactMarkdown for rich formatting.
 * User messages are rendered as plain text.
 *
 * @param message - The {@link ChatMessage} to display.
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        {!message.content ? (
          <span className="inline-flex gap-1 items-center text-gray-400">
            <span className="animate-bounce [animation-delay:0ms]">·</span>
            <span className="animate-bounce [animation-delay:150ms]">·</span>
            <span className="animate-bounce [animation-delay:300ms]">·</span>
          </span>
        ) : isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <ReactMarkdown components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
