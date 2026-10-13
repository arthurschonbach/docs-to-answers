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

export function deleteSampleDocuments(): void {
  db.prepare("DELETE FROM documents WHERE kind = 'sample'").run();
}

export function countChunks(): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM chunks").get() as {
    n: number;
  };
  return row.n;
}
