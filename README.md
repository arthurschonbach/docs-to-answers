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
  run: 14/15.
- English/French, light/dark.

## How it works

Documents are split into ~500-token passages with overlap, embedded
locally (`Xenova/all-MiniLM-L6-v2`, 384 dims, Transformers.js) and
stored in SQLite. A question is embedded the same way, the top 6
passages above a 0.25 similarity floor are retrieved by brute-force
cosine, and the answer is generated strictly from those passages.
Unknown `[n]` markers are dropped; an exact `NOT_IN_DOCS` reply
becomes an abstention.

## Setup

Embeddings run locally — no key, no cost, works offline. The model
downloads once into `./data/models` (git-ignored).

Answering and evals need a key: copy `.env.example` to `.env` and set
`OPENAI_API_KEY` (an OpenRouter key; the default model is a free one).
Without it, ingest, search and browse work; Ask and Evals show a
notice.

| Variable | Default |
|----------|---------|
| `OPENAI_API_KEY` | (required for Ask / Evals) |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` |
| `OPENAI_MODEL` | `nvidia/nemotron-3.5-super-vl:free` |
| `DATABASE_PATH` | `./data/docs.db` |

## Notes

- Storage is SQLite (`better-sqlite3`), single-user.
- On Vercel the database lives in `/tmp` (read-only filesystem), so
  history is ephemeral there — the sample handbook is always
  reloadable. First ingest on a cold instance downloads the ~90MB
  embedding model, so expect one slow call.

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```
