# DocDiff — Product Requirements Document

**Version:** 2.0  
**Prepared for:** Claude Code / CTO Review  
**Document type:** Full-stack web application PRD + engineering prompt  
**Changes from v1.0:** Three-document comparison, agentic analysis layer, metadata change detection, in-app chat interface

---

## 1. Executive Summary

DocDiff is a web application that allows users to upload three Microsoft Word (`.docx`) documents — a **Template**, a **Version 1 (V1)** contract, and a **Version 2 (V2)** contract — and receive a deterministic, accurate, AI-enhanced comparison report across all three.

The tool identifies content, formatting, and metadata changes at the paragraph and character level using a structural diffing algorithm. On top of that deterministic foundation, an **analysis agent** powered by Claude interprets each change, assigns a significance tier, provides plain-English annotations with citations, and produces a prioritized executive summary.

Once the analysis is complete, users interact with the findings via an **in-app chat interface** — asking follow-up questions about specific changes, clauses, or risk areas without ever leaving the tool.

The product is designed to be shareable, fast, and trustworthy: every change surfaced can be traced to a structural difference in the document XML. The AI layer interprets — it never detects.

---

## 2. Problem Statement

Legal, compliance, and operations teams reviewing contract revisions face a three-way comparison problem: they need to understand what changed from the original template to V1, what changed from V1 to V2, and what has drifted from the template in the final version. Existing tools handle two-document diffs at best, require expensive software, and provide no interpretive layer. Teams end up exporting diffs into separate AI tools to get plain-English analysis, breaking their workflow.

DocDiff solves all three stages in one tool, with an AI agent that reasons about significance — not just presence — of changes, and a chat interface that lets users interrogate the analysis without switching context.

---

## 3. Goals & Success Criteria

| Goal | Success Metric |
|---|---|
| Accurate three-way change detection | Zero false negatives on paragraph-level text changes across all three comparison views |
| Metadata detection | Filename changes and document property changes surfaced as named change records |
| Agentic insight quality | Agent annotations include specific clause citations and significance tiers on every change |
| Chat grounding | Chat answers reference specific change IDs and paragraph locations, not general knowledge |
| Performance | Full analysis (parse + diff + agent pass) completes in under 20 seconds for documents up to 100 pages |
| Deployable | Passes ESLint, has test coverage, deployable to Vercel |

---

## 4. Target Users

- **Legal & compliance teams** comparing contract template → V1 → V2 redlines
- **Procurement teams** reviewing supplier contract modifications
- **Editors & writers** tracking multi-draft revisions
- **Executives** doing a quick sanity-check on final contract versions before sign-off

---

## 5. Three-Document Comparison Model

DocDiff produces **three distinct comparison views**, each independently diffed:

| View | Left Document | Right Document | Purpose |
|---|---|---|---|
| **Template → V1** | Template | Version 1 | What was changed from the master template in the first draft? |
| **V1 → V2** | Version 1 | Version 2 | What changed between negotiation rounds? |
| **Template → V2** | Template | Version 2 | What is the net deviation from the template in the final version? |

Each view is a full `DiffResult` computed independently. The UI allows the user to switch between views via a tab bar. The agentic analysis and chat context are aware of all three views simultaneously.

---

## 6. Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Component library:** shadcn/ui
- **State management:** React Context + `useReducer` (analysis state machine)
- **File parsing (client-side):** mammoth.js (text extraction), JSZip (OOXML access)
- **Diff algorithm:** Custom Myers LCS implementation

### Backend / API
- **Runtime:** Next.js API Routes (Edge-compatible)
- **AI layer:** Anthropic Claude API (`claude-sonnet-4-20250514`)
  - `/api/analyze` — agentic analysis pass over the full three-way diff
  - `/api/chat` — context-aware chat endpoint
- **Environment secrets:** `ANTHROPIC_API_KEY` via `.env.local`

### Infrastructure
- **Deployment:** Vercel
- **No database required** — all state is in-memory per session

### Dev tooling
- **Linting:** ESLint + Prettier
- **Testing:** Vitest + React Testing Library
- **Type checking:** `tsc --noEmit` in CI
- **CI/CD:** GitHub Actions (lint → typecheck → test → deploy preview)

---

## 7. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                            Browser                                │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    Upload Panel                           │    │
│  │   [Template .docx]   [V1 .docx]   [V2 .docx]            │    │
│  └────────────────────────┬─────────────────────────────────┘    │
│                            │ 3x File objects                      │
│  ┌─────────────────────────▼───────────────────────────────┐     │
│  │                   DocParser (client)                     │     │
│  │   JSZip → OOXML → ParagraphNode[]  (x3)                 │     │
│  │   mammoth.js → rawText             (x3)                  │     │
│  │   MetadataExtractor → DocMetadata  (x3)                  │     │
│  └──────┬──────────────────┬──────────────────┬────────────┘     │
│         │                  │                  │                   │
│  ┌──────▼──────────────────▼──────────────────▼────────────┐     │
│  │                   DiffEngine (client)                    │     │
│  │   Myers LCS × 3 comparison views                        │     │
│  │   MetadataDiff (filename, properties)                   │     │
│  │   → ThreeWayDiffResult { tmplV1, v1V2, tmplV2 }        │     │
│  └──────────────────────────┬───────────────────────────────┘    │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │ POST /api/analyze
               ┌───────────────▼──────────────────────┐
               │         Next.js API: /api/analyze     │
               │   Builds structured agent prompt      │
               │   Calls Claude (single-pass agent)    │
               │   Returns AnalysisResult with         │
               │   annotations, tiers, exec summary    │
               └───────────────┬──────────────────────┘
                               │
               ┌───────────────▼──────────────────────┐
               │       Anthropic Claude API            │
               │   claude-sonnet-4-20250514            │
               └──────────────────────────────────────┘

               ┌──────────────────────────────────────┐
               │         Next.js API: /api/chat        │
               │   Receives: message + full context    │
               │   Context = ThreeWayDiffResult +      │
               │             AnalysisResult +          │
               │             conversation history      │
               │   Returns: streaming chat response    │
               └──────────────────────────────────────┘
```

**Key architectural decisions:**

1. All parsing and diffing is client-side. No document content is sent to any server.
2. `/api/analyze` receives only the structured `ThreeWayDiffResult` — no raw document text.
3. `/api/chat` receives the structured results plus raw paragraph text for the specific paragraphs referenced in the user's question — not the entire document.
4. The AI never performs change detection. It only interprets changes the diff engine has already found.

---

## 8. Project File Structure

```
docdiff/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Renders <AppShell />
│   └── api/
│       ├── analyze/
│       │   └── route.ts                  # POST — agentic analysis pass
│       └── chat/
│           └── route.ts                  # POST — context-aware chat (streaming)
│
├── components/
│   ├── shell/
│   │   └── AppShell.tsx                  # Top-level layout: upload → results
│   ├── upload/
│   │   ├── UploadPanel.tsx               # Three-zone upload panel
│   │   └── UploadZone.tsx                # Single drag-drop zone (reused x3)
│   ├── analysis/
│   │   ├── AnalysisView.tsx              # Results container with tab navigation
│   │   ├── ComparisonTabs.tsx            # Template→V1 / V1→V2 / Template→V2 tabs
│   │   ├── MetricsDashboard.tsx          # Summary cards per view
│   │   ├── ExecutiveSummary.tsx          # Agent-generated priority summary
│   │   ├── FilterBar.tsx                 # Filter by change type / significance tier
│   │   └── ChangeList/
│   │       ├── ChangeList.tsx
│   │       ├── ChangeItem.tsx            # Expandable row with agent annotation
│   │       ├── DiffBlock.tsx             # Before/after + inline word highlight
│   │       └── SignificanceBadge.tsx     # critical / moderate / minor / metadata
│   └── chat/
│       ├── ChatPanel.tsx                 # Slide-in chat panel (right side)
│       ├── ChatMessage.tsx               # Renders user and assistant messages
│       ├── ChatInput.tsx                 # Text input + send button
│       └── SuggestedQuestions.tsx        # Pre-populated question chips
│
├── lib/
│   ├── parser/
│   │   ├── docxParser.ts                 # JSZip + OOXML → ParsedDoc
│   │   ├── metadataExtractor.ts          # Extracts filename, author, dates, title
│   │   └── types.ts                      # ParagraphNode, RunFormat, DocMetadata, ParsedDoc
│   ├── diff/
│   │   ├── lcs.ts                        # Pure Myers LCS
│   │   ├── documentDiff.ts               # Single-pair diff → DiffResult
│   │   ├── threeWayDiff.ts               # Orchestrates 3 DiffResults → ThreeWayDiffResult
│   │   ├── inlineDiff.ts                 # Word-level diff
│   │   ├── formatDiff.ts                 # Formatting change detector
│   │   ├── metadataDiff.ts               # Filename + property change detector
│   │   └── types.ts                      # All diff types
│   ├── agent/
│   │   ├── buildAnalysisPrompt.ts        # Constructs the agent prompt from ThreeWayDiffResult
│   │   ├── buildChatContext.ts           # Constructs per-message chat context payload
│   │   └── types.ts                      # AnalysisResult, ChangeAnnotation, ChatMessage
│   └── utils/
│       ├── truncate.ts
│       └── htmlEscape.ts
│
├── hooks/
│   ├── useDocxAnalysis.ts                # Full pipeline orchestration hook
│   ├── useFileUpload.ts                  # File drag-drop + validation (x3 files)
│   └── useChat.ts                        # Chat state + streaming response handler
│
├── store/
│   └── analysisContext.tsx               # React Context + useReducer state machine
│
├── types/
│   └── index.ts                          # Re-exports all shared types
│
├── __tests__/
│   ├── lib/
│   │   ├── lcs.test.ts
│   │   ├── documentDiff.test.ts
│   │   ├── threeWayDiff.test.ts
│   │   ├── inlineDiff.test.ts
│   │   ├── formatDiff.test.ts
│   │   └── metadataDiff.test.ts
│   └── components/
│       ├── UploadZone.test.tsx
│       ├── ChangeItem.test.tsx
│       └── ChatPanel.test.tsx
│
├── .env.local                            # ANTHROPIC_API_KEY (gitignored)
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 9. Core Data Types

### 9.1 Parser types — `lib/parser/types.ts`

```typescript
export interface RunFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  fontSize: string | null;
  color: string | null;
  fontFamily: string | null;
}

export interface ParagraphNode {
  index: number;
  text: string;
  style: string;
  alignment: string;
  indentLeft: number;
  indentRight: number;
  numId: string;
  runs: RunFormat[];
}

export interface DocMetadata {
  filename: string;
  title: string | null;
  author: string | null;
  lastModifiedBy: string | null;
  createdAt: string | null;
  modifiedAt: string | null;
  revision: string | null;
}

export interface ParsedDoc {
  paragraphs: ParagraphNode[];
  rawText: string;
  metadata: DocMetadata;
  filename: string;
}
```

### 9.2 Diff types — `lib/diff/types.ts`

```typescript
export type ChangeType = 'added' | 'removed' | 'modified' | 'format' | 'metadata';
export type ChangeCategory = 'content' | 'formatting' | 'metadata';
export type SignificanceTier = 'critical' | 'moderate' | 'minor' | 'informational';
export type ComparisonView = 'tmpl-v1' | 'v1-v2' | 'tmpl-v2';

export interface InlineDiffSegment {
  type: 'equal' | 'added' | 'removed';
  value: string;
}

export interface ChangeRecord {
  id: string;
  type: ChangeType;
  category: ChangeCategory;
  view: ComparisonView;
  location: string;
  summary: string;
  origText: string;
  changedText: string;
  origIndex: number | null;
  changedIndex: number | null;
  inlineDiff: InlineDiffSegment[];
  formatDetails: string[];
  metadataField?: string;        // e.g. "filename", "author", "title"
}

export interface DiffResult {
  view: ComparisonView;
  changes: ChangeRecord[];
  totalChanges: number;
  contentChanges: number;
  formattingChanges: number;
  metadataChanges: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

export interface ThreeWayDiffResult {
  tmplV1: DiffResult;
  v1V2: DiffResult;
  tmplV2: DiffResult;
  allChanges: ChangeRecord[];    // flat union of all three views, deduplicated by id
}
```

### 9.3 Agent types — `lib/agent/types.ts`

```typescript
export interface ChangeAnnotation {
  changeId: string;
  significance: SignificanceTier;
  annotation: string;            // plain-English explanation of why this change matters
  citation: string;              // e.g. "Section 3, Paragraph 2 — Payment Terms"
  relatedChangeIds: string[];    // IDs of other changes in the same logical group
}

export interface AnalysisResult {
  executiveSummary: string;      // 3-5 sentence plain-English brief for decision-makers
  priorityChanges: string[];     // ordered list of change IDs to review first
  annotations: ChangeAnnotation[];
  riskFlags: string[];           // high-level risk descriptions, e.g. "Liability cap removed in V2"
  generatedAt: string;           // ISO timestamp
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface ChatContext {
  threeWayDiff: ThreeWayDiffResult;
  analysisResult: AnalysisResult;
  documentNames: {
    template: string;
    v1: string;
    v2: string;
  };
}
```

---

## 10. Module Specifications

### 10.1 `lib/parser/metadataExtractor.ts`

**Responsibility:** Extract document metadata from the `.docx` OOXML package and return a `DocMetadata` object alongside the filename.

**Requirements:**
- Read `docProps/core.xml` from the JSZip archive for: `dc:title`, `dc:creator`, `cp:lastModifiedBy`, `dcterms:created`, `dcterms:modified`, `cp:revision`
- The `filename` field comes directly from `File.name` — this is treated as a first-class metadata field
- All fields are nullable — missing properties return `null`, never throw
- Must be a pure async function: takes `File` + `JSZip`, returns `Promise<DocMetadata>`

### 10.2 `lib/diff/metadataDiff.ts`

**Responsibility:** Compare `DocMetadata` objects from two documents and return `ChangeRecord[]` for any fields that differ.

**Requirements:**
- Compare all fields: `filename`, `title`, `author`, `lastModifiedBy`, `revision`
- Each differing field produces one `ChangeRecord` with `type: 'metadata'`, `category: 'metadata'`
- The `metadataField` property on the record must be populated with the field name (e.g. `"filename"`)
- The `summary` for a filename change must read: `Filename changed: "original.docx" → "changed.docx"`
- `location` for all metadata changes: `"Document Properties"`
- Returns empty array if no metadata differences are found

### 10.3 `lib/diff/threeWayDiff.ts`

**Responsibility:** Accept three `ParsedDoc` objects and return a complete `ThreeWayDiffResult`.

**Requirements:**
- Call `documentDiff(template, v1)` → `tmplV1`
- Call `documentDiff(v1, v2)` → `v1V2`
- Call `documentDiff(template, v2)` → `tmplV2`
- Call `metadataDiff` for each comparison pair and merge results into the corresponding `DiffResult`
- Stamp each `ChangeRecord` with the correct `view` field
- Build `allChanges` as the union of all three result sets, with each record's `id` prefixed by its view to guarantee uniqueness: `tmplV1-modified-0-1`
- Must be a pure function — no I/O, no side effects

### 10.4 `app/api/analyze/route.ts`

**Responsibility:** Receive the `ThreeWayDiffResult`, run a single-pass agentic analysis via Claude, and return an `AnalysisResult`.

**Request body:**
```typescript
{
  diff: ThreeWayDiffResult;
  documentNames: { template: string; v1: string; v2: string; };
}
```

**Requirements:**
- Validate incoming payload — return 400 if malformed
- Cap total changes sent to Claude at 40 across all three views (prioritize `tmplV2` then `v1V2` then `tmplV1` when trimming)
- Build the agent prompt using `buildAnalysisPrompt.ts`
- Parse the Claude response as structured JSON — see agent prompt spec below
- Return the parsed `AnalysisResult` on success
- Return `{ error: string }` with appropriate HTTP status on failure
- Set `Cache-Control: no-store`

**Agent system prompt:**
```
You are a contract analysis agent. You have been given a structured diff of three 
Word documents: a Template, a Version 1 (V1), and a Version 2 (V2) of a contract.

The diff was produced by a deterministic algorithm — every change listed is a verified, 
real difference. Your job is NOT to find changes. Your job is to interpret them.

For each change provided, you must:
1. Assign a significance tier: "critical" (material change to rights/obligations), 
   "moderate" (notable structural or substantive change), "minor" (editorial or 
   formatting only), or "informational" (metadata changes like filename).
2. Write a plain-English annotation explaining why the change matters, not just 
   what it says. Be specific. Reference clause names or topics where identifiable.
3. Provide a citation string: the most specific location reference you can derive 
   from the paragraph style, surrounding text, and position (e.g. "Section 4 — 
   Limitation of Liability").
4. List IDs of related changes that are logically connected.

Also produce:
- An executive summary of 3-5 sentences suitable for a decision-maker who will 
  not read the full diff.
- An ordered list of change IDs that the reviewer should look at first.
- A list of 1-5 high-level risk flags (plain English, one sentence each).

Respond ONLY with a valid JSON object matching this exact structure — no markdown, 
no preamble, no trailing text:
{
  "executiveSummary": "string",
  "priorityChanges": ["changeId", ...],
  "riskFlags": ["string", ...],
  "annotations": [
    {
      "changeId": "string",
      "significance": "critical|moderate|minor|informational",
      "annotation": "string",
      "citation": "string",
      "relatedChangeIds": ["string", ...]
    }
  ]
}
```

### 10.5 `app/api/chat/route.ts`

**Responsibility:** Accept a chat message plus full analysis context, return a streaming Claude response grounded in the document data.

**Request body:**
```typescript
{
  message: string;
  history: ChatMessage[];         // last 10 messages max
  context: ChatContext;
}
```

**Requirements:**
- Validate request body — return 400 if malformed
- Cap `history` at 10 messages before passing to Claude
- Build context using `buildChatContext.ts` — this constructs a compact system prompt containing:
  - Document names and a one-line description of each comparison view
  - The executive summary from `AnalysisResult`
  - All `ChangeRecord` summaries with their IDs and locations (not full text)
  - The full `ChangeAnnotation` for each change
  - Risk flags
- Return a **streaming** response using `Response` with a `ReadableStream` — the frontend must handle SSE streaming
- The system prompt must instruct Claude to: only answer questions about these specific documents, cite change IDs when referencing specific changes, and decline to speculate about things not present in the diff

**Chat system prompt structure:**
```
You are a document analysis assistant for DocDiff. You have access to a complete 
analysis of three contract documents.

DOCUMENTS:
- Template: {template filename}
- Version 1: {v1 filename}  
- Version 2: {v2 filename}

EXECUTIVE SUMMARY:
{executiveSummary}

RISK FLAGS:
{riskFlags}

CHANGES ({total} total across all views):
{compact change list with IDs, locations, summaries, and annotations}

Instructions:
- Answer only based on the analysis data above.
- When referencing a specific change, cite its change ID and location.
- If the user asks about something not present in the diff, say so clearly.
- Be concise. Use plain English. Avoid legal conclusions — you are an analysis 
  tool, not a lawyer.
```

### 10.6 `lib/agent/buildAnalysisPrompt.ts`

**Responsibility:** Transform a `ThreeWayDiffResult` into a structured text payload suitable for the agent prompt.

**Requirements:**
- Format each `ChangeRecord` as a compact block: ID, view, type, location, summary, origText (truncated to 200 chars), changedText (truncated to 200 chars)
- Group changes by view in the prompt: Template→V2 first (highest signal), then V1→V2, then Template→V1
- Total token budget: keep the formatted change list under ~6,000 tokens (roughly 4,500 words) — trim lowest-signal changes (format-only, minor metadata) if over budget
- Return a single string — this is appended to the user turn of the Claude API call

### 10.7 `lib/agent/buildChatContext.ts`

**Responsibility:** Build a compact, token-efficient context object for the chat system prompt from the full `ChatContext`.

**Requirements:**
- Include all `ChangeAnnotation` entries from `AnalysisResult`
- Include `ChangeRecord` summary + location for every change (omit `origText`/`changedText` to save tokens — those are available on demand if the user asks)
- Include `executiveSummary`, `riskFlags`, `priorityChanges`
- Target: under 3,000 tokens for the context block so the conversation history has room

### 10.8 `hooks/useDocxAnalysis.ts`

**Exposed state:**
```typescript
{
  status: 'idle' | 'parsing' | 'diffing' | 'analyzing' | 'done' | 'error';
  progress: number;
  progressLabel: string;
  threeWayDiff: ThreeWayDiffResult | null;
  analysisResult: AnalysisResult | null;
  error: string | null;
  analyze: (template: File, v1: File, v2: File) => Promise<void>;
  reset: () => void;
}
```

**Pipeline steps with progress values:**
- 5% — Reading document files
- 20% — Parsing Template structure
- 35% — Parsing V1 structure
- 50% — Parsing V2 structure
- 65% — Running three-way diff
- 78% — Sending to analysis agent
- 95% — Processing agent response
- 100% — Complete

### 10.9 `hooks/useChat.ts`

**Responsibility:** Manage chat state and handle streaming responses from `/api/chat`.

**Exposed state:**
```typescript
{
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
}
```

**Requirements:**
- Uses the Fetch API with `ReadableStream` to consume the streaming response token by token
- Appends tokens to the last assistant message in real time (typewriter effect)
- Injects `threeWayDiff` and `analysisResult` from context automatically — the component never passes these manually
- Caps history at 20 messages in local state; trims to 10 before sending to API

---

## 11. UI Component Specifications

### 11.1 `UploadPanel.tsx`

Three `UploadZone` components arranged in a horizontal row on desktop, stacked on mobile. Labels: **Template**, **Version 1**, **Version 2**. The Analyze button is disabled until all three zones have valid `.docx` files. Each zone shows its filename and a green checkmark once populated.

### 11.2 `ComparisonTabs.tsx`

Three tabs: `Template → V1`, `V1 → V2`, `Template → V2`. Each tab shows a change count badge. Switching tabs re-renders `MetricsDashboard` and `ChangeList` for that view without re-running analysis.

### 11.3 `ExecutiveSummary.tsx`

Rendered at the top of the results panel. Shows the agent-generated executive summary in a visually distinct card. Below it, a `PriorityChanges` sub-component lists the top changes the agent flagged — these are rendered as clickable pills that jump to the corresponding `ChangeItem` in the list.

### 11.4 `ChangeItem.tsx`

Collapsed state: `SignificanceBadge` + change type badge + summary text + location + agent citation (truncated).

Expanded state: Full `DiffBlock` (before/after text with inline word highlighting) + full agent annotation paragraph + related change IDs as clickable links.

### 11.5 `SignificanceBadge.tsx`

Four visual states:
- `critical` — red background
- `moderate` — amber background
- `minor` — neutral/gray background
- `informational` — blue background

### 11.6 `ChatPanel.tsx`

A fixed right-side panel (collapsible) that becomes available after analysis completes. Contains:
- A scrollable message thread (`ChatMessage` components)
- `SuggestedQuestions` chips shown only when the thread is empty — pre-populated based on the analysis result (e.g. "What are the most critical changes?", "What changed in V2 vs the template?", "Are there any risk flags I should review?")
- `ChatInput` at the bottom with a send button and keyboard shortcut (`Enter` to send, `Shift+Enter` for newline)
- A "Clear conversation" button in the panel header
- Streaming tokens render in real time — the assistant message appears immediately and fills in character by character

---

## 12. Metadata Change Detection

Metadata changes are first-class `ChangeRecord` entries, not footnotes. They appear in the change list alongside content and formatting changes, filtered and counted separately.

**Fields compared:**

| Field | Source in OOXML | Example change summary |
|---|---|---|
| `filename` | `File.name` | `Filename changed: "MSA_Template.docx" → "MSA_Client_Final.docx"` |
| `title` | `docProps/core.xml → dc:title` | `Document title changed: "Master Services Agreement" → "Amended MSA"` |
| `author` | `docProps/core.xml → dc:creator` | `Original author changed: "Legal Team" → "External Counsel"` |
| `lastModifiedBy` | `docProps/core.xml → cp:lastModifiedBy` | `Last modified by changed: "Jane Smith" → "Bob Jones"` |
| `revision` | `docProps/core.xml → cp:revision` | `Revision number changed: "3" → "7"` |

All metadata `ChangeRecord` entries receive `significance: 'informational'` from the agent by default, unless the agent determines the change has material significance (e.g. a filename change that indicates a completely different contract type).

---

## 13. Suggested Chat Questions

`SuggestedQuestions.tsx` generates its chips dynamically from the `AnalysisResult`. Logic:

- If `riskFlags.length > 0` → include "What are the risk flags I should know about?"
- If any change has `significance: 'critical'` → include "Walk me through the critical changes"
- If `tmplV2` has more changes than `v1V2` → include "What's the net difference from the original template?"
- If any metadata changes exist → include "Were there any document metadata changes?"
- Always include: "Summarize what changed between V1 and V2" and "Which changes should I review first?"

---

## 14. Environment Variables

```
# .env.local (gitignored)
ANTHROPIC_API_KEY=sk-ant-...

# .env.example (committed)
ANTHROPIC_API_KEY=your_api_key_here
```

---

## 15. README Requirements

The `README.md` must include:

1. Project overview
2. Live demo link (placeholder)
3. Setup instructions with `cp .env.example .env.local` step
4. Architecture overview — emphasize the client-side diff + server-side agent split and the privacy model
5. Three-document comparison model explanation
6. Testing instructions: `npm run test`, `npm run test:coverage`, `npm run lint`, `npm run typecheck`
7. Deployment guide for Vercel with required env vars
8. Technical decisions section covering: deterministic detection, why AI is interpretation-only, privacy model, streaming chat

---

## 16. Testing Requirements

### Unit tests (Vitest)

| Module | Key test cases |
|---|---|
| `lcs.ts` | Identical, fully different, one empty, partial overlap |
| `documentDiff.ts` | Added, removed, modified, format-only, empty docs |
| `threeWayDiff.ts` | Correct view stamping, allChanges union, ID uniqueness |
| `inlineDiff.ts` | Single word, multi-word, full replacement, no change |
| `formatDiff.ts` | Style change, alignment change, bold added, no change |
| `metadataDiff.ts` | Filename change, title change, no change, all fields differ |

### Component tests (React Testing Library)

- `UploadZone`: renders, accepts `.docx`, rejects other types, shows filename
- `ChangeItem`: collapsed renders correctly, expands on click, shows significance badge
- `ChatPanel`: renders empty state, shows suggested questions, input sends message

---

## 17. Security & Privacy

- **No document storage.** Files are parsed in the browser. No document content is uploaded to any server.
- **Minimal API payload.** `/api/analyze` receives only structured change summaries, not raw document text. `/api/chat` receives structured context, not raw file content.
- **API key server-side only.** Never exposed to the client bundle.
- **Input validation.** Both API routes validate all payloads before forwarding to Anthropic.
- **Chat history is session-only.** No conversation is persisted anywhere.
- **No analytics or tracking in v1.**

---

## 18. Instructions for Claude Code

When building this project, follow these rules:

1. **Start with types.** Define all types in `lib/parser/types.ts`, `lib/diff/types.ts`, and `lib/agent/types.ts` first. No type should be defined inline in a component file.

2. **Build and test the diff engine before the UI.** Order: `lcs → documentDiff → threeWayDiff → inlineDiff → formatDiff → metadataDiff`. Write and run Vitest tests for each module before moving to the next.

3. **The LCS and diff modules must be pure functions.** No side effects, no `console.log`, no global state.

4. **API routes are thin proxies.** All prompt construction lives in `lib/agent/`. The route validates, calls the builder, calls Anthropic, returns. If a route exceeds ~80 lines, business logic has leaked into it — move it to `lib/agent/`.

5. **The chat route must stream.** Use `new Response(stream)` with `ReadableStream`. The `useChat` hook must consume the stream token by token. Do not buffer and return the full response.

6. **Components receive data via props or context — they never fetch.** All API calls live in hooks or API routes. Components are presentational.

7. **Use Tailwind utility classes only.** No custom CSS files. Inline `style={{}}` only for values that cannot be expressed as static Tailwind classes.

8. **Every exported function must have a JSDoc comment** with `@param` and `@returns`.

9. **Handle all error and empty states explicitly.** No blank screens. Three identical documents → show "No changes found" state. API failure → show graceful error with retry option.

10. **Run `npm run typecheck` and `npm run lint` before marking any phase complete.**

---

## 19. Phased Build Order

**Phase 1 — Foundation**
Initialize Next.js 14, TypeScript strict, Tailwind, ESLint, shadcn/ui, Vitest. Define all types.

**Phase 2 — Diff Engine**
`lcs.ts` → `inlineDiff.ts` → `formatDiff.ts` → `metadataDiff.ts` → `documentDiff.ts` → `threeWayDiff.ts`. Unit test each module.

**Phase 3 — Parser**
`docxParser.ts` → `metadataExtractor.ts` → manual test with real `.docx` files.

**Phase 4 — Agent layer**
`buildAnalysisPrompt.ts` → `buildChatContext.ts` → `/api/analyze/route.ts` → test with curl.

**Phase 5 — Chat API**
`/api/chat/route.ts` with streaming → test with curl + streaming client.

**Phase 6 — Hooks & state**
`useFileUpload.ts` → `useDocxAnalysis.ts` → `useChat.ts` → `store/analysisContext.tsx`.

**Phase 7 — UI**
Upload panel → progress → metrics → executive summary → change list → chat panel.

**Phase 8 — Polish & deploy**
Responsive audit, edge case states, README, Vercel deploy.

---

## 20. Definition of Done

- [ ] `npm run dev` starts with no errors
- [ ] `npm run typecheck` exits with code 0
- [ ] `npm run lint` exits with code 0
- [ ] `npm run test` passes with >80% coverage on `lib/`
- [ ] All three `.docx` files can be uploaded and analyzed end-to-end
- [ ] All three comparison views render correct diffs
- [ ] Filename and metadata changes appear as dedicated change records
- [ ] Agent annotations include significance tiers and citations on every change
- [ ] Executive summary renders at the top of results
- [ ] Chat panel accepts messages and returns streaming, context-aware responses
- [ ] Suggested questions appear when chat history is empty
- [ ] Identical documents across all three slots show "No changes found"
- [ ] Non-`.docx` files are rejected at upload with a user-visible error
- [ ] App is deployed and accessible via public URL
- [ ] README is complete

---

*End of PRD — DocDiff v2.0*
