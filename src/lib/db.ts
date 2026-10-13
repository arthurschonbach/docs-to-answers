import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "docs.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding BLOB NOT NULL,
  tokens INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS qa_pairs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  cited_chunk_ids TEXT NOT NULL DEFAULT '[]',
  model TEXT,
  latency_ms INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eval_runs (
  id TEXT PRIMARY KEY,
  embedding_model TEXT NOT NULL,
  model TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eval_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  abstain_expected INTEGER NOT NULL DEFAULT 0,
  answer TEXT NOT NULL,
  cited TEXT NOT NULL DEFAULT '[]',
  passed INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_run ON eval_results(run_id);
`;

function createDb(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const instance = new Database(DB_PATH);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  instance.exec(SCHEMA);
  return instance;
}

const globalForDb = globalThis as unknown as { __dtaDb?: Database.Database };
const db = globalForDb.__dtaDb ?? (globalForDb.__dtaDb = createDb());

export function getDb(): Database.Database {
  return db;
}

export interface DocumentRow {
  id: string;
  name: string;
  kind: string;
  source_url: string | null;
  status: string;
  chunk_count: number;
  error: string | null;
  created_at: string;
}

export function listDocuments(): DocumentRow[] {
  return db
    .prepare("SELECT * FROM documents ORDER BY created_at DESC")
    .all() as DocumentRow[];
}

export function createDocument(input: {
  name: string;
  kind: string;
  sourceUrl: string | null;
}): DocumentRow {
  const now = new Date().toISOString();
  const row: DocumentRow = {
    id: crypto.randomUUID(),
    name: input.name,
    kind: input.kind,
    source_url: input.sourceUrl,
    status: "processing",
    chunk_count: 0,
    error: null,
    created_at: now,
  };
  db.prepare(
    "INSERT INTO documents (id, name, kind, source_url, status, chunk_count, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    row.id,
    row.name,
    row.kind,
    row.source_url,
    row.status,
    row.chunk_count,
    row.error,
    row.created_at,
  );
  return row;
}

export function setDocumentStatus(
  id: string,
  status: string,
  error: string | null = null,
): void {
  db.prepare("UPDATE documents SET status = ?, error = ? WHERE id = ?").run(
    status,
    error,
    id,
  );
}

export function setDocumentChunkCount(id: string, count: number): void {
  db.prepare("UPDATE documents SET chunk_count = ? WHERE id = ?").run(
    count,
    id,
  );
}

export function addChunks(
  chunks: Array<{
    documentId: string;
    ord: number;
    text: string;
    embedding: Buffer;
    tokens: number;
  }>,
): void {
  const stmt = db.prepare(
    "INSERT INTO chunks (id, document_id, ord, text, embedding, tokens) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertMany = db.transaction(
    (rows: typeof chunks) => {
      for (const c of rows) {
        stmt.run(crypto.randomUUID(), c.documentId, c.ord, c.text, c.embedding, c.tokens);
      }
    },
  );
  insertMany(chunks);
}

export function deleteDocument(id: string): void {
  db.prepare("DELETE FROM documents WHERE id = ?").run(id);
}

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
  cited_chunk_ids: string;
  model: string | null;
  latency_ms: number | null;
  created_at: string;
}

export function saveQa(input: {
  question: string;
  answer: string;
  cited: CitedChunk[];
  model: string | null;
  latencyMs: number | null;
}): string {
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO qa_pairs (id, question, answer, cited_chunk_ids, model, latency_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    input.question,
    input.answer,
    JSON.stringify(input.cited),
    input.model,
    input.latencyMs,
    new Date().toISOString(),
  );
  return id;
}

export function listQa(): QaRow[] {
  return db
    .prepare("SELECT * FROM qa_pairs ORDER BY created_at DESC")
    .all() as QaRow[];
}

export function getQa(id: string): QaRow | undefined {
  return db.prepare("SELECT * FROM qa_pairs WHERE id = ?").get(id) as
    | QaRow
    | undefined;
}

export function parseCited(value: string): CitedChunk[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is CitedChunk =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as CitedChunk).docName === "string",
    );
  } catch {
    return [];
  }
}

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
  run_id: string;
  question: string;
  abstain_expected: number;
  answer: string;
  cited: string;
  passed: number;
}

export function createEvalRun(input: {
  embeddingModel: string;
  model: string | null;
  total: number;
}): string {
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO eval_runs (id, embedding_model, model, score, total, created_at) VALUES (?, ?, ?, 0, ?, ?)",
  ).run(id, input.embeddingModel, input.model, input.total, new Date().toISOString());
  return id;
}

export function addEvalResult(input: {
  runId: string;
  question: string;
  abstainExpected: boolean;
  answer: string;
  cited: string[];
  passed: boolean;
}): void {
  db.prepare(
    "INSERT INTO eval_results (id, run_id, question, abstain_expected, answer, cited, passed) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    crypto.randomUUID(),
    input.runId,
    input.question,
    input.abstainExpected ? 1 : 0,
    input.answer,
    JSON.stringify(input.cited),
    input.passed ? 1 : 0,
  );
}

export function finishEvalRun(id: string, score: number): void {
  db.prepare("UPDATE eval_runs SET score = ? WHERE id = ?").run(score, id);
}

export function listEvalRuns(): EvalRunRow[] {
  return db
    .prepare("SELECT * FROM eval_runs ORDER BY created_at DESC")
    .all() as EvalRunRow[];
}

export function getEvalRun(id: string): EvalRunRow | undefined {
  return db.prepare("SELECT * FROM eval_runs WHERE id = ?").get(id) as
    | EvalRunRow
    | undefined;
}

export function getEvalResults(runId: string): EvalResultRow[] {
  return db
    .prepare("SELECT * FROM eval_results WHERE run_id = ? ORDER BY rowid")
    .all(runId) as EvalResultRow[];
}

export function countSampleDocuments(): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM documents WHERE kind = 'sample' AND status = 'ready'")
    .get() as { n: number };
  return row.n;
}

export function deleteSampleDocuments(): void {
  db.prepare("DELETE FROM documents WHERE kind = 'sample'").run();
}

export function countChunks(): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM chunks").get() as {
    n: number;
  };
  return row.n;
}
