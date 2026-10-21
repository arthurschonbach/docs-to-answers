import OpenAI from "openai";
import type { RankedChunk } from "./retrieval";

const BASE_URL =
  process.env.OPENAI_BASE_URL ?? "https://openrouter.ai/api/v1";
const MODEL =
  process.env.OPENAI_MODEL ?? "nvidia/nemotron-3.5-super-vl:free";

// Tried by OpenRouter when the primary model's provider errors (free-tier
// providers return 502s regularly).
const FALLBACK_MODEL =
  process.env.OPENAI_FALLBACK_MODEL ?? "nvidia/nemotron-3.5-lightning:free";

export const ABSTAIN_MARKER = "NOT_IN_DOCS";

/** Models sometimes add punctuation or a sentence around the marker. */
export function isAbstain(answer: string): boolean {
  return answer.trim() === "" || answer.includes(ABSTAIN_MARKER);
}

export function hasChatKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function chatModel(): string {
  return MODEL;
}

let client: OpenAI | null = null;
export function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env.");
  }
  client ??= new OpenAI({
    apiKey,
    baseURL: BASE_URL,
    // Free-tier providers sometimes hang or rate-limit: fail fast and let
    // the SDK retry 408/429/5xx with backoff.
    timeout: 30_000,
    maxRetries: 2,
  });
  return client;
}

const SYSTEM_PROMPT = `You answer questions using ONLY the provided document excerpts.

Rules:
- Every factual claim must be supported by an excerpt. Cite it inline as [n] using the excerpt numbers.
- Keep answers short: a few sentences, then stop. Plain text, no markdown headings.
- If the excerpts do not contain the answer, output exactly: ${ABSTAIN_MARKER} and nothing else.`;

export function buildUserPrompt(question: string, chunks: RankedChunk[]): string {
  const block = chunks
    .map((c, i) => `[${i + 1}] (source: ${c.docName})\n${c.text}`)
    .join("\n\n");
  // Rules restated last: small models follow the end of the prompt best.
  return `Excerpts:\n\n${block}\n\nQuestion: ${question}\n\nAnswer with [n] citations, or reply exactly ${ABSTAIN_MARKER} if the excerpts don't answer it.`;
}

// OpenRouter extensions: `models` lists fallbacks, and `reasoning` turns
// off "thinking" so the whole token budget goes to the answer.
function requestBody(question: string, chunks: RankedChunk[]) {
  return {
    model: MODEL,
    models: [MODEL, FALLBACK_MODEL],
    temperature: 0.2,
    max_tokens: 800,
    reasoning: { enabled: false },
    messages: [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: buildUserPrompt(question, chunks) },
    ],
  };
}

export interface GeneratedAnswer {
  text: string;
  model: string;
}

export interface ParsedCitation {
  n: number;
  chunkId: string;
  docName: string;
  excerpt: string;
}

// OpenRouter answers 200 before the provider responds, so a provider
// timeout arrives as an `error` field in the body. The SDK only retries on
// HTTP status, so retry those here.
const ATTEMPTS = 3;

function bodyError(payload: unknown): Error | null {
  const error = (payload as { error?: { message?: string } }).error;
  return error ? new Error(error.message ?? "Provider error") : null;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Non-streaming answer for evals and other batch uses. */
export async function generateAnswer(
  question: string,
  chunks: RankedChunk[],
): Promise<GeneratedAnswer> {
  for (let attempt = 1; ; attempt++) {
    const completion = await getClient().chat.completions.create(
      requestBody(question, chunks),
    );
    const error = bodyError(completion);
    if (!error && completion.choices?.length) {
      return {
        text: completion.choices[0].message.content ?? "",
        model: completion.model ?? MODEL,
      };
    }
    if (attempt === ATTEMPTS) throw error ?? new Error("Empty completion");
    await wait(1000 * attempt);
  }
}

/** Map [n] markers in an answer to the ranked chunks. Invalid ids ignored. */
export function pickCitations(
  answer: string,
  chunks: RankedChunk[],
  excerptOf: (text: string) => string,
): ParsedCitation[] {
  const seen = new Set<number>();
  const out: ParsedCitation[] = [];
  for (const match of answer.matchAll(/\[(\d+)\]/g)) {
    const n = Number(match[1]);
    if (!Number.isInteger(n) || n < 1 || n > chunks.length || seen.has(n)) {
      continue;
    }
    seen.add(n);
    const chunk = chunks[n - 1];
    out.push({
      n,
      chunkId: chunk.chunkId,
      docName: chunk.docName,
      excerpt: excerptOf(chunk.text),
    });
  }
  return out.sort((a, b) => a.n - b.n);
}

export async function* streamAnswer(
  question: string,
  chunks: RankedChunk[],
): AsyncGenerator<{ token: string }, { text: string; model: string }> {
  let model = MODEL;
  let full = "";
  for (let attempt = 1; ; attempt++) {
    try {
      const stream = await getClient().chat.completions.create({
        ...requestBody(question, chunks),
        stream: true,
      });
      for await (const chunk of stream) {
        const error = bodyError(chunk);
        if (error) throw error;
        model = chunk.model ?? model;
        const delta = chunk.choices?.[0]?.delta?.content;
        if (!delta) continue;
        full += delta;
        yield { token: delta };
      }
      return { text: full, model };
    } catch (error) {
      // Once tokens reached the client, a retry would duplicate them.
      if (full || attempt === ATTEMPTS) throw error;
      await wait(1000 * attempt);
    }
  }
}
