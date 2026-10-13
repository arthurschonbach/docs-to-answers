import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { getDictionary, format, formatDateTime } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { listQa, parseCited } from "@/lib/db";
import { ABSTAIN_MARKER } from "@/lib/llm";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function Page() {
  const d = getDictionary(await getLocale());

  return (
    <div className="space-y-8">
      <PageHeader title={d.history.title} />
      <Suspense fallback={null}>
        <QaList />
      </Suspense>
    </div>
  );
}

async function QaList() {
  await connection();
  const pairs = listQa();
  const locale = await getLocale();
  const d = getDictionary(locale);

  if (pairs.length === 0) {
    return <EmptyState>{d.history.empty}</EmptyState>;
  }

  return (
    <ul className="m-0 list-none p-0">
      {pairs.map((qa) => {
        const abstained = qa.answer.trim() === ABSTAIN_MARKER;
        const cited = parseCited(qa.cited_chunk_ids);
        return (
          <li key={qa.id} className="border-b border-border last:border-b-0">
            <Link
              href={`/history/${qa.id}`}
              className="group flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-accent">
                  {qa.question}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {formatDateTime(qa.created_at, locale)}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted">
                {abstained
                  ? d.history.abstainedBadge
                  : format(d.history.citationsCount, { n: cited.length })}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
