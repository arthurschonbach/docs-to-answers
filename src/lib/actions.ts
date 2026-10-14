"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteDocument, deleteQa, deleteSampleDocuments } from "./db";
import { extractPdfText, extractUrlText } from "./extract";
import { getDictionary } from "./i18n";
import { getLocale } from "./locale";
import { ingestDocument } from "./ingest";
import { SAMPLE_DOCS } from "./sample-docs";

export interface FormState {
  error: string | null;
  notice: string | null;
}

const MAX_CHARS = 500_000;

export async function uploadDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const d = getDictionary(await getLocale());
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: d.sources.emptyFile, notice: null };
  }
  const name = file.name || "upload";
  const lower = name.toLowerCase();
  const isPdf = lower.endsWith(".pdf");
  const isText =
    /\.md$|\.markdown$|\.txt$/i.test(name) || file.type === "text/plain";
  if (!isPdf && !isText) {
    return { error: d.sources.unsupported, notice: null };
  }

  let text: string;
  if (isPdf) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      text = (await extractPdfText(bytes)).trim();
    } catch (error) {
      console.error("PDF extraction failed:", error);
      return { error: d.sources.failed, notice: null };
    }
  } else {
    text = (await file.text()).trim();
  }
  if (!text) {
    return { error: d.sources.emptyFile, notice: null };
  }
  if (text.length > MAX_CHARS) {
    return { error: d.sources.tooBig, notice: null };
  }

  try {
    const result = await ingestDocument({ name, kind: "upload", text });
    revalidatePath("/sources");
    revalidatePath("/");
    return {
      error: null,
      notice: `${d.sources.imported}: ${name} (${result.chunks})`,
    };
  } catch {
    revalidatePath("/sources");
    return { error: d.sources.failed, notice: null };
  }
}

export async function importUrlAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const d = getDictionary(await getLocale());
  const raw = String(formData.get("url") ?? "").trim();
  if (!raw) {
    return { error: d.sources.invalidUrl, notice: null };
  }

  let title: string;
  let text: string;
  try {
    ({ title, text } = await extractUrlText(raw));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "fetch-failed";
    if (reason === "invalid-url") {
      return { error: d.sources.invalidUrl, notice: null };
    }
    return { error: d.sources.fetchFailed, notice: null };
  }
  if (!text || text.length > MAX_CHARS) {
    return {
      error: !text ? d.sources.emptyFile : d.sources.tooBig,
      notice: null,
    };
  }

  try {
    const result = await ingestDocument({
      name: title,
      kind: "url",
      sourceUrl: raw,
      text,
    });
    revalidatePath("/sources");
    revalidatePath("/");
    return {
      error: null,
      notice: `${d.sources.imported}: ${title} (${result.chunks})`,
    };
  } catch {
    revalidatePath("/sources");
    return { error: d.sources.failed, notice: null };
  }
}
export async function loadSampleAction(): Promise<void> {
  deleteSampleDocuments();
  // Inlined in src/lib/sample-docs.ts (bundled at build time) instead of
  // data/*.md files, so seeding works on read-only hosts (Vercel).
  for (const doc of SAMPLE_DOCS) {
    await ingestDocument({ name: doc.name, kind: "sample", text: doc.text });
  }
  redirect("/");
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const id = String(formData.get("document_id") ?? "");
  if (!id) return;
  deleteDocument(id);
  revalidatePath("/sources");
  revalidatePath("/");
}

export async function deleteQaAction(formData: FormData): Promise<void> {
  const id = String(formData.get("qa_id") ?? "");
  if (!id) return;
  deleteQa(id);
  revalidatePath("/history");
  redirect("/history");
}
