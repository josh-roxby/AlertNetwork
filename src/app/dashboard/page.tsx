"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatsGrid, type Stat } from "@/components/stats-grid";
import { AccountRow } from "@/components/account-row";
import { AddAccountTile } from "@/components/add-account-tile";
import { Chip } from "@/components/chip";
import { FilterStrip } from "@/components/filter-strip";
import { FeaturedReports } from "@/components/featured-reports";
import { IconChevronRight, IconPlus } from "@/components/icons";
import {
  SkeletonAccountList,
  SkeletonStatsGrid,
} from "@/components/skeletons";
import { useShell, useActiveProject } from "@/components/shell-context";
import { paletteBg } from "@/lib/data/palette";
import {
  BAND_TONE,
  computeAccountHealth,
  type HealthBand,
} from "@/lib/data/health";
import { compactNumber, relativeDate } from "@/lib/format";
import type { AccountView, PostRow } from "@/lib/data/types";

type DashboardFilter = "all" | HealthBand | "movers";
const MOVER_THRESHOLD = 20;

export default function DashboardPage() {
  const {
    activeProjectId,
    categories,
    accounts,
    accountsLoading,
    reports,
    posts,
    postsByAccount,
    openSheet,
    isOwner,
  } = useShell();
  const project = useActiveProject();
  const [filter, setFilter] = useState<DashboardFilter>("all");

  // Compute per-account health once per posts change.
  const accountHealths = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof computeAccountHealth>
    >();
    for (const a of accounts) {
      const ps = postsByAccount.get(a.id) ?? ([] as PostRow[]);
      map.set(a.id, computeAccountHealth(ps, project?.health_config));
    }
    return map;
  }, [accounts, postsByAccount, project?.health_config]);

  // Top by health (with views as tiebreaker). Computed unconditionally
  // so hook order stays stable through the conditional returns below.
  const topAccount = useMemo(() => {
    let best: {
      account: AccountView;
      health: ReturnType<typeof computeAccountHealth>;
    } | null = null;
    for (const a of accounts) {
      const h = accountHealths.get(a.id);
      if (!h || h.postCount === 0) continue;
      if (
        !best ||
        h.healthScore > best.health.healthScore ||
        (h.healthScore === best.health.healthScore &&
          h.totalViews > best.health.totalViews)
      ) {
        best = { account: a, health: h };
      }
    }
    return best;
  }, [accounts, accountHealths]);

  if (!activeProjectId) {
    return (
      <EmptyState
        title="Create your first project"
        body="A project is a workspace for monitoring TikTok accounts. Once you create one, you can start adding accounts."
        cta="New project"
        onCta={() => openSheet({ kind: "newProject" })}
      />
    );
  }

  if (accountsLoading) {
    return (
      <>
        <section className="mb-4">
          <h1 className="t-display-1 uppercase text-ink">Dashboard</h1>
          <p className="mt-1 t-small text-ink-3">
            {project?.name ?? "Workspace"}
          </p>
        </section>
        <section className="mb-7">
          <SkeletonStatsGrid />
        </section>
        <section>
          <SkeletonAccountList count={4} />
        </section>
      </>
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        title={isOwner ? "Add your first account" : "No accounts yet"}
        body={
          isOwner
            ? `No accounts in ${project?.name ?? "this project"} yet. Paste a TikTok profile URL to start monitoring it.`
            : `${project?.name ?? "This project"} doesn't have any accounts yet — the owner hasn't added any.`
        }
        cta={isOwner ? "Add account" : undefined}
        onCta={isOwner ? () => openSheet({ kind: "addAccount" }) : undefined}
      />
    );
  }

  // Aggregate stats.
  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const healthScores = Array.from(accountHealths.values())
    .filter((h) => h.postCount > 0)
    .map((h) => h.healthScore);
  const avgHealth =
    healthScores.length > 0
      ? Math.round(
          healthScores.reduce((s, n) => s + n, 0) / healthScores.length,
        )
      : 0;
  const moversCount = Array.from(accountHealths.values()).filter(
    (h) => Math.abs(h.trendDelta) >= MOVER_THRESHOLD && h.postCount > 0,
  ).length;
  const bandCount = (band: HealthBand) =>
    Array.from(accountHealths.values()).filter(
      (h) => h.band === band && h.postCount > 0,
    ).length;
  const excellentCount = bandCount("excellent");
  const strongCount = bandCount("strong");
  const watchingCount = bandCount("watching");

  const mostRecentScrape = accounts.reduce<string | null>((latest, a) => {
    if (!a.last_scraped_at) return latest;
    if (!latest || a.last_scraped_at > latest) return a.last_scraped_at;
    return latest;
  }, null);
  const liveReports = reports.filter((r) => r.status === "active").length;

  // 2x3 grid: Views ↔ Accounts swapped per request so the headline
  // metric (reach) sits in the top-left and account count drops to
  // the bottom-right utility slot.
  const grid: Stat[] = [
    {
      label: "Views (30d)",
      value: totalViews > 0 ? compactNumber(totalViews) : "—",
    },
    {
      label: "Avg health",
      value: healthScores.length > 0 ? avgHealth.toString() : "—",
      trend: healthScores.length > 0
        ? {
            kind: "neutral",
            label: `${healthScores.length} scored`,
          }
        : undefined,
    },
    { label: "Categories", value: categories.length.toString() },
    { label: "Live reports", value: liveReports.toString() },
    {
      label: "Movers",
      value: moversCount.toString(),
      trend: { kind: "neutral", label: `±${MOVER_THRESHOLD}%` },
    },
    { label: "Accounts", value: accounts.length.toString() },
  ];

  const filtered = accounts
    .filter((a) => matchFilter(accountHealths.get(a.id), filter))
    .sort((a, b) => {
      const ha = accountHealths.get(a.id)?.healthScore ?? 0;
      const hb = accountHealths.get(b.id)?.healthScore ?? 0;
      return hb - ha;
    });

  return (
    <>
      <section className="mb-4">
        <h1 className="t-display-1 uppercase text-ink">Dashboard</h1>
        <p className="mt-1 t-small text-ink-3">
          {project?.name ?? "Workspace"} — live snapshot of every monitored
          account.
        </p>
      </section>

      {topAccount && (
        <section className="mb-2">
          <TopHealthTile
            account={topAccount.account}
            score={topAccount.health.healthScore}
            trendDelta={topAccount.health.trendDelta}
            band={topAccount.health.band}
          />
        </section>
      )}

      {!mostRecentScrape && (
        <section className="mb-4 rounded-md border border-accent-line bg-accent-soft px-3 py-2.5 t-small text-accent">
          First scrape pending. Metrics appear after a successful scrape — add
          an account or hit Rescan on an existing one.
        </section>
      )}

      <section className="mb-7">
        <StatsGrid stats={grid} />
      </section>

      <section className="mb-7">
        <FeaturedReports max={3} />
      </section>

      <section className="mb-4">
        <FilterStrip>
          <Chip
            active={filter === "all"}
            count={accounts.length}
            onClick={() => setFilter("all")}
          >
            All
          </Chip>
          <Chip
            active={filter === "excellent"}
            count={excellentCount}
            onClick={() => setFilter("excellent")}
          >
            Excellent
          </Chip>
          <Chip
            active={filter === "strong"}
            count={strongCount}
            onClick={() => setFilter("strong")}
          >
            Strong
          </Chip>
          <Chip
            active={filter === "watching"}
            count={watchingCount}
            onClick={() => setFilter("watching")}
          >
            Watching
          </Chip>
          <Chip
            active={filter === "movers"}
            count={moversCount}
            onClick={() => setFilter("movers")}
          >
            Movers
          </Chip>
        </FilterStrip>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <span data-numeric className="t-small text-ink-2">
            {filtered.length} of {accounts.length}
          </span>
          <Link
            href="/accounts"
            className="tap-btn t-micro text-ink-3 hover:text-ink"
          >
            See all →
          </Link>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-md border border-line bg-surface px-3 py-6 text-center">
            <p className="t-body text-ink-2">No accounts match this filter.</p>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="tap-btn mt-2 t-micro text-accent hover:opacity-80"
            >
              Reset filter
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((a) => (
              <li key={a.id}>
                <AccountRow account={a} />
              </li>
            ))}
            <li>
              <AddAccountTile />
            </li>
          </ul>
        )}
      </section>

      {mostRecentScrape && (
        <p className="mt-4 t-micro text-ink-4" style={{ fontSize: 10 }}>
          Last project scrape · {relativeDate(mostRecentScrape)}
        </p>
      )}
    </>
  );
}

function matchFilter(
  health: ReturnType<typeof computeAccountHealth> | undefined,
  filter: DashboardFilter,
): boolean {
  if (filter === "all") return true;
  if (!health || health.postCount === 0) return false;
  if (filter === "movers") return Math.abs(health.trendDelta) >= MOVER_THRESHOLD;
  return health.band === filter;
}

function TopHealthTile({
  account,
  score,
  trendDelta,
  band,
}: {
  account: AccountView;
  score: number;
  trendDelta: number;
  band: HealthBand;
}) {
  const trendUp = trendDelta >= 0;
  const paletteClass = paletteBg(account.category?.palette_id);
  return (
    <Link
      href={`/accounts/${account.id}`}
      className="tap-row block rounded-md border border-accent-line bg-accent-soft p-4 transition-colors duration-[120ms] hover:opacity-95"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="t-micro text-ink-3">Top health</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              data-numeric
              className={`leading-none ${BAND_TONE[band]}`}
              style={{
                fontFamily: "var(--font-unbounded)",
                fontWeight: 800,
                fontSize: 44,
                letterSpacing: "-0.015em",
              }}
            >
              {score}
            </span>
            <span
              data-numeric
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                trendUp ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
              }`}
            >
              {trendUp ? "↑" : "↓"}
              {Math.abs(trendDelta).toFixed(1)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 t-small text-ink">
            <span className="truncate font-semibold">{account.handle}</span>
            {account.category && (
              <>
                <span className="text-ink-3">·</span>
                <span className="inline-flex items-center gap-1.5 text-ink-2">
                  <span
                    aria-hidden
                    className={`inline-block h-1.5 w-1.5 rounded-full ${paletteClass}`}
                  />
                  {account.category.label}
                </span>
              </>
            )}
          </div>
        </div>
        <span
          aria-hidden
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent text-[#0A0A0A]"
        >
          <IconChevronRight />
        </span>
      </div>
      <span
        aria-hidden
        className="mt-3 inline-flex items-center gap-1 t-meta text-accent"
        style={{ fontSize: 10, letterSpacing: "0.14em" }}
      >
        View account →
      </span>
    </Link>
  );
}

function EmptyState({
  title,
  body,
  cta,
  onCta,
}: {
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-2 text-center">
      <span
        aria-hidden
        className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent"
      >
        <IconPlus />
      </span>
      <h1 className="t-display-3 uppercase text-ink">{title}</h1>
      <p className="mt-2 max-w-[32ch] t-body text-ink-2">{body}</p>
      {cta && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="tap-btn mt-5 inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          <IconPlus stroke="#0A0A0A" />
          {cta}
        </button>
      )}
    </div>
  );
}
