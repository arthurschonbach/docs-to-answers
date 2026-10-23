import { describe, expect, it } from "vitest";
import { ABSTAIN_MARKER, buildUserPrompt, isAbstain, pickCitations } from "@/lib/llm";
import type { RankedChunk } from "@/lib/retrieval";

const chunk = (n: number): RankedChunk => ({
  chunkId: `c${n}`,
  documentId: `d${n}`,
  docName: `doc-${n}.md`,
  text: `Passage ${n}`,
  score: 0.5,
});
const chunks = [chunk(1), chunk(2), chunk(3)];
const identity = (t: string) => t;

describe("isAbstain", () => {
  it("detects the marker, even wrapped in a sentence", () => {
    expect(isAbstain(ABSTAIN_MARKER)).toBe(true);
    expect(isAbstain(`Sorry: ${ABSTAIN_MARKER}.`)).toBe(true);
  });
  it("treats an empty answer as an abstention", () => {
    expect(isAbstain("  ")).toBe(true);
  });
  it("accepts a normal answer", () => {
    expect(isAbstain("Refunds take 30 days [1].")).toBe(false);
  });
});

describe("pickCitations", () => {
  it("maps [n] markers to chunks, deduplicated and sorted", () => {
    const cited = pickCitations("B [2]. A [1]. B again [2].", chunks, identity);
    expect(cited.map((c) => c.n)).toEqual([1, 2]);
    expect(cited[0]).toMatchObject({ chunkId: "c1", docName: "doc-1.md", excerpt: "Passage 1" });
  });
  it("drops markers that point to no excerpt", () => {
    expect(pickCitations("Made up [0] [4] [99].", chunks, identity)).toEqual([]);
  });
});

describe("buildUserPrompt", () => {
  it("numbers excerpts from 1 and restates the abstain rule last", () => {
    const prompt = buildUserPrompt("What is the refund policy?", chunks);
    expect(prompt).toContain("[1] (source: doc-1.md)\nPassage 1");
    expect(prompt).toContain("[3] (source: doc-3.md)");
    expect(prompt.trim().endsWith(`${ABSTAIN_MARKER} if the excerpts don't answer it.`)).toBe(true);
  });
});
