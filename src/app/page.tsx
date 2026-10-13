import { Suspense } from "react";
import { connection } from "next/server";
import { AskForm } from "@/components/AskForm";
import { getDictionary, format } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { countChunks, listDocuments } from "@/lib/db";
import { loadSampleAction } from "@/lib/actions";
import { hasChatKey } from "@/lib/llm";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function Page() {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const docs = listDocuments();

  return (
    <div className="space-y-10">
      <PageHeader title={d.ask.title} description={d.ask.description} />

      {docs.length === 0 ? (
        <EmptyState>{d.ask.emptyCorpus}</EmptyState>
      ) : (
        <Suspense fallback={null}>
          <AskSection />
        </Suspense>
      )}

      <hr />

      <div>
        <p className="mb-3 text-sm text-muted">{d.ask.emptyCorpus}</p>
        <form action={loadSampleAction}>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm text-muted transition-colors hover:border-muted hover:text-foreground cursor-pointer"
          >
            {d.ask.sampleButton}
          </button>
        </form>
      </div>
    </div>
  );
}

async function AskSection() {
  await connection();
  const chunks = countChunks();
  const docs = listDocuments();
  const locale = await getLocale();
  const d = getDictionary(locale);
  return (
    <div className="space-y-6">
      <p className="rounded-md border border-border bg-surface/60 px-4 py-3 text-sm text-muted">
        {format(d.ask.corpusReady, { chunks, docs: docs.length })}
      </p>
      <AskForm hasKey={hasChatKey()} />
    </div>
  );
}
