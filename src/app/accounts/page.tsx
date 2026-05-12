import { PageHeader } from "@/components/page-header";
import { HealthScore } from "@/components/health-score";
import { placeholderAccounts } from "@/lib/placeholder-data";
import { compactNumber, percent } from "@/lib/format";

export default function AccountsPage() {
  const allTags = Array.from(
    new Set(placeholderAccounts.flatMap((a) => a.tags)),
  ).sort();

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Every monitored account, browseable and filterable."
        actions={
          <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90">
            Add account
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search handles…"
          className="w-64 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-accent"
          disabled
        />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
          Tags
        </span>
        {allTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {placeholderAccounts.map((a) => (
          <article
            key={a.id}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <header className="flex items-start justify-between">
              <div>
                <div className="text-base font-semibold">{a.handle}</div>
                <div className="text-xs text-muted">
                  {a.platform} · {a.tier}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
                  Health
                </div>
                <div className="text-2xl">
                  <HealthScore score={a.healthScore} />
                </div>
              </div>
            </header>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <Field label="Followers" value={compactNumber(a.followers)} />
              <Field
                label="Median views"
                value={compactNumber(a.medianViews)}
              />
              <Field label="Engagement" value={percent(a.engagementRatio)} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-1">
              {a.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
        {label}
      </dt>
      <dd data-numeric className="mt-0.5 text-sm">
        {value}
      </dd>
    </div>
  );
}
