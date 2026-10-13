"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteDocument } from "./db";
import { getDictionary } from "./i18n";
import { getLocale } from "./locale";
import { ingestDocument } from "./ingest";

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
  if (!/\.(md|markdown|txt)$/i.test(name) && file.type !== "text/plain") {
    return { error: d.sources.unsupported, notice: null };
  }
  const text = (await file.text()).trim();
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

export async function loadSampleAction(): Promise<void> {
  const dir = path.join(process.cwd(), "data", "sample-docs");
  const names = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".md"))
    .sort();
  for (const name of names) {
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    await ingestDocument({ name, kind: "sample", text });
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
