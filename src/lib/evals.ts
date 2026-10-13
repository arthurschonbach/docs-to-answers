import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ABSTAIN_MARKER } from "./llm";

const EvalItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  abstainExpected: z.boolean().optional(),
  expectDoc: z.string().optional(),
  expectKeywords: z.array(z.string()).optional(),
});

const EvalSetSchema = z.object({
  version: z.number(),
  corpus: z.string(),
  items: z.array(EvalItemSchema).min(1),
});

export type EvalItem = z.infer<typeof EvalItemSchema>;

export function loadEvalSet(): { corpus: string; items: EvalItem[] } {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "data", "eval-set.json"),
    "utf8",
  );
  const parsed = EvalSetSchema.parse(JSON.parse(raw));
  return { corpus: parsed.corpus, items: parsed.items };
}

export interface GradeResult {
  passed: boolean;
  detail: string;
}

export function gradeAnswer(
  item: EvalItem,
  answer: string,
  citedDocNames: string[],
): GradeResult {
  const abstained = answer.trim() === ABSTAIN_MARKER;

  if (item.abstainExpected) {
    return abstained
      ? { passed: true, detail: "abstained as expected" }
      : { passed: false, detail: "answered instead of abstaining" };
  }

  if (abstained) {
    return { passed: false, detail: "abstained on an answerable question" };
  }

  const lowered = answer.toLowerCase();
  const missing = (item.expectKeywords ?? []).filter(
    (kw) => !lowered.includes(kw.toLowerCase()),
  );
  if (missing.length > 0) {
    return { passed: false, detail: `missing: ${missing.join(", ")}` };
  }
  if (item.expectDoc && !citedDocNames.includes(item.expectDoc)) {
    return { passed: false, detail: `did not cite ${item.expectDoc}` };
  }
  return { passed: true, detail: "keywords + citation ok" };
}
