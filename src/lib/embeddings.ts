import path from "node:path";
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Local embeddings: no API key, no cost, works offline.
// The quantized model (~23MB) is fetched into ./data/models at build time
// (scripts/fetch-model.mjs) and shipped with the deployment. If it is
// missing, it downloads on first use: into ./data/models locally, or /tmp
// on hosts with a read-only filesystem (Vercel).
env.localModelPath = path.join(process.cwd(), "data", "models");
env.cacheDir = process.env.VERCEL
  ? path.join("/tmp", "dta-models")
  : path.join(process.cwd(), "data", "models");

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMS = 384;

let extractor: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    extractor = pipeline(
      "feature-extraction",
      EMBEDDING_MODEL,
      { dtype: "q8" },
    ) as unknown as Promise<FeatureExtractionPipeline>;
  }
  return extractor;
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  const pipe = await getExtractor();
  const output = await pipe(texts, { pooling: "mean", normalize: true });
  const rows = output.tolist() as number[][];
  return rows.map((row) => Float32Array.from(row));
}

export async function embedText(text: string): Promise<Float32Array> {
  const [vec] = await embedTexts([text]);
  return vec;
}

export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // inputs are L2-normalized
}

export function serializeEmbedding(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

export function deserializeEmbedding(blob: Buffer | Uint8Array): Float32Array {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  return new Float32Array(
    buf.buffer,
    buf.byteOffset,
    buf.byteLength / Float32Array.BYTES_PER_ELEMENT,
  );
}
