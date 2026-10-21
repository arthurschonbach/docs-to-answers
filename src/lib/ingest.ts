import { chunkText } from "./chunk";
import { insertDocumentWithChunks } from "./db";
import { embedTexts, serializeEmbedding } from "./embeddings";

const EMBED_BATCH = 32;

export interface IngestResult {
  documentId: string;
  chunks: number;
}

/**
 * Chunk → embed (batched) → store in one transaction. Throws on failure
 * and writes nothing, so a failed ingest never leaves partial data behind.
 */
export async function ingestDocument(input: {
  name: string;
  kind: string;
  sourceUrl?: string | null;
  text: string;
}): Promise<IngestResult> {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) throw new Error("empty");

  const vectors: Float32Array[] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    vectors.push(...(await embedTexts(batch.map((c) => c.text))));
  }

  const documentId = insertDocumentWithChunks(
    { name: input.name, kind: input.kind, sourceUrl: input.sourceUrl ?? null },
    chunks.map((c, i) => ({
      text: c.text,
      tokens: c.tokens,
      embedding: serializeEmbedding(vectors[i]),
    })),
  );
  return { documentId, chunks: chunks.length };
}
