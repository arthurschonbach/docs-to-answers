import { getClient } from "./llm";

// Hosted embeddings through OpenRouter (same key as answering). Free model,
// multilingual; 1024 dims (it is Matryoshka-trained, so truncation is
// supported and keeps rows small).
export const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL ?? "nvidia/nemotron-3.5-embed-1b:free";
export const EMBEDDING_DIMS = 1024;

const BATCH = 64;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await getClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.slice(i, i + BATCH),
      dimensions: EMBEDDING_DIMS,
    });
    if (!res.data?.length) throw new Error("Embedding provider returned no data");
    out.push(...res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
  }
  return out;
}

export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}
