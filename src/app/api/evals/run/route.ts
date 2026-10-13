import {
  addEvalResult,
  countSampleDocuments,
  createEvalRun,
  finishEvalRun,
  getDb,
} from "@/lib/db";
import { gradeAnswer, loadEvalSet } from "@/lib/evals";
import { EMBEDDING_MODEL } from "@/lib/embeddings";
import {
  ABSTAIN_MARKER,
  chatModel,
  generateAnswer,
  hasChatKey,
  pickCitations,
} from "@/lib/llm";
import { excerpt, retrieveChunks } from "@/lib/retrieval";

type OutEvent =
  | { type: "item"; index: number; total: number; id: string; question: string; passed: boolean; detail: string; answer: string }
  | { type: "done"; runId: string; score: number; total: number }
  | { type: "error"; message: string };

export async function POST(): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: OutEvent) =>
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(event) + "\n"),
        );

      if (!hasChatKey()) {
        send({ type: "error", message: "no-key" });
        controller.close();
        return;
      }

      let set: { corpus: string; items: ReturnType<typeof loadEvalSet>["items"] };
      try {
        set = loadEvalSet();
      } catch (error) {
        console.error("Eval set failed to load:", error);
        send({ type: "error", message: "failed" });
        controller.close();
        return;
      }

      if (countSampleDocuments() === 0) {
        send({ type: "error", message: "no-sample" });
        controller.close();
        return;
      }

      const model = chatModel();
      const runId = createEvalRun({
        embeddingModel: EMBEDDING_MODEL,
        model,
        total: set.items.length,
      });
      let score = 0;
      console.log(`[evals] run ${runId} started (${set.items.length} items)`);

      try {
        for (let i = 0; i < set.items.length; i++) {
          const item = set.items[i];
          const itemStarted = Date.now();
          let answer = "";
          let citedDocs: string[] = [];
          try {
            const chunks = await retrieveChunks(getDb(), item.question);
            if (chunks.length === 0) {
              answer = ABSTAIN_MARKER;
            } else {
              const generated = await generateAnswer(item.question, chunks);
              answer = generated.text;
              citedDocs = pickCitations(answer, chunks, excerpt).map(
                (c) => c.docName,
              );
            }
          } catch (error) {
            console.error(`Eval item ${item.id} failed:`, error);
            answer = "";
          }

          const grade = answer
            ? gradeAnswer(item, answer, citedDocs)
            : { passed: false, detail: "generation failed" };
          if (grade.passed) score += 1;
          addEvalResult({
            runId,
            question: item.question,
            abstainExpected: Boolean(item.abstainExpected),
            answer: answer || "(failed)",
            cited: [...new Set(citedDocs)],
            passed: grade.passed,
          });
          send({
            type: "item",
            index: i + 1,
            total: set.items.length,
            id: item.id,
            question: item.question,
            passed: grade.passed,
            detail: grade.detail,
            answer: answer.slice(0, 500),
          });
          console.log(
            `[evals] item ${i + 1}/${set.items.length} ${item.id} ${grade.passed ? "pass" : "FAIL"} (${Date.now() - itemStarted}ms) ${grade.detail}`,
          );

          // Be kind to free-tier rate limits.
          if (i < set.items.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        finishEvalRun(runId, score);
        send({ type: "done", runId, score, total: set.items.length });
        controller.close();
      } catch (error) {
        console.error("Eval run failed:", error);
        try {
          finishEvalRun(runId, score);
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
