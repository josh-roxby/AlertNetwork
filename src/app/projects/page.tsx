import { PageHeader } from "@/components/page-header";
import { NewProjectAction } from "@/components/create-actions";
import { placeholderProjects } from "@/lib/placeholder-data";
import { relativeDate } from "@/lib/format";

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Workspaces. Every account, tag, and report lives inside a project. Switch active project from the top bar."
        actions={<NewProjectAction />}
      />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {placeholderProjects.map((p) => (
          <article
            key={p.id}
            className="rounded-md border border-line bg-surface p-4 transition-colors duration-[120ms] hover:border-line-2 sm:p-5"
          >
            <h3 className="t-h1 text-ink">{p.name}</h3>
            <p className="mt-2 t-body text-ink-2">{p.description}</p>
            <div className="mt-5 flex items-center justify-between t-small text-ink-3">
              <span data-numeric>{p.accountCount} accounts</span>
              <span>Updated {relativeDate(p.updatedAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
