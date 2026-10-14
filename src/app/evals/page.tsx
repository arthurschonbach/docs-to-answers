import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { EvalsRunner } from "@/components/EvalsRunner";
import { getDictionary, formatDateTime } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { countSampleDocuments, listEvalRuns } from "@/lib/db";
import { hasChatKey } from "@/lib/llm";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";

export default async function Page() {
  const d = getDictionary(await getLocale());

  return (
    <div className="space-y-8">
      <PageHeader title={d.evals.title} description={d.evals.description} />

      <Suspense fallback={null}>
        <RunnerSection />
      </Suspense>

      <hr />

      <Suspense fallback={null}>
        <RunsList />
      </Suspense>
    </div>
  );
}

async function RunnerSection() {
  await connection();
  return <EvalsRunner hasKey={hasChatKey()} hasSample={countSampleDocuments() > 0} />;
}

async function RunsList() {
  await connection();
  const runs = listEvalRuns();
  const locale = await getLocale();
  const d = getDictionary(locale);

  return (
    <div>
      <SectionTitle>{d.evals.pastRuns}</SectionTitle>
      {runs.length === 0 ? (
        <EmptyState>{d.evals.noRuns}</EmptyState>
      ) : (
        <ul className="m-0 list-none p-0">
          {runs.map((run) => (
            <li key={run.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/evals/${run.id}`}
                className="group flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground transition-colors group-hover:text-accent">
                    {run.score} / {run.total}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {[run.model, run.embedding_model, formatDateTime(run.created_at, locale)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
