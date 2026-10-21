import { countSampleDocuments, saveEvalRun } from "@/lib/db";
import { gradeAnswer, loadEvalSet, type EvalItem } from "@/lib/evals";
import { EMBEDDING_MODEL } from "@/lib/embeddings";
import {
  ABSTAIN_MARKER,
  chatModel,
  generateAnswer,
  hasChatKey,
  pickCitations,
} from "@/lib/llm";
import { excerpt, retrieveChunks } from "@/lib/retrieval";

// 15 LLM calls; Vercel allows up to 300s.
export const maxDuration = 300;

// Parallel enough to be quick, low enough for free-tier rate limits (the
// SDK retries 429s with backoff).
const CONCURRENCY = 3;

type OutEvent =
  | { type: "item"; index: number; total: number; id: string; question: string; passed: boolean; detail: string; answer: string }
  | { type: "done"; runId: string; score: number; total: number }
  | { type: "error"; message: string };

interface ItemResult {
  item: EvalItem;
  answer: string;
  citedDocs: string[];
  passed: boolean;
  detail: string;
}

async function runItem(item: EvalItem): Promise<ItemResult> {
  try {
    const chunks = await retrieveChunks(item.question);
    let answer = ABSTAIN_MARKER;
    let citedDocs: string[] = [];
    if (chunks.length > 0) {
      answer = (await generateAnswer(item.question, chunks)).text;
      citedDocs = [
        ...new Set(pickCitations(answer, chunks, excerpt).map((c) => c.docName)),
      ];
    }
    return { item, answer, citedDocs, ...gradeAnswer(item, answer, citedDocs) };
  } catch (error) {
    console.error(`[evals] ${item.id} failed:`, error);
    const message = error instanceof Error ? error.message : String(error);
    return { item, answer: "(failed)", citedDocs: [], passed: false, detail: `error: ${message}` };
  }
}

export async function POST(): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: OutEvent) => {
        try {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"));
        } catch {
          // Client went away; keep running so the run is still recorded.
        }
      };

      try {
        if (!hasChatKey()) return send({ type: "error", message: "no-key" });
        if ((await countSampleDocuments()) === 0) {
          return send({ type: "error", message: "no-sample" });
        }
        await runAll(send);
      } catch (error) {
        console.error("Eval run failed:", error);
        send({ type: "error", message: "failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8" },
  });
}

async function runAll(send: (event: OutEvent) => void): Promise<void> {
  const { items } = loadEvalSet();
  const results: ItemResult[] = new Array(items.length);
  let next = 0;
  let finished = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      const r = await runItem(items[index]);
      results[index] = r;
      finished++;
      send({
        type: "item",
        index: index + 1,
        total: items.length,
        id: r.item.id,
        question: r.item.question,
        passed: r.passed,
        detail: r.detail,
        answer: r.answer.slice(0, 500),
      });
      console.log(`[evals] ${finished}/${items.length} ${r.item.id} ${r.passed ? "pass" : "FAIL"} ${r.detail}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Record only complete runs, in eval-set order.
  const score = results.filter((r) => r.passed).length;
  const runId = await saveEvalRun({
    embeddingModel: EMBEDDING_MODEL,
    model: chatModel(),
    results: results.map((r) => ({
      question: r.item.question,
      abstainExpected: Boolean(r.item.abstainExpected),
      answer: r.answer,
      cited: r.citedDocs,
      passed: r.passed,
    })),
  });
  send({ type: "done", runId, score, total: items.length });
}
