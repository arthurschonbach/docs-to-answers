import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { listDocuments } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function Page() {
  const d = getDictionary(await getLocale());
  const docs = listDocuments();

  return (
    <div className="space-y-8">
      <PageHeader title={d.sources.title} description={d.sources.description} />
      {docs.length === 0 ? (
        <EmptyState>{d.sources.empty}</EmptyState>
      ) : (
        <ul className="m-0 list-none p-0">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="border-b border-border py-3 last:border-b-0"
            >
              <p className="text-sm font-medium">{doc.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {doc.kind} · {doc.chunk_count} chunks
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
