import postgres from "postgres";
import { EMBEDDING_DIMS } from "./embeddings";
// Malformed ids in URLs would otherwise be a Postgres cast error (500).
import { isUuid } from "./visitor-id";

// Postgres (Neon in production) with pgvector. One shared database, so
// every serverless instance sees the same documents.
function createSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.");
  // prepare: false - Neon's pooled endpoint (PgBouncer) can't keep
  // prepared statements across transactions.
  return postgres(url, { prepare: false, max: 5, onnotice: () => {} });
}

const globalForDb = globalThis as unknown as {
  __dtaSql?: postgres.Sql;
  __dtaSchema?: Promise<void>;
};

function sql(): postgres.Sql {
  return (globalForDb.__dtaSql ??= createSql());
}

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  source_url TEXT,
  chunk_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding vector(${EMBEDDING_DIMS}) NOT NULL
);

CREATE TABLE IF NOT EXISTS qa_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  cited JSONB NOT NULL DEFAULT '[]',
  model TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embedding_model TEXT NOT NULL,
  model TEXT,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL,
  question TEXT NOT NULL,
  abstain_expected BOOLEAN NOT NULL,
  answer TEXT NOT NULL,
  cited JSONB NOT NULL DEFAULT '[]',
  passed BOOLEAN NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_run ON eval_results(run_id);

-- Rows belong to an anonymous visitor (see lib/visitor.ts). Rows created
-- before this column existed stay NULL: no one sees them, the purge
-- below removes them.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE qa_pairs ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE eval_runs ADD COLUMN IF NOT EXISTS visitor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_visitor ON documents(visitor_id);
CREATE INDEX IF NOT EXISTS idx_qa_pairs_visitor ON qa_pairs(visitor_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_visitor ON eval_runs(visitor_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window_start BIGINT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
);
`;

// Demo data is kept for RETENTION_DAYS, then purged (with its chunks and
// eval results, by cascade).
export const RETENTION_DAYS = 30;

const PURGE = `
DELETE FROM documents WHERE created_at < now() - interval '${RETENTION_DAYS} days' OR visitor_id IS NULL;
DELETE FROM qa_pairs WHERE created_at < now() - interval '${RETENTION_DAYS} days' OR visitor_id IS NULL;
DELETE FROM eval_runs WHERE created_at < now() - interval '${RETENTION_DAYS} days' OR visitor_id IS NULL;
`;

/** The database, with tables created on first use in this process. */
export async function db(): Promise<postgres.Sql> {
  // Purge runs once per process start, which on serverless is often enough.
  globalForDb.__dtaSchema ??= sql()
    .unsafe(SCHEMA)
    .then(() => sql().unsafe(PURGE))
    .then(() => undefined)
    .catch((error) => {
      globalForDb.__dtaSchema = undefined; // retry on the next request
      throw error;
    });
  await globalForDb.__dtaSchema;
  return sql();
}

/** pgvector literal: '[0.1,0.2,...]'. */
export function toVector(vec: ArrayLike<number>): string {
  return `[${Array.from(vec).join(",")}]`;
}

const iso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : value;

// ---- documents ------------------------------------------------------------

export interface DocumentRow {
  id: string;
  name: string;
  kind: string;
  source_url: string | null;
  chunk_count: number;
  created_at: string;
}

export async function listDocuments(visitor: string): Promise<DocumentRow[]> {
  const q = await db();
  const rows = await q<DocumentRow[]>`
    SELECT id, name, kind, source_url, chunk_count, created_at
    FROM documents WHERE visitor_id = ${visitor} ORDER BY created_at DESC`;
  return rows.map((r) => ({ ...r, created_at: iso(r.created_at) }));
}

export async function insertDocumentWithChunks(
  visitor: string,
  doc: { name: string; kind: string; sourceUrl: string | null },
  chunks: Array<{ text: string; embedding: ArrayLike<number> }>,
): Promise<string> {
  const q = await db();
  return q.begin(async (tx) => {
    const [{ id }] = await tx<{ id: string }[]>`
      INSERT INTO documents (visitor_id, name, kind, source_url, chunk_count)
      VALUES (${visitor}, ${doc.name}, ${doc.kind}, ${doc.sourceUrl}, ${chunks.length})
      RETURNING id`;
    const rows = chunks.map((c, ord) => ({
      document_id: id,
      ord,
      text: c.text,
      embedding: toVector(c.embedding),
    }));
    // Batches keep each statement well under Postgres' parameter limit.
    for (let i = 0; i < rows.length; i += 500) {
      await tx`INSERT INTO chunks ${tx(rows.slice(i, i + 500))}`;
    }
    return id;
  }) as Promise<string>;
}

export async function deleteDocument(visitor: string, id: string): Promise<void> {
  if (!isUuid(id)) return;
  const q = await db();
  await q`DELETE FROM documents WHERE id = ${id} AND visitor_id = ${visitor}`;
}

export async function countSampleDocuments(visitor: string): Promise<number> {
  const q = await db();
  const [{ n }] = await q<{ n: number }[]>`
    SELECT count(*)::int AS n FROM documents
    WHERE kind = 'sample' AND visitor_id = ${visitor}`;
  return n;
}

export async function deleteSampleDocuments(visitor: string): Promise<void> {
  const q = await db();
  await q`DELETE FROM documents WHERE kind = 'sample' AND visitor_id = ${visitor}`;
}

// ---- Q&A history ------------------------------------------------------------

export interface CitedChunk {
  n: number;
  chunkId: string;
  docName: string;
  excerpt: string;
}

export interface QaRow {
  id: string;
  question: string;
  answer: string;
  cited: CitedChunk[];
  model: string | null;
  latency_ms: number | null;
  created_at: string;
}

export async function saveQa(visitor: string, input: {
  question: string;
  answer: string;
  cited: CitedChunk[];
  model: string | null;
  latencyMs: number | null;
}): Promise<string> {
  const q = await db();
  const [{ id }] = await q<{ id: string }[]>`
    INSERT INTO qa_pairs (visitor_id, question, answer, cited, model, latency_ms)
    VALUES (${visitor}, ${input.question}, ${input.answer}, ${q.json(input.cited as never)},
            ${input.model}, ${input.latencyMs})
    RETURNING id`;
  return id;
}

export async function listQa(visitor: string): Promise<QaRow[]> {
  const q = await db();
  const rows = await q<QaRow[]>`
    SELECT * FROM qa_pairs WHERE visitor_id = ${visitor} ORDER BY created_at DESC`;
  return rows.map((r) => ({ ...r, created_at: iso(r.created_at) }));
}

export async function getQa(visitor: string, id: string): Promise<QaRow | undefined> {
  if (!isUuid(id)) return undefined;
  const q = await db();
  const [row] = await q<QaRow[]>`
    SELECT * FROM qa_pairs WHERE id = ${id} AND visitor_id = ${visitor}`;
  return row && { ...row, created_at: iso(row.created_at) };
}

export async function deleteQa(visitor: string, id: string): Promise<void> {
  if (!isUuid(id)) return;
  const q = await db();
  await q`DELETE FROM qa_pairs WHERE id = ${id} AND visitor_id = ${visitor}`;
}

// ---- evals -------------------------------------------------------------------

export interface EvalRunRow {
  id: string;
  embedding_model: string;
  model: string | null;
  score: number;
  total: number;
  created_at: string;
}

export interface EvalResultRow {
  id: string;
  question: string;
  abstain_expected: boolean;
  answer: string;
  cited: string[];
  passed: boolean;
}

/** Saves a finished run and its results in one transaction. */
export async function saveEvalRun(visitor: string, input: {
  embeddingModel: string;
  model: string | null;
  results: Array<{
    question: string;
    abstainExpected: boolean;
    answer: string;
    cited: string[];
    passed: boolean;
  }>;
}): Promise<string> {
  const q = await db();
  const score = input.results.filter((r) => r.passed).length;
  return q.begin(async (tx) => {
    const [{ id }] = await tx<{ id: string }[]>`
      INSERT INTO eval_runs (visitor_id, embedding_model, model, score, total)
      VALUES (${visitor}, ${input.embeddingModel}, ${input.model}, ${score}, ${input.results.length})
      RETURNING id`;
    await tx`INSERT INTO eval_results ${tx(
      input.results.map((r, ord) => ({
        run_id: id,
        ord,
        question: r.question,
        abstain_expected: r.abstainExpected,
        answer: r.answer,
        cited: JSON.stringify(r.cited),
        passed: r.passed,
      })),
    )}`;
    return id;
  }) as Promise<string>;
}

export async function listEvalRuns(visitor: string): Promise<EvalRunRow[]> {
  const q = await db();
  const rows = await q<EvalRunRow[]>`
    SELECT * FROM eval_runs WHERE visitor_id = ${visitor} ORDER BY created_at DESC`;
  return rows.map((r) => ({ ...r, created_at: iso(r.created_at) }));
}

export async function getEvalRun(
  visitor: string,
  id: string,
): Promise<EvalRunRow | undefined> {
  if (!isUuid(id)) return undefined;
  const q = await db();
  const [row] = await q<EvalRunRow[]>`
    SELECT * FROM eval_runs WHERE id = ${id} AND visitor_id = ${visitor}`;
  return row && { ...row, created_at: iso(row.created_at) };
}

export async function getEvalResults(runId: string): Promise<EvalResultRow[]> {
  const q = await db();
  return q<EvalResultRow[]>`
    SELECT id, question, abstain_expected, answer, cited, passed
    FROM eval_results WHERE run_id = ${runId} ORDER BY ord`;
}

