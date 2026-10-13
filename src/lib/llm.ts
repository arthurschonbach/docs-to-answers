import OpenAI from "openai";
import type { RankedChunk } from "./retrieval";

const BASE_URL =
  process.env.OPENAI_BASE_URL ?? "https://openrouter.ai/api/v1";
const MODEL =
  process.env.OPENAI_MODEL ?? "nvidia/nemotron-3-super-120b-a12b:free";

export const ABSTAIN_MARKER = "NOT_IN_DOCS";

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
    timeout: 120_000,
    maxRetries: 0,
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

interface OpenRouterStreamParams
  extends OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming {
  reasoning?: { enabled?: boolean };
}

interface OpenRouterChatParams
  extends OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
  reasoning?: { enabled?: boolean };
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
  const base = {
    model: MODEL,
    temperature: 0.2,
    max_tokens: 800,
    messages: [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: buildUserPrompt(question, chunks) },
    ],
  };
  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await getClient().chat.completions.create({
      ...base,
      reasoning: { enabled: false },
    } as OpenRouterChatParams);
  } catch {
    completion = await getClient().chat.completions.create(base);
  }
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
  const base = {
    model: MODEL,
    temperature: 0.2,
    max_tokens: 800,
    stream: true as const,
    messages: [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: buildUserPrompt(question, chunks) },
    ],
  };

  let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  try {
    stream = await getClient().chat.completions.create({
      ...base,
      reasoning: { enabled: false },
    } as OpenRouterStreamParams);
  } catch {
    stream = await getClient().chat.completions.create(base);
  }

  for await (const chunk of stream) {
    model = chunk.model ?? model;
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;
    full += delta;
    yield { token: delta };
  }
  return { text: full, model };
}
