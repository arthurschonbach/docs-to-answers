import OpenAI from "openai";
import type { RankedChunk } from "./retrieval";

const BASE_URL =
  process.env.OPENAI_BASE_URL ?? "https://openrouter.ai/api/v1";
const MODEL =
  process.env.OPENAI_MODEL ?? "nvidia/nemotron-3.5-super-vl:free";

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
function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env to ask questions.");
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
  return `Excerpts:\n\n${block}\n\nQuestion: ${question}`;
}

// OpenRouter extension: turn off "thinking" so the whole token budget goes
// to the answer. Ignored by models that don't reason.
function requestBody(question: string, chunks: RankedChunk[]) {
  return {
    model: MODEL,
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

/** Non-streaming answer for evals and other batch uses. */
export async function generateAnswer(
  question: string,
  chunks: RankedChunk[],
): Promise<GeneratedAnswer> {
  const completion = await getClient().chat.completions.create(
    requestBody(question, chunks),
  );
  return {
    text: completion.choices[0]?.message.content ?? "",
    model: completion.model ?? MODEL,
  };
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
  const stream = await getClient().chat.completions.create({
    ...requestBody(question, chunks),
    stream: true,
  });

  for await (const chunk of stream) {
    model = chunk.model ?? model;
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;
    full += delta;
    yield { token: delta };
  }
  return { text: full, model };
}
