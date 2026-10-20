import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { AskForm } from "@/components/AskForm";
import { getDictionary, format } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { listDocuments } from "@/lib/db";
import { loadSampleAction } from "@/lib/actions";
import { hasChatKey } from "@/lib/llm";
import { EmptyState, PageHeader, btnSecondary, linkClass } from "@/components/ui";

export default async function Page() {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const docs = listDocuments();

  return (
    <div className="space-y-8">
      <PageHeader title={d.ask.title} description={d.ask.description} />

      {docs.length === 0 ? (
        <div className="space-y-3">
          <EmptyState>{d.ask.emptyCorpus}</EmptyState>
          <SampleButton />
        </div>
      ) : (
        <Suspense fallback={null}>
          <AskSection />
        </Suspense>
      )}
    </div>
  );
}

async function AskSection() {
  await connection();
  const docs = listDocuments();
  const locale = await getLocale();
  const d = getDictionary(locale);
  const names = docs.map((doc) => doc.name).join(", ");
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        {format(d.ask.searchingIn, { names })}{" "}
        <Link href="/sources" className={linkClass}>
          {d.ask.manageSources}
        </Link>
      </p>
      <AskForm hasKey={hasChatKey()} />
      <SampleButton compact />
    </div>
  );
}

async function SampleButton({ compact = false }: { compact?: boolean }) {
  const d = getDictionary(await getLocale());
  return (
    <div className={compact ? "border-t border-border pt-6" : "space-y-2"}>
      <form action={loadSampleAction}>
        <button type="submit" className={btnSecondary}>
          {d.ask.sampleButton}
        </button>
      </form>
      {!compact && <p className="text-xs text-muted">{d.ask.sampleNote}</p>}
    </div>
  );
}
