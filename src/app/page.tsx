import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { AskForm } from "@/components/AskForm";
import { PendingButton } from "@/components/PendingButton";
import { getDictionary, format } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { listDocuments } from "@/lib/db";
import { loadSampleAction } from "@/lib/actions";
import { hasChatKey } from "@/lib/llm";
import { EmptyState, PageHeader, btnSecondary, linkClass } from "@/components/ui";

export default async function Page() {
  const d = getDictionary(await getLocale());

  return (
    <div className="space-y-8">
      <PageHeader title={d.ask.title} description={d.ask.description} />
      <Suspense fallback={null}>
        <AskSection />
      </Suspense>
    </div>
  );
}

// The corpus is read after connection() so it is never part of the cached
// shell: otherwise the empty state stays on screen after the sample loads.
async function AskSection() {
  await connection();
  const docs = listDocuments();
  const d = getDictionary(await getLocale());

  if (docs.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState>{d.ask.emptyCorpus}</EmptyState>
        <SampleButton />
      </div>
    );
  }

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
        <PendingButton className={btnSecondary} pendingLabel={d.ask.sampleLoading}>
          {d.ask.sampleButton}
        </PendingButton>
      </form>
      {!compact && <p className="text-xs text-muted">{d.ask.sampleNote}</p>}
    </div>
  );
}
