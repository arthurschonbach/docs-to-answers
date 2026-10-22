import { getClient } from "./llm";

// Hosted embeddings through OpenRouter (same key as answering). Free model,
// multilingual; 1024 dims (it is Matryoshka-trained, so truncation is
// supported and keeps rows small).
export const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL ?? "nvidia/nemotron-3.5-embed-1b:free";
export const EMBEDDING_DIMS = 1024;

const BATCH = 64;

// The free provider fails most calls at random with a fast 502 (measured
// ~70%), so the SDK's 2 retries aren't enough. Retry more here; failures
// come back in ~200ms, so this stays quick. Switching to a fallback model
// isn't an option: its vectors wouldn't match the ones already stored.
const ATTEMPTS = 10;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(error: unknown): boolean {
  const status = (error as { status?: number }).status;
  return status === undefined || status === 429 || status >= 500;
}

async function embedBatch(input: string[]): Promise<number[][]> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await getClient().embeddings.create(
        { model: EMBEDDING_MODEL, input, dimensions: EMBEDDING_DIMS },
        { maxRetries: 0 },
      );
      if (!res.data?.length) throw new Error("Embedding provider returned no data");
      return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    } catch (error) {
      if (attempt === ATTEMPTS || !isRetryable(error)) throw error;
      await wait(Math.min(250 * attempt, 1500));
    }
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    out.push(...(await embedBatch(texts.slice(i, i + BATCH))));
  }
  return out;
}

export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}
