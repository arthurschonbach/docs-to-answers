import { describe, expect, it } from "vitest";
import { gradeAnswer, loadEvalSet, type EvalItem } from "@/lib/evals";
import { ABSTAIN_MARKER } from "@/lib/llm";

const answerable: EvalItem = {
  id: "refund",
  question: "What is the refund policy?",
  expectDoc: "policies.md",
  expectKeywords: ["30 days", "receipt"],
};
const offTopic: EvalItem = { id: "worldcup", question: "Who won in 1998?", abstainExpected: true };

describe("gradeAnswer", () => {
  it("passes with all keywords (case-insensitive) and the expected source", () => {
    const r = gradeAnswer(answerable, "Within 30 Days with a Receipt [1].", ["policies.md"]);
    expect(r.passed).toBe(true);
  });
  it("fails and names the missing keywords", () => {
    const r = gradeAnswer(answerable, "Within 30 days [1].", ["policies.md"]);
    expect(r).toEqual({ passed: false, detail: "missing: receipt" });
  });
  it("fails when the right words come from the wrong source", () => {
    const r = gradeAnswer(answerable, "30 days, receipt [1].", ["faq.md"]);
    expect(r.passed).toBe(false);
    expect(r.detail).toContain("did not cite");
  });
  it("fails an abstention on an answerable question", () => {
    expect(gradeAnswer(answerable, ABSTAIN_MARKER, []).passed).toBe(false);
  });
  it("requires an abstention when one is expected", () => {
    expect(gradeAnswer(offTopic, ABSTAIN_MARKER, []).passed).toBe(true);
    expect(gradeAnswer(offTopic, "France won [1].", ["faq.md"]).passed).toBe(false);
  });
});

describe("eval set", () => {
  it("parses, has unique ids, and mixes answerable and abstain items", () => {
    const { items } = loadEvalSet();
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(items.some((i) => i.abstainExpected)).toBe(true);
    for (const item of items.filter((i) => !i.abstainExpected)) {
      expect(item.expectKeywords?.length || item.expectDoc).toBeTruthy();
    }
  });
});
