# Docs → Answers

Ask questions over your documents. Grounded answers with citations, honest
abstentions when the docs don't cover the question.

Portfolio project #2 of 3 (see `SPEC.md`). #1 (`meeting-to-actions`) shows
structured extraction; this one shows retrieval: chunking, local embeddings,
vector search, grounded generation, and evals.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Keys

- Embeddings are **local** (Transformers.js, `all-MiniLM-L6-v2`) — no key,
  no cost, works offline. The model downloads once into `./data/models`.
- Asking questions and running evals need an OpenRouter key (free-tier
  keys work). Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
