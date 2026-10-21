import Database from "better-sqlite3";
import {
  cosineSimilarity,
  deserializeEmbedding,
  embedText,
} from "./embeddings";

export const TOP_K = 6;
// Only drops clearly unrelated passages; deciding whether the excerpts
// answer the question is the model's job (it replies NOT_IN_DOCS).
export const SIMILARITY_FLOOR = 0.1;

export interface RankedChunk {
  chunkId: string;
  documentId: string;
  docName: string;
  text: string;
  score: number;
}

interface ChunkRow {
  id: string;
  document_id: string;
  text: string;
  embedding: Buffer;
  name: string;
}

/** Embed the question, rank all chunks by cosine, return top-k above floor. */
export async function retrieveChunks(
  db: Database.Database,
  question: string,
  topK: number = TOP_K,
  floor: number = SIMILARITY_FLOOR,
): Promise<RankedChunk[]> {
  const query = await embedText(question);
  const rows = db
    .prepare(
      `SELECT c.id, c.document_id, c.text, c.embedding, d.name
       FROM chunks c JOIN documents d ON d.id = c.document_id
       WHERE d.status = 'ready'`,
    )
    .all() as ChunkRow[];

  return rows
    .map((row) => ({
      chunkId: row.id,
      documentId: row.document_id,
      docName: row.name,
      text: row.text,
      score: cosineSimilarity(query, deserializeEmbedding(row.embedding)),
    }))
    .filter((c) => c.score >= floor)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function excerpt(text: string, max: number = 220): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max).trimEnd() + "…" : flat;
}
