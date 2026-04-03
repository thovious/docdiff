import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { buildAnalysisPrompt } from '@/lib/agent/buildAnalysisPrompt';
import type { ThreeWayDiffResult, ChangeRecord } from '@/lib/diff/types';
import type { AnalysisResult } from '@/lib/agent/types';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a contract analysis agent. You have been given a structured diff of three \
Word documents: a Template, a Version 1 (V1), and a Version 2 (V2) of a contract.

The diff was produced by a deterministic algorithm — every change listed is a verified, \
real difference. Your job is NOT to find changes. Your job is to interpret them.

For each change provided, you must:
1. Assign a significance tier: "critical" (material change to rights/obligations), \
"moderate" (notable structural or substantive change), "minor" (editorial or \
formatting only), or "informational" (metadata changes like filename).
2. Write a plain-English annotation explaining why the change matters, not just \
what it says. Be specific. Reference clause names or topics where identifiable.
3. Provide a citation string: the most specific location reference you can derive \
from the paragraph style, surrounding text, and position (e.g. "Section 4 — \
Limitation of Liability").
4. List IDs of related changes that are logically connected.

Also produce:
- An executive summary in 2-3 sentences. State only what categories of changes \
were found and where. Do not provide legal analysis, risk assessments, or recommendations.
- An ordered list of change IDs that the reviewer should look at first.
- A list of 0 risk flags (always return an empty array: []).

Respond ONLY with a valid JSON object matching this exact structure — no markdown, \
no preamble, no trailing text:
{
  "executiveSummary": "string",
  "priorityChanges": ["changeId", "..."],
  "riskFlags": ["string", "..."],
  "annotations": [
    {
      "changeId": "string",
      "significance": "critical|moderate|minor|informational",
      "annotation": "string",
      "citation": "string",
      "relatedChangeIds": ["string", "..."]
    }
  ]
}`;

/**
 * Cap the total number of changes sent to the agent.
 * Priority order: tmplV2 → v1V2 → tmplV1.
 *
 * @param diff - The three-way diff result.
 * @param max - Maximum number of changes to include.
 * @returns A filtered array of change records.
 */
function capChanges(diff: ThreeWayDiffResult, max: number): ChangeRecord[] {
  const priority = [
    ...diff.tmplV2.changes,
    ...diff.v1V2.changes,
    ...diff.tmplV1.changes,
  ];
  return priority.slice(0, max);
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('diff' in body) ||
    !('documentNames' in body)
  ) {
    return NextResponse.json(
      { error: 'Request body must contain diff and documentNames' },
      { status: 400 }
    );
  }

  const { diff } = body as {
    diff: ThreeWayDiffResult;
    documentNames: { template: string; v1: string; v2: string };
  };

  if (!diff?.tmplV1 || !diff?.v1V2 || !diff?.tmplV2) {
    return NextResponse.json(
      { error: 'diff must contain tmplV1, v1V2, and tmplV2 results' },
      { status: 400 }
    );
  }

  // Cap at 40 changes total before sending to the agent.
  const capped = capChanges(diff, 40);
  const cappedDiff: ThreeWayDiffResult = {
    ...diff,
    tmplV2: { ...diff.tmplV2, changes: capped.filter((c) => c.view === 'tmpl-v2') },
    v1V2: { ...diff.v1V2, changes: capped.filter((c) => c.view === 'v1-v2') },
    tmplV1: { ...diff.tmplV1, changes: capped.filter((c) => c.view === 'tmpl-v1') },
    allChanges: capped,
  };

  const userPrompt = buildAnalysisPrompt(cappedDiff);

  let responseText: string;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    responseText = content.text;
  } catch (err: unknown) {
    const status =
      err instanceof Anthropic.APIError
        ? err.status === 401
          ? 401
          : err.status === 429
            ? 429
            : 502
        : 502;
    const message = err instanceof Error ? err.message : 'Claude API error';
    return NextResponse.json({ error: message }, { status });
  }

  // Extract the outermost JSON object, handling markdown fences or preamble text.
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const cleaned = jsonMatch ? jsonMatch[0] : responseText.trim();

  let parsed: Omit<AnalysisResult, 'generatedAt'>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse agent response as JSON' },
      { status: 502 }
    );
  }

  const result: AnalysisResult = {
    ...parsed,
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
