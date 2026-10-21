import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { getDictionary, formatDateTime } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getEvalResults, getEvalRun } from "@/lib/db";
import { loadEvalSet } from "@/lib/evals";
import { isAbstain } from "@/lib/llm";
import { EmptyState, PageTitle, btnGhost } from "@/components/ui";

export default async function Page({ params }: PageProps<"/evals/[id]">) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const run = getEvalRun(id);

  const locale = await getLocale();
  const d = getDictionary(locale);

  // Same ephemeral-history note as the Q&A detail page.
  if (!run) {
    return (
      <div className="space-y-8">
        <Link href="/evals" className={btnGhost}>
          {d.evals.back}
        </Link>
        <EmptyState>{`${d.evals.notFound} — ${d.evals.notFoundHint}`}</EmptyState>
      </div>
    );
  }
  const results = getEvalResults(id);

  let expectations = new Map<
    string,
    { expectDoc?: string; expectKeywords?: string[]; abstainExpected?: boolean }
  >();
  try {
    const set = loadEvalSet();
    expectations = new Map(set.items.map((item) => [item.question, item]));
  } catch {
    // Eval set missing; show answers without expectations.
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link href="/evals" className={btnGhost}>
          {d.evals.back}
        </Link>
        <PageTitle>
          {run.score} / {run.total}
        </PageTitle>
        <p className="text-sm text-muted">
          {[run.model, run.embedding_model, formatDateTime(run.created_at, locale)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <ul className="divide-y divide-border border-y border-border">
        {results.map((r) => {
          const passed = r.passed === 1;
          const expected = expectations.get(r.question);
          return (
            <li key={r.id} className="py-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{r.question}</p>
                <StatusPill passed={passed} label={passed ? d.evals.passed : d.evals.failed} />
              </div>
              {expected && (
                <p className="mt-1 text-xs text-muted">
                  {expected.abstainExpected
                    ? d.evals.abstains
                    : `${d.evals.expects} ${(expected.expectKeywords ?? []).join(", ")} · ${expected.expectDoc ?? ""}`}
                </p>
              )}
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-muted">
                {isAbstain(r.answer)
                  ? d.ask.abstained
                  : r.answer.slice(0, 400)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusPill({ passed, label }: { passed: boolean; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${passed ? "text-accent" : "text-danger"}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
