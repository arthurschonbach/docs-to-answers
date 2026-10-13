import { chunkText } from "./chunk";
import {
  addChunks,
  createDocument,
  setDocumentChunkCount,
  setDocumentStatus,
} from "./db";
import { embedTexts, serializeEmbedding } from "./embeddings";

const EMBED_BATCH = 32;

export interface IngestResult {
  documentId: string;
  chunks: number;
}

/** Shared ingest: chunk → embed (batched) → store. Throws on failure. */
export async function ingestDocument(input: {
  name: string;
  kind: string;
  sourceUrl?: string | null;
  text: string;
}): Promise<IngestResult> {
  const doc = createDocument({
    name: input.name,
    kind: input.kind,
    sourceUrl: input.sourceUrl ?? null,
  });
  try {
    const chunks = chunkText(input.text);
    if (chunks.length === 0) {
      throw new Error("empty");
    }
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const vectors = await embedTexts(batch.map((c) => c.text));
      addChunks(
        batch.map((c, j) => ({
          documentId: doc.id,
          ord: i + j,
          text: c.text,
          embedding: serializeEmbedding(vectors[j]),
          tokens: c.tokens,
        })),
      );
    }
    setDocumentChunkCount(doc.id, chunks.length);
    setDocumentStatus(doc.id, "ready");
    return { documentId: doc.id, chunks: chunks.length };
  } catch (error) {
    setDocumentStatus(
      doc.id,
      "failed",
      error instanceof Error ? error.message : "ingest failed",
    );
    throw error;
  }
}
