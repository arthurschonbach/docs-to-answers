import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { AskForm } from "@/components/AskForm";
import { SampleForm } from "@/components/SampleForm";
import { getDictionary, format } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getVisitorId } from "@/lib/visitor";
import { listDocuments } from "@/lib/db";
import { hasChatKey } from "@/lib/llm";
import { EmptyState, PageHeader, linkClass } from "@/components/ui";

export default async function Page() {
  const d = getDictionary(await getLocale());

  // The ask box is part of the static shell so it shows immediately; only
  // the corpus line waits for the database.
  return (
    <div className="space-y-8">
      <PageHeader title={d.ask.title} description={d.ask.description} />
      <Suspense fallback={null}>
        <CorpusLine />
      </Suspense>
      <AskForm hasKey={hasChatKey()} />
      <Suspense fallback={null}>
        <SampleButton />
      </Suspense>
    </div>
  );
}

// Read after connection() so it is never part of the cached shell:
// otherwise the empty state stays on screen after the sample loads.
async function CorpusLine() {
  await connection();
  const docs = await listDocuments(await getVisitorId());
  const d = getDictionary(await getLocale());

  if (docs.length === 0) return <EmptyState>{d.ask.emptyCorpus}</EmptyState>;

  const names = docs.map((doc) => doc.name).join(", ");
  return (
    <p className="text-sm text-muted">
      {format(d.ask.searchingIn, { names })}{" "}
      <Link href="/sources" className={linkClass}>
        {d.ask.manageSources}
      </Link>
    </p>
  );
}

async function SampleButton() {
  const d = getDictionary(await getLocale());
  return (
    <div className="space-y-2 border-t border-border pt-6">
      <SampleForm />
      <p className="text-xs text-muted">{d.ask.sampleNote}</p>
    </div>
  );
}
