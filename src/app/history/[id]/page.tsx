import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { getDictionary, formatDateTime } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getQa, parseCited } from "@/lib/db";
import { deleteQaAction } from "@/lib/actions";
import { ABSTAIN_MARKER } from "@/lib/llm";
import { EmptyState, btnDanger, btnGhost } from "@/components/ui";

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
  const qa = getQa(id);

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
  const cited = parseCited(qa.cited_chunk_ids);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link href="/history" className={btnGhost}>
          {d.history.back}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {qa.question}
            </h1>
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
        <div className="space-y-4">
          <div className="rounded-md border border-border p-4 sm:p-5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {qa.answer}
            </p>
          </div>
          {cited.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                {d.ask.citedLabel}
              </h2>
              <ul className="space-y-2">
                {cited.map((c) => (
                  <li
                    key={c.chunkId}
                    className="rounded-md border border-border p-3 text-sm"
                  >
                    <p className="text-xs font-medium text-muted">
                      [{c.n}] · {c.docName}
                    </p>
                    <p className="mt-1 text-muted">{c.excerpt}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
