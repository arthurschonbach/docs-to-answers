import * as cheerio from "cheerio";
import { safeFetch } from "./safe-fetch";

const MAX_PAGES = 100;

/** Extract plain text from a PDF buffer, with page markers for citations. */
export async function extractPdfText(input: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: input,
    useSystemFonts: true,
  }).promise;
  const pages: string[] = [];
  const total = Math.min(doc.numPages, MAX_PAGES);
  for (let n = 1; n <= total; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? (item.str as string) : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push(`[page ${n}]\n\n${text}`);
    page.cleanup();
  }
  return pages.join("\n\n").trim();
}

export interface UrlExtraction {
  title: string;
  text: string;
}

/** Fetch a URL and extract readable text. Throws with a short reason. */
export async function extractUrlText(raw: string): Promise<UrlExtraction> {
  let url: URL;
  const trimmed = raw.trim();
  try {
    // Accept "en.wikipedia.org/wiki/..." as typed into a browser bar.
    url = new URL(/^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("invalid-url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("invalid-url");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await safeFetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "docs-to-answers/0.1" },
    });
  } catch (error) {
    if (error instanceof Error && /^(invalid|blocked)-url$/.test(error.message)) {
      throw error;
    }
    throw new Error("fetch-failed");
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error("fetch-failed");

  const contentType = response.headers.get("content-type") ?? "";
  const capped = await readCapped(response.body, 2_000_000);
  const decoded = new TextDecoder().decode(capped);

  if (
    contentType.includes("text/plain") ||
    contentType.includes("text/markdown")
  ) {
    return { title: url.hostname + url.pathname, text: decoded.trim() };
  }
  if (!contentType.includes("html")) throw new Error("unsupported-type");

  const $ = cheerio.load(decoded);
  $(JUNK).remove();
  const title = $("title").first().text().trim() || url.hostname;
  const root = $("article").first().length
    ? $("article").first()
    : $('main, [role="main"]').first().length
      ? $('main, [role="main"]').first()
      : $("body");
  const text = htmlToText($, root);
  if (!text) throw new Error("empty");
  return { title, text };
}

// Page chrome and reference apparatus: noise for retrieval.
const JUNK = [
  "script", "style", "noscript", "nav", "header", "footer", "aside", "figure",
  '[role="navigation"]', ".navbox", ".reflist", ".references", "sup.reference",
  ".mw-editsection",
].join(", ");

const BLOCKS = "h1, h2, h3, h4, h5, h6, p, li, tr, pre, blockquote, dt, dd";

/**
 * One line per block element, headings as markdown "#" so the chunker
 * splits on sections. Plain .text() glues blocks together ("Founded1967").
 */
function htmlToText(
  $: cheerio.CheerioAPI,
  root: ReturnType<cheerio.CheerioAPI>,
): string {
  const lines: string[] = [];
  root.find(BLOCKS).each((_, el) => {
    const node = $(el);
    // Leaf blocks only, so nested lists/paragraphs aren't emitted twice.
    if (node.find(BLOCKS).length > 0) return;
    const text =
      el.tagName === "tr"
        ? node
            .children("th, td")
            .map((_, cell) => clean($(cell).text()))
            .get()
            .filter(Boolean)
            .join(" | ")
        : clean(node.text());
    if (!text) return;
    const level = /^h([1-6])$/.exec(el.tagName)?.[1];
    lines.push(level ? `${"#".repeat(Number(level))} ${text}` : text);
  });
  // Div-only pages have no block tags: fall back to raw text.
  return lines.length > 0 ? lines.join("\n\n") : clean(root.text());
}

function clean(text: string): string {
  return text.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
}

async function readCapped(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      chunks.push(value.subarray(0, maxBytes - (total - value.byteLength)));
      break;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
