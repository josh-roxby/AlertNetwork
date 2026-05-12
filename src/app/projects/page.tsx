import { PageHeader } from "@/components/page-header";
import { placeholderProjects } from "@/lib/placeholder-data";
import { relativeDate } from "@/lib/format";

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projects"
        description="Workspaces. Every account, tag, and report lives inside a project."
        actions={
          <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90">
            New project
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {placeholderProjects.map((p) => (
          <article
            key={p.id}
            className="rounded-lg border border-border bg-surface p-4 hover:bg-surface-2"
          >
            <h3 className="text-base font-semibold">{p.name}</h3>
            <p className="mt-1 text-sm text-muted">{p.description}</p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span data-numeric className="text-muted">
                {p.accountCount} accounts
              </span>
              <span className="text-muted-2">
                Updated {relativeDate(p.updatedAt)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
