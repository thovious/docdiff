# DocDiff

A web application for comparing two Microsoft Word (`.docx`) documents with deterministic, byte-level accuracy. DocDiff surfaces every content and formatting change at the paragraph and character level using a structural diffing algorithm, then uses an LLM to generate a plain-English summary of the findings.

**Live demo:** _coming soon — deploy instructions below_

---

## Setup

```bash
git clone <repo-url>
cd docdiff
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Architecture

```
Browser
  ├── JSZip + DOMParser  →  ParagraphNode[]   (OOXML structural parse)
  ├── mammoth.js         →  rawText            (plain-text for AI context)
  └── Myers LCS engine   →  ChangeRecord[]     (deterministic diff)
        ├── documentDiff   (paragraph-level edit ops)
        ├── inlineDiff     (word-level segments)
        └── formatDiff     (style / indent / font changes)

Server (Next.js API Route)
  └── POST /api/summarize
        ├── Validates + caps payload (≤ 20 change summaries)
        └── Anthropic API  →  plain-English InsightSummary
```

**Key design decision:** All document parsing and diffing runs entirely in the browser using the Web File API. No document content is ever sent to any server. The server-side API route receives only a structured, anonymised list of change summaries — never raw document text. This makes the tool safe for confidential documents.

---

## Scripts

```bash
npm run dev           # Start local dev server (http://localhost:3000)
npm run build         # Production build
npm run test          # Vitest unit tests
npm run test:coverage # Coverage report
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
```

---

## Deployment (Vercel)

1. Push the repository to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Add the required environment variable:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key — obtain from [console.anthropic.com](https://console.anthropic.com) |

4. Deploy. Vercel detects Next.js automatically — no build configuration required.

---

## Technical decisions

### Why is change detection deterministic, not AI-based?

The diff engine implements the **Myers Longest Common Subsequence algorithm** over the paragraph array extracted from the Word XML (`word/document.xml`). This guarantees:

- **Zero false negatives** on paragraph-level text changes — if a word changed, it will be detected.
- **Reproducible results** — running the same two files always produces the same output.
- **No hallucination risk** in the detection layer — Claude is invoked only for the plain-English summary, never for the detection itself.

The AI summary layer is explicitly non-authoritative. It characterises what the algorithm already found; it does not perform independent analysis.

### Why does document content stay client-side?

Parsing and diffing run in the browser via the [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API). The server-side `/api/summarize` route receives only:

```json
{
  "changes": [{ "type": "modified", "category": "content", "summary": "..." }],
  "totalChanges": 7,
  "contentChanges": 5,
  "formattingChanges": 2
}
```

Raw paragraph text never leaves the browser. This is important for legal and compliance use cases where document content is confidential.

### Why Myers LCS over a library?

- **Bundle size**: no external diff library in the client bundle.
- **Control**: the diff algorithm is tailored to paragraph arrays, not line-based text files. The backtrack step is customised to produce edit pairs that can be merged into `modified` records (adjacent `removed`+`added` pairs become a single change with an inline word diff).
- **Testability**: the pure-function implementation (`lcs.ts`, `documentDiff.ts`) is trivially unit-testable with Vitest.

### Why OOXML parsing instead of mammoth for structure?

mammoth.js converts `.docx` to HTML/plain-text and intentionally discards structural metadata (paragraph styles, indent values, run-level formatting). DocDiff needs that metadata to detect formatting-only changes, so it parses `word/document.xml` directly via JSZip + DOMParser using the `http://schemas.openxmlformats.org/wordprocessingml/2006/main` namespace. mammoth is used solely for `rawText` extraction.

---

## Testing

```bash
npm run test
```

Unit test coverage targets `lib/` — the deterministic diff engine:

| Module | Coverage |
|---|---|
| `lib/diff/lcs.ts` | Myers algorithm, backtrack, all edge cases |
| `lib/diff/documentDiff.ts` | Add / remove / modify / format detection, count integrity |
| `lib/diff/inlineDiff.ts` | Word-level segment generation, empty inputs |
| `lib/diff/formatDiff.ts` | All 11 formatting properties, multi-change detection |

No E2E tests are included for v1. The deterministic core is fully covered by unit tests; the UI layer is tested manually with the included `test-original.docx` / `test-changed.docx` files.
