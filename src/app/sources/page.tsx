import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { UploadForm, UrlImportForm } from "@/components/UploadForm";
import { deleteDocumentAction } from "@/lib/actions";
import { listDocuments } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { EmptyState, PageHeader, btnDanger } from "@/components/ui";

export default async function Page() {
  const d = getDictionary(await getLocale());

  return (
    <div className="space-y-10">
      <PageHeader title={d.sources.title} description={d.sources.description} />

      <Suspense fallback={null}>
        <UploadSection />
      </Suspense>

      <hr />

      <Suspense fallback={null}>
        <DocumentsList />
      </Suspense>

      <p className="text-sm">
        <Link
          href="/"
          className="text-muted underline underline-offset-4 transition-colors hover:text-foreground"
        >
          ← {d.nav.ask}
        </Link>
      </p>
    </div>
  );
}

async function UploadSection() {
  await connection();
  return (
    <div className="space-y-8">
      <UploadForm />
      <UrlImportForm />
    </div>
  );
}

async function DocumentsList() {
  await connection();
  const docs = listDocuments();
  const d = getDictionary(await getLocale());

  if (docs.length === 0) {
    return <EmptyState>{d.sources.empty}</EmptyState>;
  }

  return (
    <ul className="m-0 list-none p-0">
      {docs.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{doc.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {doc.kind} ·{" "}
              {doc.status === "ready"
                ? `${doc.chunk_count} chunks`
                : doc.status === "failed"
                  ? (doc.error ?? doc.status)
                  : doc.status}
            </p>
          </div>
          <form action={deleteDocumentAction} className="shrink-0">
            <input type="hidden" name="document_id" value={doc.id} />
            <button type="submit" className={btnDanger}>
              {d.sources.delete}
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
