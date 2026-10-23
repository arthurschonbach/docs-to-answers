import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { getDictionary, formatDateTime } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getVisitorId } from "@/lib/visitor";
import { getQa } from "@/lib/db";
import { deleteQaAction } from "@/lib/actions";
import { ABSTAIN_MARKER } from "@/lib/llm";
import {
  EmptyState,
  PageTitle,
  Prose,
  SectionTitle,
  SourceList,
  btnDanger,
  btnGhost,
} from "@/components/ui";

export default async function Page({ params }: PageProps<"/history/[id]">) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const qa = await getQa(await getVisitorId(), id);

  const locale = await getLocale();
  const d = getDictionary(locale);

  // Demo deployments (Vercel) keep sqlite in instance-local /tmp: an entry
  // saved on one instance 404s on another. Explain instead of a dead end.
  if (!qa) {
    return (
      <div className="space-y-8">
        <Link href="/history" className={btnGhost}>
          {d.history.back}
        </Link>
        <EmptyState>{`${d.history.notFound} — ${d.history.notFoundHint}`}</EmptyState>
      </div>
    );
  }
  const abstained = qa.answer.trim() === ABSTAIN_MARKER;
  const cited = qa.cited;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link href="/history" className={btnGhost}>
          {d.history.back}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <PageTitle>{qa.question}</PageTitle>
            <p className="mt-1.5 text-sm text-muted">
              {formatDateTime(qa.created_at, locale)}
              {qa.model ? ` · ${qa.model}` : ""}
            </p>
          </div>
          <form action={deleteQaAction} className="shrink-0">
            <input type="hidden" name="qa_id" value={qa.id} />
            <button type="submit" className={btnDanger}>
              {d.history.delete}
            </button>
          </form>
        </div>
      </div>

      {abstained ? (
        <EmptyState>{d.ask.abstained}</EmptyState>
      ) : (
        <div className="space-y-8">
          <Prose text={qa.answer} />
          {cited.length > 0 && (
            <div>
              <SectionTitle>{d.ask.citedLabel}</SectionTitle>
              <SourceList
                items={cited.map((c) => ({
                  key: c.chunkId,
                  n: c.n,
                  title: c.docName,
                  detail: c.excerpt,
                }))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
