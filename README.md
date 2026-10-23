# Docs → Answers

Ask questions over your documents. Answers cite the exact source
passage, and off-topic questions get an honest abstention instead of a
hallucination.

![Ask with citations](docs/screenshots/shot-ask.png)

## Try it

1. `npm install && npm run dev` → http://localhost:3000
2. Click **Load sample handbook** (no API key needed).
3. Ask *"What is the refund policy?"* → streamed answer with `[1]`
   citation; click through to **Sources cited**.
4. Ask *"Who won the 1998 World Cup?"* → clean abstention.
5. Open **Evals** → **Run evals** → per-question pass/fail table.

![Sources](docs/screenshots/shot-sources.png)
![Eval run](docs/screenshots/shot-evals.png)

## What it does

- **Ingest**: upload `.pdf`, `.md`, `.txt` files or paste a URL.
  Per-document status and chunk counts.
- **Ask**: streamed answer with `[n]` citation chips linked to the
  source passages.
- **Abstention**: a first-class answer ("not covered by these
  documents"), not an error.
- **Sources**: document list with chunk counts, ingest date, delete.
- **History**: past questions with answers, citations, model and
  latency.
- **Evals**: 15 fixed questions (`data/eval-set.json`), graded
  without a judge — answerable ones need the right keywords and the
  expected source cited, unanswerable ones must abstain. Last recorded
  run: 15/15.
- English/French, light/dark.

## How it works

Documents are split into ~200-token passages (one per markdown section
when possible), embedded through OpenRouter
(`nvidia/nemotron-3.5-embed-1b:free`, 1024 dims) and stored in Postgres
with pgvector. A question is embedded the same way, pgvector returns the
6 nearest passages (above a 0.1 cosine floor), and the answer is
generated strictly from those passages. Unknown `[n]` markers are
dropped; a `NOT_IN_DOCS` reply becomes an abstention.

## Running it as a public demo

- **Per-visitor data**: a proxy gives each browser an anonymous id
  (httpOnly cookie) and every query is scoped to it, so visitors never
  see or delete each other's documents, history or eval runs. Demo data
  is purged after 30 days.
- **Rate limits**: fixed-window counters in Postgres, per IP and global
  (`src/lib/limits.ts`), on questions, imports and eval runs.
- **URL import**: only public addresses are fetched. Localhost, private
  ranges and cloud metadata are refused, and every redirect hop is
  re-checked (`src/lib/safe-fetch.ts`).

## Tests

`npm test` runs the unit tests (Vitest): chunking, citation parsing,
eval grading, address filtering, rate-limit windows. CI runs lint,
typecheck, tests and build on every push.

## Setup

1. **Database**: in the Vercel project, Storage → Create → Neon, and
   connect it. That sets `DATABASE_URL`; tables and the `vector`
   extension are created on first request. For local dev, pull it with
   `vercel env pull .env.local`.
2. **Key**: set `OPENAI_API_KEY` (an OpenRouter key) in Vercel and in
   `.env`. It is used for embeddings and answers; the defaults are free
   models.

| Variable | Default |
|----------|---------|
| `DATABASE_URL` | (required) |
| `OPENAI_API_KEY` | (required) |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` |
| `OPENAI_MODEL` | `nvidia/nemotron-3.5-super-vl:free` |
| `OPENAI_FALLBACK_MODEL` | `nvidia/nemotron-3.5-lightning:free` |
| `EMBEDDING_MODEL` | `nvidia/nemotron-3.5-embed-1b:free` |

```bash
npm install
npm run dev      # http://localhost:3000 (needs .env.local / .env)
npm run lint
npm test
npm run build
```
