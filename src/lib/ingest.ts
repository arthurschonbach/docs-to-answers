import { chunkText } from "./chunk";
import { insertDocumentWithChunks } from "./db";
import { embedTexts } from "./embeddings";

export interface IngestResult {
  documentId: string;
  chunks: number;
}

/**
 * Chunk → embed → store in one transaction. Throws on failure and writes
 * nothing, so a failed ingest never leaves partial data behind.
 */
export async function ingestDocument(visitor: string, input: {
  name: string;
  kind: string;
  sourceUrl?: string | null;
  text: string;
}): Promise<IngestResult> {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) throw new Error("empty");

  // The title gives every chunk its subject ("they" → the Houston Rockets).
  const vectors = await embedTexts(chunks.map((c) => `${input.name}\n\n${c.text}`));

  const documentId = await insertDocumentWithChunks(
    visitor,
    { name: input.name, kind: input.kind, sourceUrl: input.sourceUrl ?? null },
    chunks.map((c, i) => ({ text: c.text, embedding: vectors[i] })),
  );
  return { documentId, chunks: chunks.length };
}
