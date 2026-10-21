import { db, toVector } from "./db";
import { embedText } from "./embeddings";

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

/** Embed the question and let pgvector rank chunks by cosine similarity. */
export async function retrieveChunks(
  question: string,
  topK: number = TOP_K,
  floor: number = SIMILARITY_FLOOR,
): Promise<RankedChunk[]> {
  const query = toVector(await embedText(question));
  const q = await db();
  const rows = await q<RankedChunk[]>`
    SELECT c.id AS "chunkId", c.document_id AS "documentId", d.name AS "docName",
           c.text, 1 - (c.embedding <=> ${query}::vector) AS score
    FROM chunks c JOIN documents d ON d.id = c.document_id
    ORDER BY c.embedding <=> ${query}::vector
    LIMIT ${topK}`;
  return rows.filter((r) => r.score >= floor);
}

export function excerpt(text: string, max: number = 220): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max).trimEnd() + "…" : flat;
}
