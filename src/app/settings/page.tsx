import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Project, monitoring, scoring, and integration settings. Skeleton only — wired up alongside the auth + DB layer."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <article
            key={s.title}
            className="rounded-md border border-line bg-surface p-5"
          >
            <h3 className="t-h1 text-ink">{s.title}</h3>
            <p className="mt-2 t-body text-ink-2">{s.description}</p>
            <div className="mt-4 t-micro text-ink-3">Coming soon</div>
          </article>
        ))}
      </div>
    </>
  );
}

const SECTIONS = [
  {
    title: "Project",
    description: "Name, description, members, billing, archive.",
  },
  {
    title: "Monitoring",
    description:
      "Logging cadence defaults, time zone, retry policy, scrape provider.",
  },
  {
    title: "Health score",
    description:
      "Component weights (locked to 30/30/20/10/10 in v1). Configurable per project later.",
  },
  {
    title: "Integrations",
    description: "Apify keys, Gmail service account, future webhook outputs.",
  },
];
