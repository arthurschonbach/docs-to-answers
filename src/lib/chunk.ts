export interface TextChunk {
  text: string;
  tokens: number;
}

// MiniLM was trained on short passages and its embedding gets diluted on
// long ones: ~200-token chunks keep a single topic per vector.
export const TARGET_TOKENS = 200;
export const OVERLAP_TOKENS = 30;

/** Rough token estimate (chars/4). Deterministic and explainable. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into ~TARGET_TOKENS chunks with ~OVERLAP_TOKENS of overlap.
 * Paragraph-aware: never splits mid-paragraph unless a single paragraph
 * exceeds the target (then split on sentences, then hard-split).
 * A markdown heading starts a new chunk, so sections stay separate.
 */
export function chunkText(
  text: string,
  target: number = TARGET_TOKENS,
  overlap: number = OVERLAP_TOKENS,
): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const units = splitIntoUnits(normalized, target);
  if (units.length === 0) return [];

  // Greedy-pack units into chunks.
  const packed: string[] = [];
  let current = "";
  for (const unit of units) {
    const candidate = current ? `${current}\n\n${unit}` : unit;
    const newSection = /^#/.test(unit) && hasBody(current);
    if ((newSection || estimateTokens(candidate) > target) && current) {
      packed.push(current);
      current = unit;
    } else {
      current = candidate;
    }
  }
  if (current) packed.push(current);

  // Add word-based overlap: prepend the tail of the previous chunk, unless
  // this chunk opens a new section.
  const overlapWords = Math.max(8, Math.round(overlap * 0.75));
  return packed.map((body, i) => {
    const prefix =
      i === 0 || body.startsWith("#")
        ? ""
        : tailWords(packed[i - 1], overlapWords) + "\n\n";
    const full = (prefix + body).trim();
    return { text: full, tokens: estimateTokens(full) };
  });
}

function splitIntoUnits(text: string, target: number): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const units: string[] = [];
  for (const p of paragraphs) {
    if (estimateTokens(p) <= target) {
      units.push(p);
      continue;
    }
    // Oversized paragraph: split on sentence boundaries.
    const sentences = p.split(/(?<=[.!?])\s+/);
    let buf = "";
    const flush = () => {
      if (buf.trim()) units.push(buf.trim());
      buf = "";
    };
    for (const s of sentences) {
      if (estimateTokens(s) > target) {
        // Single monster sentence: hard-split by characters.
        flush();
        const step = target * 4;
        for (let i = 0; i < s.length; i += step) {
          units.push(s.slice(i, i + step).trim());
        }
        continue;
      }
      const candidate = buf ? `${buf} ${s}` : s;
      if (estimateTokens(candidate) > target && buf) {
        flush();
        buf = s;
      } else {
        buf = candidate;
      }
    }
    flush();
  }
  return units;
}

function hasBody(text: string): boolean {
  return text.split("\n").some((line) => line.trim() && !line.startsWith("#"));
}

function tailWords(text: string, n: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(Math.max(0, words.length - n)).join(" ");
}
