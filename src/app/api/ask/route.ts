import { getDb, saveQa, type CitedChunk } from "@/lib/db";
import { ABSTAIN_MARKER, hasChatKey, streamAnswer } from "@/lib/llm";
import { excerpt, retrieveChunks, type RankedChunk } from "@/lib/retrieval";

type OutEvent =
  | { type: "meta"; chunks: Array<{ n: number; docName: string; excerpt: string; score: number }> }
  | { type: "token"; text: string }
  | { type: "done"; answer: string; citations: CitedChunk[]; qaId: string }
  | { type: "abstain"; qaId: string }
  | { type: "error"; message: string };

function line(event: OutEvent): string {
  return JSON.stringify(event) + "\n";
}

function pickCitations(answer: string, chunks: RankedChunk[]): CitedChunk[] {
  const seen = new Set<number>();
  const out: CitedChunk[] = [];
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
      excerpt: excerpt(chunk.text),
    });
  }
  return out.sort((a, b) => a.n - b.n);
}

export async function POST(request: Request): Promise<Response> {
  let question = "";
  try {
    const body = (await request.json()) as unknown;
    question =
      typeof body === "object" && body !== null
        ? String((body as { question?: unknown }).question ?? "").trim()
        : "";
  } catch {
    question = "";
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: OutEvent) =>
        controller.enqueue(new TextEncoder().encode(line(event)));
      const started = Date.now();

      if (!question) {
        send({ type: "error", message: "empty" });
        controller.close();
        return;
      }
      if (!hasChatKey()) {
        send({ type: "error", message: "no-key" });
        controller.close();
        return;
      }

      try {
        const chunks = await retrieveChunks(getDb(), question);
        send({
          type: "meta",
          chunks: chunks.map((c, i) => ({
            n: i + 1,
            docName: c.docName,
            excerpt: excerpt(c.text),
            score: Math.round(c.score * 1000) / 1000,
          })),
        });

        if (chunks.length === 0) {
          const qaId = saveQa({
            question,
            answer: ABSTAIN_MARKER,
            cited: [],
            model: null,
            latencyMs: Date.now() - started,
          });
          send({ type: "abstain", qaId });
          controller.close();
          return;
        }

        const gen = streamAnswer(question, chunks);
        let next = await gen.next();
        while (!next.done) {
          send({ type: "token", text: next.value.token });
          next = await gen.next();
        }
        const { text, model } = next.value;
        const latencyMs = Date.now() - started;

        if (text.trim() === ABSTAIN_MARKER) {
          const qaId = saveQa({
            question,
            answer: ABSTAIN_MARKER,
            cited: [],
            model,
            latencyMs,
          });
          send({ type: "abstain", qaId });
        } else {
          const citations = pickCitations(text, chunks);
          const qaId = saveQa({
            question,
            answer: text,
            cited: citations,
            model,
            latencyMs,
          });
          send({ type: "done", answer: text, citations, qaId });
        }
        controller.close();
      } catch (error) {
        console.error("Ask failed:", error);
        try {
          send({ type: "error", message: "failed" });
        } catch {
          // Client went away; ignore.
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8" },
  });
}
