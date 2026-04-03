# DocDiff — Product Requirements Document

**Version:** 2.1  
**Prepared for:** Claude Code / CTO Review  
**Document type:** Full-stack web application PRD + engineering prompt  
**Changes from v2.0:** Progressive disclosure UX, clickable metric cards, accordion layout, internal consistency checking, riskFlags renamed to inconsistencies, chat grounding update

---

## 1. Executive Summary

DocDiff is a web application that allows users to upload three Microsoft Word (`.docx`) documents — a **Template**, a **Version 1 (V1)** contract, and a **Version 2 (V2)** contract — and receive a deterministic, accurate, AI-enhanced comparison report across all three.

The tool identifies content, formatting, and metadata changes at the paragraph and character level using a structural diffing algorithm. On top of that deterministic foundation, an **analysis agent** powered by Claude interprets each change, assigns a significance tier, flags internal document inconsistencies (e.g. a stated term length that does not match the span between start and end dates), and produces a concise factual summary.

Once the analysis is complete, users interact with the findings via an **in-app chat interface** — asking follow-up questions about specific changes without leaving the tool.

**The tool surfaces facts. It does not provide legal analysis, risk assessments, or recommendations of any kind.**

---

## 2. Problem Statement

Legal, compliance, and operations teams reviewing contract revisions face a three-way comparison problem: they need to understand what changed from the original template to V1, what changed from V1 to V2, and what has drifted from the template in the final version. Existing tools handle two-document diffs at best, provide no interpretive layer, and force teams to export findings into separate AI tools — breaking their workflow.

DocDiff solves all three stages in one tool, with an agent that reasons about factual significance and internal consistency, and a chat interface that lets users interrogate the analysis without switching context.

---

## 3. Goals & Success Criteria

| Goal | Success Metric |
|---|---|
| Accurate three-way change detection | Zero false negatives on paragraph-level text changes across all three comparison views |
| Metadata detection | Filename and document property changes surfaced as named change records |
| Internal consistency detection | Agent correctly identifies cases where the document contradicts itself (e.g. term length vs. date span) |
| No legal analysis | Agent output contains zero recommendations, risk assessments, or legal conclusions |
| Progressive disclosure UX | Users reach critical changes in under 10 seconds without scrolling |
| Chat grounding | Chat answers reference specific change locations; declines legal questions appropriately |
| Performance | Full analysis completes in under 20 seconds for documents up to 100 pages |
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
| **V1 → V2** | Version 1 | Version 2 | What changed between negotiation rounds? (default view) |
| **Template → V2** | Template | Version 2 | What is the net deviation from the template in the final version? |
| **Template → V1** | Template | Version 1 | What was changed from the master template in the first draft? |

The default active tab on load is **V1 → V2**. Each view is a full `DiffResult` computed independently. The agentic analysis and chat context are aware of all three views simultaneously.

---

## 6. Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Component library:** shadcn/ui
- **Markdown rendering:** react-markdown (chat responses only)
- **State management:** React Context + `useReducer`
- **File parsing (client-side):** mammoth.js, JSZip
- **Diff algorithm:** Custom Myers LCS implementation

### Backend / API
- **Runtime:** Next.js API Routes
- **AI layer:** Anthropic Claude API (`claude-sonnet-4-20250514`)
  - `/api/analyze` — agentic analysis pass
  - `/api/chat` — context-aware streaming chat
- **Environment secrets:** `ANTHROPIC_API_KEY` via `.env.local` (server-side only, never exposed to client)

### Infrastructure
- **Deployment:** Vercel
- **No database** — all state is in-memory per session

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
               │   annotations, tiers, summary,        │
               │   and inconsistencies[]               │
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
3. `/api/chat` receives structured context plus paragraph text for specifically referenced paragraphs — not entire documents.
4. The AI never performs change detection. It only interprets changes the diff engine has already found.
5. The AI does not provide legal analysis, risk assessments, or recommendations.

---

## 8. Project File Structure

```
docdiff/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       ├── analyze/
│       │   └── route.ts
│       └── chat/
│           └── route.ts
│
├── components/
│   ├── shell/
│   │   └── AppShell.tsx
│   ├── upload/
│   │   ├── UploadPanel.tsx
│   │   └── UploadZone.tsx
│   ├── analysis/
│   │   ├── AnalysisView.tsx
│   │   ├── MetricsDashboard.tsx          # Clickable cards, scroll to filtered list
│   │   ├── ComparisonTabs.tsx            # V1→V2 default active
│   │   ├── ExecutiveSummaryAccordion.tsx # Collapsed by default
│   │   ├── CriticalChangesAccordion.tsx  # Expanded by default
│   │   ├── AllChangesAccordion.tsx       # Collapsed by default
│   │   ├── InconsistenciesBlock.tsx      # Internal doc inconsistencies only
│   │   └── ChangeList/
│   │       ├── ChangeList.tsx
│   │       ├── ChangeItem.tsx
│   │       ├── DiffBlock.tsx
│   │       └── SignificanceBadge.tsx
│   └── chat/
│       ├── ChatPanel.tsx
│       ├── ChatMessage.tsx               # react-markdown for assistant messages
│       ├── ChatInput.tsx
│       └── SuggestedQuestions.tsx
│
├── lib/
│   ├── parser/
│   │   ├── docxParser.ts
│   │   ├── metadataExtractor.ts
│   │   └── types.ts
│   ├── diff/
│   │   ├── lcs.ts
│   │   ├── documentDiff.ts
│   │   ├── threeWayDiff.ts
│   │   ├── inlineDiff.ts
│   │   ├── formatDiff.ts
│   │   ├── metadataDiff.ts
│   │   └── types.ts
│   ├── agent/
│   │   ├── buildAnalysisPrompt.ts
│   │   ├── buildChatContext.ts
│   │   └── types.ts
│   └── utils/
│       ├── truncate.ts
│       └── htmlEscape.ts
│
├── hooks/
│   ├── useDocxAnalysis.ts
│   ├── useFileUpload.ts
│   └── useChat.ts
│
├── store/
│   └── analysisContext.tsx
│
├── types/
│   └── index.ts
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
├── .env.local                            # gitignored
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
  metadataField?: string;
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
  allChanges: ChangeRecord[];
}
```

### 9.3 Agent types — `lib/agent/types.ts`

```typescript
export interface ChangeAnnotation {
  changeId: string;
  significance: SignificanceTier;
  annotation: string;          // factual description of what changed — no legal analysis
  citation: string;            // e.g. "Article 2 — Term of Agreement"
  relatedChangeIds: string[];
}

export interface AnalysisResult {
  executiveSummary: string;    // 2-3 sentences: what categories changed and where
  priorityChanges: string[];   // change IDs ordered by significance
  inconsistencies: string[];   // factual contradictions within the document itself
  annotations: ChangeAnnotation[];
  generatedAt: string;
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

Reads `docProps/core.xml` from the JSZip archive. Extracts: `dc:title`, `dc:creator`, `cp:lastModifiedBy`, `dcterms:created`, `dcterms:modified`, `cp:revision`. The `filename` field comes from `File.name`. All fields are nullable. Pure async function.

### 10.2 `lib/diff/metadataDiff.ts`

Compares `DocMetadata` from two documents. Each differing field produces one `ChangeRecord` with `type: 'metadata'`. The `metadataField` property identifies the field name. Filename change summary format: `Filename changed: "original.docx" → "changed.docx"`. Returns empty array if no differences.

**Fields compared:** `filename`, `title`, `author`, `lastModifiedBy`, `revision`

### 10.3 `lib/diff/threeWayDiff.ts`

Accepts three `ParsedDoc` objects. Calls `documentDiff` for each pair, calls `metadataDiff` for each pair, stamps each `ChangeRecord` with its `view`, prefixes IDs with view name for uniqueness, builds `allChanges` union. Pure function.

### 10.4 `app/api/analyze/route.ts`

Receives `ThreeWayDiffResult` + document names. Validates payload. Caps total changes at 40 (prioritizing `tmplV2` → `v1V2` → `tmplV1` when trimming). Calls Claude with the agent prompt below. Parses response as JSON. Returns `AnalysisResult`.

**Agent system prompt:**

```
You are a document comparison agent. You have been given a structured diff of 
three Word documents: a Template, a Version 1 (V1), and a Version 2 (V2).

The diff was produced by a deterministic algorithm. Every change listed is a 
verified, real difference. Your job is to interpret the changes factually.

CRITICAL RULE: Do not provide legal analysis, risk assessments, recommendations, 
or legal conclusions of any kind. State only what the document says and whether 
it is internally consistent. You are a comparison tool, not a legal advisor.

For each change, assign a significance tier:
- "critical": the change directly affects a specific term of the agreement 
  (dates, amounts, party names, durations, quantities, defined terms) OR the 
  document contains an internal inconsistency where two parts contradict each 
  other on a factual matter (e.g. a stated term of 36 months where the start 
  and end dates actually span 48 months, a dollar amount stated differently in 
  two clauses, a party name that differs between sections)
- "moderate": a structural change to a section, clause added or removed, or a 
  numbered article was reorganized
- "minor": editorial rewording that does not change the factual content
- "informational": formatting, whitespace, metadata, or punctuation only

For each change write an annotation that:
- States what specifically changed (the exact text, date, number, or name)
- If there is an internal inconsistency, states both values and notes they 
  conflict — e.g. "The agreement states a 36-month term but the start date 
  (January 1, 2025) and end date (December 31, 2028) span 48 months."
- Does NOT assess risk, make recommendations, or draw legal conclusions

For the executive summary: 2-3 sentences stating what categories of changes 
were found and which articles or sections were affected. No recommendations.

For inconsistencies: list only factual contradictions found within the 
document itself — cases where the document states two different values for 
the same thing. If none, return an empty array.

Respond ONLY with valid JSON — no markdown, no preamble:
{
  "executiveSummary": "string",
  "priorityChanges": ["changeId"],
  "inconsistencies": ["string"],
  "annotations": [
    {
      "changeId": "string",
      "significance": "critical|moderate|minor|informational",
      "annotation": "string",
      "citation": "string",
      "relatedChangeIds": ["string"]
    }
  ]
}
```

### 10.5 `app/api/chat/route.ts`

Streaming endpoint. Accepts `message`, `history` (capped at 10), and `ChatContext`. Builds system prompt via `buildChatContext.ts`. Returns `ReadableStream`.

**Chat system prompt additions:**

```
You are a document analysis assistant for DocDiff. Answer questions about 
what changed between the documents based strictly on the analysis data provided.

When referencing a change, cite its location (e.g. "Article 2, Paragraph 3").
Keep responses to 3-5 sentences for simple questions. Use short bullet lists 
only when comparing multiple items. Do not use markdown headers. Do not repeat 
the question. Get straight to the answer. Use bold sparingly.

Do not provide legal guidance, risk assessments, or recommendations. Your only 
job is to clearly explain what text changed, where it changed, and how it 
differs between versions.

If the user asks for legal advice or risk analysis, respond exactly:
"DocDiff identifies document changes only and does not provide legal guidance. 
Please consult a qualified attorney for legal advice."
```

### 10.6 `lib/agent/buildAnalysisPrompt.ts`

Formats each `ChangeRecord` as a compact block: ID, view, type, location, summary, origText (truncated to 200 chars), changedText (truncated to 200 chars). Groups by view: `tmplV2` first, then `v1V2`, then `tmplV1`. Keeps total under ~6,000 tokens — trims formatting and minor changes first if over budget.

### 10.7 `lib/agent/buildChatContext.ts`

Builds compact system prompt context from `ChatContext`. Includes all `ChangeAnnotation` entries, change summaries with IDs and locations, executive summary, inconsistencies, and priority changes. Target: under 3,000 tokens.

---

## 11. Results Page Layout

The results page uses **progressive disclosure** — the most important information is visible immediately, secondary information is one click away.

### Layout order (top to bottom):

**1. Metric Cards**
Four cards in a horizontal row: Total Changes, Content, Formatting, Metadata. Each card is clickable — clicking sets the active filter and smoothly scrolls to the All Changes accordion. Hover state: subtle background lift + pointer cursor.

**2. Comparison Tabs**
Three tabs: `V1 → V2` (default active), `Template → V2`, `Template → V1`. Each shows a change count badge. Switching tabs re-renders all accordions below for that view.

**3. Executive Summary Accordion**
Default state: **collapsed**. Header: "Executive Summary" + chevron. Expanded content: the 2-3 sentence factual summary only. No inconsistencies, no priority change pills.

**4. Critical Changes Accordion**
Default state: **expanded**. Header: "Critical Changes (N)" where N = count of critical + moderate changes. If N = 0: "No critical changes found" — non-expandable. Expanded content: only critical and moderate `ChangeRecord` entries, sorted by significance descending.

Each change item shows:
- Location / citation
- One-line summary of what changed
- Before/after DiffBlock with clear "Before" and "After" labels
- No agent annotation block in the UI — the diff speaks for itself

**5. Inconsistencies Block**
Rendered only if `inconsistencies.length > 0`. A flat non-accordion block between Critical Changes and All Changes. Header: "Internal Inconsistencies (N)". Each inconsistency is one line of plain text describing the contradiction. No icons, no color coding — plain factual statements.

**6. All Changes Accordion**
Default state: **collapsed**. Header: "All Changes (N)". Expanded content: full unfiltered change list for the active tab including formatting and minor changes.

### Removed from UI (data retained in API response):
- Risk flags section
- "Review These First" change ID pills
- FilterBar multi-option toggle

### Change item visual treatment:
- Critical: 3px left border (red token), very light red background
- Moderate: 3px left border (amber token), no background change
- Minor / informational: no border, muted summary text

---

## 12. Chat Panel

Available after analysis completes. Fixed right-side panel, collapsible.

**Suggested questions** (shown when thread is empty, generated from analysis result):
- "What changed between V1 and V2?" — always shown
- "Which changes should I review first?" — always shown
- "Were there any internal inconsistencies found?" — shown if `inconsistencies.length > 0`
- "What changed in [most-changed article]?" — shown if a specific article is identifiable
- "Were there any metadata changes?" — shown if metadata changes exist

**Message rendering:**
- User messages: plain text
- Assistant messages: rendered via `react-markdown`
  - Paragraphs: 1rem, line-height 1.6
  - Bold: font-weight 500
  - Lists: standard left-aligned, 0.5rem gap
  - No h1/h2/h3 — headings render as bold paragraphs
  - Code: monospace, light background, rounded corners
- Streaming: tokens render in real time (typewriter effect)
- "Clear conversation" button in panel header
- `Enter` to send, `Shift+Enter` for newline

---

## 13. Metadata Change Detection

Metadata changes are first-class `ChangeRecord` entries. Fields compared:

| Field | Source | Example summary |
|---|---|---|
| `filename` | `File.name` | `Filename changed: "MSA_Template.docx" → "MSA_Client_Final.docx"` |
| `title` | `docProps/core.xml → dc:title` | `Document title changed: "Master Services Agreement" → "Amended MSA"` |
| `author` | `docProps/core.xml → dc:creator` | `Original author changed: "Legal Team" → "External Counsel"` |
| `lastModifiedBy` | `docProps/core.xml → cp:lastModifiedBy` | `Last modified by changed: "Jane Smith" → "Bob Jones"` |
| `revision` | `docProps/core.xml → cp:revision` | `Revision number changed: "3" → "7"` |

All metadata changes receive `significance: 'informational'` unless the agent determines otherwise.

---

## 14. Internal Consistency Checking

The agent checks for factual contradictions within the document itself. This is not legal analysis — it is arithmetic and cross-reference checking against the document's own stated values.

**Examples of what the agent should flag:**
- A stated term length (e.g. "36 months") that does not match the span between the stated start and end dates
- A dollar amount referenced differently in two clauses
- A party name that differs between sections
- A section number referenced that does not exist in the document
- A quantity stated differently in two places

**Examples of what the agent must NOT flag:**
- Whether a clause is unusual or favorable
- Whether a term creates legal risk
- What a party should negotiate
- Any recommendation or legal conclusion

Inconsistencies are surfaced in `AnalysisResult.inconsistencies: string[]` and rendered in the `InconsistenciesBlock` component only when present.

---

## 15. Environment Variables

```
# .env.local (gitignored)
ANTHROPIC_API_KEY=sk-ant-...

# .env.example (committed)
ANTHROPIC_API_KEY=your_api_key_here
```

The `ANTHROPIC_API_KEY` is server-side only. Never use the `NEXT_PUBLIC_` prefix on this variable.

---

## 16. README Requirements

1. Project overview
2. Live demo link
3. Setup: `npm install`, `cp .env.example .env.local`, add key, `npm run dev`
4. Architecture overview — client-side diff, server-side agent, privacy model
5. Three-document comparison model explanation
6. Note on scope: the tool identifies changes and internal inconsistencies only — it does not provide legal analysis
7. Testing: `npm run test`, `npm run test:coverage`, `npm run lint`, `npm run typecheck`
8. Vercel deployment guide

---

## 17. Testing Requirements

### Unit tests (Vitest)

| Module | Key test cases |
|---|---|
| `lcs.ts` | Identical, fully different, one empty, partial overlap |
| `documentDiff.ts` | Added, removed, modified, format-only, empty docs |
| `threeWayDiff.ts` | Correct view stamping, allChanges union, ID uniqueness |
| `inlineDiff.ts` | Single word, multi-word, full replacement, no change |
| `formatDiff.ts` | Style change, alignment, bold added, no change |
| `metadataDiff.ts` | Filename change, title change, no change, all fields differ |

### Component tests (React Testing Library)
- `UploadZone`: renders, accepts `.docx`, rejects other types, shows filename
- `ChangeItem`: collapsed renders, expands on click, correct significance border
- `ChatPanel`: empty state, suggested questions render, input sends message

---

## 18. Security & Privacy

- **No document storage.** Files parsed in browser. No document content uploaded to any server.
- **Minimal API payload.** `/api/analyze` receives structured change summaries only. `/api/chat` receives structured context only.
- **API key server-side only.** Never use `NEXT_PUBLIC_` prefix. Never expose to client bundle.
- **Input validation.** Both routes validate all payloads before forwarding to Anthropic.
- **Chat history session-only.** No conversation persisted anywhere.
- **No analytics or tracking.**

---

## 19. Instructions for Claude Code

1. **Start with types.** All types defined in `lib/parser/types.ts`, `lib/diff/types.ts`, `lib/agent/types.ts` first. No inline type definitions in components.

2. **Diff engine before UI.** Order: `lcs → documentDiff → threeWayDiff → inlineDiff → formatDiff → metadataDiff`. Test each before moving on.

3. **LCS and diff modules must be pure functions.** No side effects, no console.log, no global state.

4. **API routes are thin proxies.** All prompt construction in `lib/agent/`. If a route exceeds ~80 lines, business logic has leaked — move it.

5. **Chat route must stream.** Use `new Response(stream)` with `ReadableStream`. Hook consumes token by token.

6. **Components receive data via props or context.** No fetching in components. All API calls in hooks or routes.

7. **Tailwind only.** No custom CSS files. Inline `style={{}}` only for values that cannot be static Tailwind classes.

8. **Every exported function gets a JSDoc comment** with `@param` and `@returns`.

9. **All error and empty states handled explicitly.** No blank screens. Identical documents → "No changes found". Non-.docx → inline error at upload zone.

10. **`npm run typecheck` and `npm run lint` pass before any phase is marked complete.**

---

## 20. Phased Build Order

**Phase 1 — Foundation**
Next.js 14, TypeScript strict, Tailwind, ESLint, shadcn/ui, react-markdown, Vitest. Define all types.

**Phase 2 — Diff Engine**
`lcs → inlineDiff → formatDiff → metadataDiff → documentDiff → threeWayDiff`. Unit test each.

**Phase 3 — Parser**
`docxParser → metadataExtractor`. Manual test with real `.docx` files.

**Phase 4 — Agent layer**
`buildAnalysisPrompt → buildChatContext → /api/analyze`. Test with curl.

**Phase 5 — Chat API**
`/api/chat` with streaming. Test with curl.

**Phase 6 — Hooks & state**
`useFileUpload → useDocxAnalysis → useChat → analysisContext`.

**Phase 7 — UI**
Upload panel → progress → metric cards (clickable) → tabs → executive summary accordion → critical changes accordion → inconsistencies block → all changes accordion → chat panel.

**Phase 8 — Polish & deploy**
Responsive audit, edge case states, README, Vercel deploy.

---

## 21. Definition of Done

- [ ] `npm run dev` starts with no errors
- [ ] `npm run typecheck` exits code 0
- [ ] `npm run lint` exits code 0
- [ ] `npm run test` passes with >80% coverage on `lib/`
- [ ] All three `.docx` files upload and analyze end-to-end
- [ ] Default active tab is V1 → V2
- [ ] Metric cards are clickable and scroll to filtered change list
- [ ] Executive summary accordion is collapsed by default
- [ ] Critical changes accordion is expanded by default
- [ ] Only critical and moderate changes appear in the critical changes accordion
- [ ] Internal inconsistencies block renders when inconsistencies are found
- [ ] All changes accordion is collapsed by default
- [ ] Filename and metadata changes appear as dedicated change records
- [ ] Chat panel renders assistant messages with react-markdown
- [ ] Chat declines legal questions with the specified response
- [ ] Identical documents show "No changes found"
- [ ] Non-.docx files rejected at upload with visible error
- [ ] App deployed and accessible via public URL
- [ ] README complete

---

*End of PRD — DocDiff v2.1*
