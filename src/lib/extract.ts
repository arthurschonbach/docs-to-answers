import * as cheerio from "cheerio";

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
  try {
    url = new URL(raw.trim());
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
    response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "docs-to-answers/0.1" },
      redirect: "follow",
    });
  } catch {
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
  $("script, style, noscript, nav, header, footer, aside").remove();
  const title = $("title").first().text().trim() || url.hostname;
  const main =
    $("article").first().text() ||
    $('main, [role="main"]').first().text() ||
    $("body").text();
  const text = main.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  if (!text) throw new Error("empty");
  return { title, text };
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
