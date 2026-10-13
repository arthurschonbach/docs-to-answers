# docs-to-answers — Spec

## 1. One-liner

Upload company docs (PDF / markdown / URLs) and ask questions. Every answer
carries **citations to the exact source chunks**, and the assistant says
"not in the docs" when nothing matches — instead of hallucinating.

Portfolio role: project #2 of 3. #1 (`meeting-to-actions`) shows *structured
extraction + streaming UX*. This one shows *retrieval*: chunking, embeddings,
vector search, grounded generation, and evals.

## 2. Non-goals (v1)

- No auth / multi-user. Single-user local app, like #1.
- No production vector DB. Brute-force cosine over sqlite is fine at
  portfolio scale (< 5k chunks); the spec names the production path
  (pgvector) in the README instead of building it.
- No agent / tool use. That's project #3.
- No chat memory across sessions beyond stored Q&A history per corpus.
- One corpus ("knowledge base") at a time in v1. Multi-corpus is a
  stretch goal.

## 3. Demo story (what a reviewer clicks)

1. Lands on `/`, sees an empty state + "Load sample docs" (a small fake
   company handbook, ~10 pages, ships with the repo).
2. Asks "What is the refund policy?" → answer streams in, with `[1] [2]`
   citation chips; clicking a chip scrolls to / highlights the source chunk.
3. Asks something unanswerable ("Who won the 1998 World Cup?") → clean
   abstention: "Not covered by these documents."
4. Opens `/evals` → table of ~15 fixed questions with pass/fail, overall
   score, model + embedding model used. This is the page that gets juniors
   hired.

## 4. Core flows

### 4.1 Ingest

- Inputs: file upload (`.pdf`, `.md`, `.txt`), paste URL (fetch + extract
  readable text).
- Pipeline per document: extract text → split into chunks (~500 tokens,
  ~50-token overlap, paragraph-aware) → embed each chunk → store.
- Progress UI: per-document status (queued → processing → ready / failed),
  chunk counts. Re-ingest replaces a document's chunks (no duplicates).
- Sample corpus button seeds the fake handbook in one click (no API key
  needed for the *seeded chunks* — see §9).

### 4.2 Ask

- Input: question box. Output: streamed markdown answer + citation chips.
- Retrieval: embed question → top-k (default k=6) chunks by cosine similarity
  → drop chunks below a similarity floor (default 0.25, tunable in UI? No —
  keep it a constant in v1, show it in README).
- Generation prompt: system instruction forces (a) answer ONLY from provided
  chunks, (b) cite chunk ids inline as `[n]`, (c) abstain when insufficient.
- Abstention path is a first-class UI state, not an error.
- Each Q&A pair is stored (question, answer, chunk ids, model, latency,
  timestamp) and listed under History per session.

### 4.3 Evals (`/evals`)

- Fixed set of ~15 questions in `data/eval-set.json`: answerable (with
  expected chunk ids), unanswerable (expect abstention), and adversarial
  (related-but-distinct topics that punish loose retrieval).
- "Run evals" executes all questions (no streaming, sequential to be kind
  to free-tier rate limits), then scores:
  - Answerable: expected chunk cited? (judged by id overlap, no LLM judge
    in v1 — deterministic and explainable.)
  - Unanswerable: did it abstain? (string-match on abstention marker.)
- Results table: per-question pass/fail + the answer + citations. Overall
  score header. Stored runs (keep last N) so the demo shows history.
- No API key? Eval run is disabled with the same honest notice as #1.

## 5. Pages

| Route      | Content |
|------------|---------|
| `/`        | Ask UI (question box, streamed answer, citations) + corpus status line. Empty state with "Load sample docs" when corpus is empty. |
| `/sources` | Document list: name, type, chunks, ingested date, delete. Upload form (file + URL). Per-doc processing status. |
| `/history` | Past Q&A pairs, newest first. Click to reopen (read-only recap with citations). |
| `/evals`   | Eval set overview, "Run evals", score header, results table, past runs. |

Header nav mirrors #1 (brand left, nav + theme + language right). Same
680px container, same token system. Bilingual EN/FR via the same i18n
pattern as #1 (dictionary file + cookie + provider).

## 6. Data model (sqlite, `data/docs.db`)

- `documents(id, name, kind, source_url, status, chunk_count, error, created_at)`
- `chunks(id, document_id, ord, text, embedding BLOB, tokens)`
- `qa_pairs(id, question, answer, cited_chunk_ids JSON, model, latency_ms, created_at)`
- `eval_runs(id, embedding_model, model, score, total, created_at)`
- `eval_results(id, run_id, question, expected, abstain_expected, answer, cited JSON, passed)`

Embeddings as serialized Float32Array blobs. Cosine computed in JS at query
time. Fine for the demo scale; README states the swap path.

## 7. API routes

- `POST /api/documents` — upload / URL ingest (returns doc id; processing
  inline, corpora are small).
- `DELETE /api/documents/[id]`
- `POST /api/ask` — SSE stream: `{type:"token"}…`, final `{type:"done",
  answer, citations:[{chunkId, docName, excerpt}]}` or `{type:"abstain"}`.
- `POST /api/evals/run` — runs full set, returns run id (progress via
  polling `GET /api/evals/runs` or simple sequential UI updates; keep it
  simple: streaming progress lines like #1's generation panel if cheap,
  else a spinner + final table).
- `POST /api/sample` — seeds the fake handbook (works without API key by
  shipping precomputed chunks + embeddings? See §9).

## 8. Retrieval + generation defaults

- Chunking: ~500 tokens, 50 overlap, never split mid-paragraph if avoidable.
- Embeddings: OpenRouter embedding model, env `EMBEDDING_MODEL`
  (default e.g. `qwen/qwen3-embedding-8b`; verify availability at build
  time, fall back pick documented in README).
- Chat model: same `OPENAI_MODEL` pattern as #1 (free-tier default).
- top-k = 6, similarity floor = 0.25. Both constants, documented.
- Citation format: model emits `[1]`-style markers mapped to the ordered
  chunk list in the prompt; server validates ids before storing.

## 9. No-key behavior (matches #1's honesty)

- Seeding sample docs, browsing sources, viewing past Q&A and eval history:
  all work without a key.
- Asking and running evals require a key. Without one, show the same style
  of notice #1 uses ("Set OPENAI_API_KEY…"), not a crash.
- Stretch: precomputed embeddings for the sample corpus so even Ask works
  keyless on samples. Decide at build time; default to "ask needs key".

## 10. Design system

Reuse #1 verbatim: CSS tokens (`--background/surface/foreground/muted/
border/accent/…`, indigo accent, dark mode via `data-theme`), shared
`ui.tsx` primitives (buttons h-9, SectionCard, Chip, EmptyState, ErrorBox),
680px container, header/footer pattern, theme + language toggles.
Copy the files, don't reinvent. Differences allowed only where RAG needs
them (citation chip variant, chunk highlight style).

## 11. Milestones (build order)

1. Scaffold (Next + sqlite + i18n + theme + sample handbook text).
2. Ingest: md/txt upload + chunk + embed + `/sources` UI.
3. PDF + URL ingest.
4. Ask: retrieval + SSE answer + citations UI on `/`.
5. History.
6. Evals: set + runner + `/evals` UI.
7. README + demo polish (screenshots, architecture diagram in ASCII,
   "production swap" notes, eval score badge).

## 12. Definition of done

- [ ] Sample corpus loads in one click, no key.
- [ ] Answerable question returns cited answer; click chip → source chunk.
- [ ] Off-topic question abstains cleanly.
- [ ] `/evals` runs green on the sample set and shows per-question detail.
- [ ] README lets a reviewer run + understand it in < 10 minutes.
- [ ] `npm run lint` + `npm run build` clean, no console errors.

## 13. Open questions (decide before/with milestone 1)

1. Embedding model availability on OpenRouter free tier — verify, else
   document a paid default + keep the interface swappable.
2. PDF parsing lib (`pdftotext` system dep vs pure-JS `pdfjs-dist`).
   Prefer pure-JS for one-command setup.
3. Precomputed sample embeddings (keyless demo) — nice-to-have, time-box it.
