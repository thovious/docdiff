import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a document analyst assistant. You will be given a structured summary of differences \
found between two Word documents using deterministic algorithmic comparison. Your job is to \
write a concise, plain-English 2-3 sentence summary of what changed. Be specific about \
the nature of changes. Do not use markdown, bullet points, or headers. Write in complete \
sentences as if briefing a colleague.`;

/** Shape of a single change item accepted in the request body. */
interface ChangeItem {
  type: string;
  category: string;
  summary: string;
}

/** Expected request body shape. */
interface RequestBody {
  changes: ChangeItem[];
  totalChanges: number;
  contentChanges: number;
  formattingChanges: number;
}

/**
 * Validate that `value` is a non-negative finite number.
 *
 * @param value - The value to check.
 * @returns True if it is a valid count.
 */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && value >= 0;
}

/**
 * Validate and extract the request body, returning null if the shape is wrong.
 *
 * @param body - Raw parsed JSON from the request.
 * @returns A typed {@link RequestBody} or null.
 */
function parseBody(body: unknown): RequestBody | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.changes)) return null;
  if (!isCount(b.totalChanges)) return null;
  if (!isCount(b.contentChanges)) return null;
  if (!isCount(b.formattingChanges)) return null;

  for (const item of b.changes) {
    if (typeof item !== 'object' || item === null) return null;
    const it = item as Record<string, unknown>;
    if (typeof it.type !== 'string') return null;
    if (typeof it.category !== 'string') return null;
    if (typeof it.summary !== 'string') return null;
  }

  return {
    changes: b.changes as ChangeItem[],
    totalChanges: b.totalChanges as number,
    contentChanges: b.contentChanges as number,
    formattingChanges: b.formattingChanges as number,
  };
}

/**
 * POST /api/summarize
 *
 * Accepts a structured change list from the client-side diff engine and
 * returns a plain-English AI summary via the Anthropic API.
 * The Anthropic API key is server-side only — never exposed to the browser.
 */
export async function POST(req: Request): Promise<NextResponse> {
  // Parse and validate body.
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const body = parseBody(rawBody);
  if (!body) {
    return NextResponse.json(
      { error: 'Request body is missing required fields or has invalid types.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Cap changes array to 20 items (cost control).
  const cappedChanges = body.changes.slice(0, 20);

  // Build the user prompt.
  const changeLines = cappedChanges
    .map((c, i) => `${i + 1}. [${c.type}/${c.category}] ${c.summary}`)
    .join('\n');

  const userPrompt = [
    `Document comparison summary:`,
    `- Total changes: ${body.totalChanges}`,
    `- Content changes: ${body.contentChanges}`,
    `- Formatting changes: ${body.formattingChanges}`,
    ``,
    `Change details (up to 20 shown):`,
    changeLines || '(no changes detected)',
  ].join('\n');

  // Call the Anthropic API.
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const firstBlock = message.content[0];
    if (!firstBlock || firstBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'Unexpected response format from AI service.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { summary: firstBlock.text.trim() },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    // Log the real error server-side; return a generic message to the client.
    console.error('[summarize] Anthropic API error:', err);

    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) {
        return NextResponse.json(
          { error: 'AI service authentication failed. Check server configuration.' },
          { status: 502, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      if (err.status === 429) {
        return NextResponse.json(
          { error: 'AI service is rate-limited. Please try again shortly.' },
          { status: 429, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    return NextResponse.json(
      { error: 'AI summarization is temporarily unavailable.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
