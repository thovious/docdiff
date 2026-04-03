# DocDiff

A web application for comparing three Microsoft Word (`.docx`) documents — a **Template**, a **Version 1**, and a **Version 2** — with deterministic, structural accuracy. DocDiff surfaces every content, formatting, and metadata change across all three comparison views, then uses an AI agent to interpret significance, assign risk tiers, and generate a plain-English executive summary. An in-app chat interface lets you interrogate the findings without switching context.

**Live demo:** _coming soon — deploy instructions below_

---

## Setup

```bash
git clone https://github.com/thovious/docdiff.git
cd docdiff
npm install
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Three-Document Comparison Model

DocDiff produces **three independent comparison views**, each fully diffed:

| View | Left | Right | Purpose |
|---|---|---|---|
| **Template → V2** | Template | Version 2 | Net deviation from the original template in the final version |
| **V1 → V2** | Version 1 | Version 2 | What changed between negotiation rounds |
| **Template → V1** | Template | Version 1 | What was changed from the template in the first draft |

Each view is a complete `DiffResult` computed independently. The UI lets you switch views via tabs without re-running analysis.

---

## Architecture

```
Browser
  ├── JSZip + DOMParser  →  ParagraphNode[] × 3    (OOXML structural parse)
  ├── mammoth.js         →  rawText × 3             (plain-text)
  ├── metadataExtractor  →  DocMetadata × 3         (filename, author, revision…)
  └── threeWayDiff engine →  ThreeWayDiffResult
        ├── documentDiff × 3   (paragraph-level LCS diff)
        ├── inlineDiff         (word-level segments for modified paragraphs)
        ├── formatDiff         (style / indent / font changes)
        └── metadataDiff       (filename, title, author, revision)

Server (Next.js API Routes)
  ├── POST /api/analyze
  │     ├── Validates + caps payload (≤ 40 changes, structured summaries only)
  │     ├── Calls Claude (single-pass agent)
  │     └── Returns AnalysisResult { executiveSummary, annotations, riskFlags, priorityChanges }
  └── POST /api/chat
        ├── Builds compact context (≤ 3,000 tokens)
        ├── Calls Claude with streaming enabled
        └── Returns ReadableStream (token-by-token)
```

**Key design decisions:**

1. **All parsing and diffing runs in the browser.** No document content is ever sent to any server. The API routes receive only structured change summaries — never raw document text.
2. **The AI never performs change detection.** Claude interprets changes the diff engine has already found. Every change surfaced is a verified structural difference.
3. **Chat is grounded.** The `/api/chat` context contains only the diff summary and agent annotations — not general knowledge about the topic.

---

## Privacy Model

DocDiff is designed for confidential documents:

- Files are parsed in the browser using the Web File API.
- `/api/analyze` receives only structured `ChangeRecord` summaries (IDs, types, locations, short summaries). No paragraph text is included.
- `/api/chat` receives structured context (change summaries + annotations). Raw document text is never sent.
- No document content is stored anywhere. All state is in-memory per session.
- Chat history is session-only — nothing is persisted.

---

## Scripts

```bash
npm run dev            # Start local dev server (http://localhost:3000)
npm run build          # Production build
npm run typecheck      # tsc --noEmit (type check without emitting)
npm run lint           # ESLint
npm run test           # Vitest unit tests
npm run test:coverage  # Coverage report
```

---

## Testing

Unit test coverage targets `lib/` — the deterministic diff engine:

| Module | Key test cases |
|---|---|
| `lib/diff/lcs.ts` | Myers algorithm, backtrack, all edge cases |
| `lib/diff/documentDiff.ts` | Added / removed / modified / format-only, count integrity, view stamping |
| `lib/diff/inlineDiff.ts` | Word-level segments, empty inputs, adjacent merging |
| `lib/diff/formatDiff.ts` | All 11 formatting properties, multi-change detection |
| `lib/diff/metadataDiff.ts` | Filename, title, author, revision changes; null handling |
| `lib/diff/threeWayDiff.ts` | View stamping, allChanges union, ID uniqueness |

```bash
npm run test           # Run all tests
npm run test:coverage  # Coverage report (target: >80% on lib/)
```

---

## Deployment (Vercel)

1. Push the repository to GitHub (already done).
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Add the required environment variable:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key — obtain from [console.anthropic.com](https://console.anthropic.com) |

4. Deploy. Vercel detects Next.js automatically — no build configuration needed.

> **Note:** The `/api/chat` route uses streaming (`ReadableStream`). This is fully supported on Vercel's Node.js and Edge runtimes.

---

## Technical Decisions

### Deterministic change detection

The diff engine implements the **Myers Longest Common Subsequence algorithm** over the paragraph array extracted from the Word XML (`word/document.xml`). This guarantees:

- **Zero false negatives** — if a paragraph changed, it will be detected.
- **Reproducible results** — the same files always produce the same output.
- **No hallucination risk in detection** — Claude is invoked only for interpretation, never detection.

### AI is interpretation-only

The agent receives a structured list of already-detected changes and answers four questions for each: *how significant is this? why does it matter? where exactly? what else is related?* It cannot add or remove changes from the list.

### Why OOXML parsing over mammoth for structure

mammoth.js converts `.docx` to HTML/plain-text and discards structural metadata (paragraph styles, indentation, run-level formatting). DocDiff needs that metadata to detect formatting-only changes, so it parses `word/document.xml` directly via JSZip + DOMParser. mammoth is used only for `rawText` extraction (plain-text context).

### Streaming chat

`/api/chat` returns a `ReadableStream` and the `useChat` hook consumes it token by token, appending each chunk to the last assistant message. This produces a typewriter effect and lets the UI render the response before it's complete — important for longer answers about complex diffs.

### Why Myers LCS instead of a library

- **Bundle size:** no external diff library in the client bundle.
- **Control:** the algorithm is tailored to paragraph arrays (not line-based text files). The backtrack step produces edit pairs that collapse adjacent `removed` + `added` ops into a single `modified` record with an inline word diff.
- **Testability:** pure functions with no side effects are trivially unit-testable.
