import { describe, expect, it } from "vitest";
import { chunkText, estimateTokens } from "@/lib/chunk";

const sentence = (i: number) => `Sentence number ${i} talks about refunds and shipping.`;
const paragraph = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => sentence(i + offset)).join(" ");

describe("chunkText", () => {
  it("returns nothing for blank input", () => {
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("keeps short text in a single chunk", () => {
    const chunks = chunkText("Just one paragraph.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("Just one paragraph.");
  });

  it("starts a new chunk at each markdown heading, without overlap", () => {
    const text = "# Refunds\n\nRefunds take 30 days.\n\n# Shipping\n\nShipping is free.";
    const chunks = chunkText(text);
    expect(chunks.map((c) => c.text)).toEqual([
      "# Refunds\n\nRefunds take 30 days.",
      "# Shipping\n\nShipping is free.",
    ]);
  });

  it("never leaves a heading alone in its own chunk", () => {
    const text = "# Title\n\n## Section\n\nBody text.";
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain("Body text.");
  });

  it("splits long text near the target size and overlaps consecutive chunks", () => {
    const text = [paragraph(10), paragraph(10, 10), paragraph(10, 20), paragraph(10, 30)].join("\n\n");
    const chunks = chunkText(text, 200, 30);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.tokens).toBeLessThanOrEqual(260);
    // The second chunk opens with the tail of the first.
    const tail = chunks[0].text.split(/\s+/).slice(-5).join(" ");
    expect(chunks[1].text.startsWith(tail) || chunks[1].text.includes(tail)).toBe(true);
  });

  it("hard-splits a single sentence longer than the target", () => {
    const monster = "x".repeat(3000);
    const chunks = chunkText(monster, 200, 30);
    expect(chunks.length).toBeGreaterThan(1);
    // 800-char pieces plus a bounded overlap, not a copy of the previous chunk.
    expect(chunks.every((c) => c.text.length <= 1000)).toBe(true);
  });

  it("estimates tokens as chars / 4, rounded up", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });
});
