import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, formatDateTime } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getEvalResults, getEvalRun } from "@/lib/db";
import { ABSTAIN_MARKER } from "@/lib/llm";
import { btnGhost } from "@/components/ui";

export default async function Page({ params }: PageProps<"/evals/[id]">) {
  const { id } = await params;
  const run = getEvalRun(id);
  if (!run) notFound();
  const results = getEvalResults(id);

  const locale = await getLocale();
  const d = getDictionary(locale);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link href="/evals" className={btnGhost}>
          {d.evals.back}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {run.score} / {run.total}
        </h1>
        <p className="text-sm text-muted">
          {[run.model, run.embedding_model, formatDateTime(run.created_at, locale)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <ul className="space-y-2">
        {results.map((r) => {
          const passed = r.passed === 1;
          const cited: string[] = JSON.parse(r.cited || "[]");
          return (
            <li
              key={r.id}
              className="rounded-md border border-border p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{r.question}</p>
                <span
                  className={`shrink-0 text-xs font-medium ${passed ? "text-accent" : "text-danger"}`}
                >
                  {passed ? d.evals.passed : d.evals.failed}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-muted">
                {r.answer.trim() === ABSTAIN_MARKER
                  ? d.ask.abstained
                  : r.answer.slice(0, 400)}
              </p>
              {cited.length > 0 && (
                <p className="mt-1 text-xs text-muted">
                  [{cited.join(", ")}]
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
