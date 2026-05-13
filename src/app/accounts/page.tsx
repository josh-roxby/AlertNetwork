import { PageHeader } from "@/components/page-header";
import { HealthScore, TrendArrow } from "@/components/health-score";
import { TierBadge } from "@/components/tier-badge";
import { CategoryTag, Tag } from "@/components/category-tag";
import { AddAccountAction } from "@/components/create-actions";
import { HealthScoreBreakdown } from "@/components/health-score-breakdown";
import { placeholderAccounts, CATEGORIES } from "@/lib/placeholder-data";
import { compactNumber, percent, relativeDate } from "@/lib/format";

export default function AccountsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Project · Spring Music Sponsorships"
        title="Accounts"
        description="Every monitored account, browseable and filterable."
        actions={<AddAccountAction />}
      />

      <div className="mb-5 flex items-center gap-2">
        <span className="t-micro shrink-0 text-ink-3">Categories</span>
        <div className="scroll-x -mx-4 flex flex-1 items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {CATEGORIES.map((c) => (
            <span key={c.id} className="shrink-0">
              <CategoryTag category={c.id} />
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {placeholderAccounts.map((a) => (
          <article
            key={a.id}
            className="rounded-md border border-line bg-surface p-5 transition-colors duration-[120ms] hover:border-line-2 sm:p-6"
          >
            <div className="t-micro text-ink-3">
              TIKTOK · <span className="text-ink-2">{a.handle}</span>
            </div>
            <h3 className="t-h1 mt-1 text-ink">{a.displayName}</h3>

            <div className="mt-5 flex items-end justify-between">
              <HealthScore score={a.healthScore} size="lg" showBand />
              <div className="text-right">
                <TrendArrow delta={a.trendDelta} />
              </div>
            </div>

            <div className="mt-5">
              <HealthScoreBreakdown
                medianViews={a.medianViews}
                engagementRatio={a.engagementRatio}
                postsPerCycle={a.postsPerCycle}
                followers={a.followers}
                trendDelta={a.trendDelta}
              />
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
              <Field label="Followers" value={compactNumber(a.followers)} />
              <Field
                label="Median views"
                value={compactNumber(a.medianViews)}
              />
              <Field label="Engagement" value={percent(a.engagementRatio)} />
            </dl>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <CategoryTag category={a.category} />
              {a.tags.map((t) => (
                <Tag key={t} label={t} />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <TierBadge tier={a.tier} />
              <span
                data-numeric
                className="text-ink-3"
                style={{ fontSize: 11 }}
              >
                Logged {relativeDate(a.lastLoggedAt)}
              </span>
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
      <dt className="t-micro text-ink-3">{label}</dt>
      <dd data-numeric className="mt-0.5 t-body text-ink">
        {value}
      </dd>
    </div>
  );
}
