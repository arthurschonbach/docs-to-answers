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
