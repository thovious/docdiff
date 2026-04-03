import Anthropic from '@anthropic-ai/sdk';
import { buildChatContext } from '@/lib/agent/buildChatContext';
import type { ChatContext, ChatMessage } from '@/lib/agent/types';

const client = new Anthropic();

/**
 * Build the system prompt for the chat endpoint from the full context.
 *
 * @param ctx - The chat context containing diff and analysis data.
 * @returns A complete system prompt string.
 */
function buildSystemPrompt(ctx: ChatContext): string {
  const contextBlock = buildChatContext(ctx);

  return `You are a document analysis assistant for DocDiff. You have access to a complete \
analysis of three contract documents.

${contextBlock}

Instructions:
- Answer only based on the analysis data above.
- When referencing a specific change, cite its change ID and location.
- If the user asks about something not present in the diff, say so clearly.
- Be concise. Use plain English. Avoid legal conclusions — you are an analysis tool, not a lawyer.
- Keep responses concise — 3 to 5 sentences for simple questions, short bullet lists only when comparing multiple items.
- Do not use headers (##, ###) in your responses.
- Do not repeat the question back to the user. Get straight to the answer.
- Use bold sparingly, only for a specific term or change ID that is the direct subject of the answer.`;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('message' in body) ||
    !('history' in body) ||
    !('context' in body)
  ) {
    return new Response(
      JSON.stringify({ error: 'Request body must contain message, history, and context' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { message, history, context } = body as {
    message: string;
    history: ChatMessage[];
    context: ChatContext;
  };

  if (typeof message !== 'string' || !message.trim()) {
    return new Response(
      JSON.stringify({ error: 'message must be a non-empty string' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Cap history at 10 messages before sending to Claude.
  const cappedHistory = Array.isArray(history) ? history.slice(-10) : [];

  const systemPrompt = buildSystemPrompt(context);

  const messages: Anthropic.MessageParam[] = [
    ...cappedHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        const stream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
