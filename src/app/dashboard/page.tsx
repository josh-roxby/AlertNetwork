"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatsGrid, type Stat } from "@/components/stats-grid";
import { AccountRow } from "@/components/account-row";
import { AddAccountTile } from "@/components/add-account-tile";
import { FeaturedReports } from "@/components/featured-reports";
import { IconChevronRight, IconPlus } from "@/components/icons";
import {
  SkeletonAccountList,
  SkeletonStatsGrid,
} from "@/components/skeletons";
import { useShell, useActiveProject } from "@/components/shell-context";
import { paletteBg } from "@/lib/data/palette";
import { supabaseBrowser } from "@/lib/supabase";
import { compactNumber, relativeDate } from "@/lib/format";

// Lightweight project-wide post stats: how many posts in the last 30
// days, and which account has the most total views in that window.
// Pulled once on mount so the dashboard heading can show a top tile
// without N+1 queries.
type ProjectStats = {
  postsLast30d: number;
  viewsLast30d: number;
  topAccountId: string | null;
  topAccountViews: number;
};

async function loadProjectStats(projectId: string): Promise<ProjectStats> {
  const supabase = supabaseBrowser();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  // Inner-join `accounts` so we can filter `posts` to the active
  // project. RLS would also exclude posts the caller doesn't own,
  // but the explicit scope is necessary when the user has multiple
  // projects.
  const { data, error } = await supabase
    .from("posts")
    .select("account_id, views, accounts!inner(project_id)")
    .eq("accounts.project_id", projectId)
    .gte("posted_at", since);
  if (error) throw error;

  const byAccount = new Map<string, number>();
  let totalViews = 0;
  for (const row of data ?? []) {
    const v = (row.views as number) ?? 0;
    totalViews += v;
    byAccount.set(
      row.account_id as string,
      (byAccount.get(row.account_id as string) ?? 0) + v,
    );
  }

  let topAccountId: string | null = null;
  let topAccountViews = 0;
  for (const [id, views] of byAccount.entries()) {
    if (views > topAccountViews) {
      topAccountId = id;
      topAccountViews = views;
    }
  }

  return {
    postsLast30d: data?.length ?? 0,
    viewsLast30d: totalViews,
    topAccountId,
    topAccountViews,
  };
}

export default function DashboardPage() {
  const {
    activeProjectId,
    categories,
    accounts,
    accountsLoading,
    reports,
    openSheet,
  } = useShell();
  const project = useActiveProject();

  const [stats, setStats] = useState<ProjectStats | null>(null);
  // Cascading setState here is intentional — we re-fetch project stats
  // whenever the project switches or its account list grows.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!activeProjectId) {
      setStats(null);
      return;
    }
    let cancelled = false;
    loadProjectStats(activeProjectId)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeProjectId, accounts.length]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
        title="Add your first account"
        body={`No accounts in ${project?.name ?? "this project"} yet. Paste a TikTok profile URL to start monitoring it.`}
        cta="Add account"
        onCta={() => openSheet({ kind: "addAccount" })}
      />
    );
  }

  const mostRecentScrape = accounts.reduce<string | null>((latest, a) => {
    if (!a.last_scraped_at) return latest;
    if (!latest || a.last_scraped_at > latest) return a.last_scraped_at;
    return latest;
  }, null);
  const liveReports = reports.filter((r) => r.status === "active").length;
  const topAccount = stats?.topAccountId
    ? accounts.find((a) => a.id === stats.topAccountId) ?? null
    : null;

  const grid: Stat[] = [
    { label: "Accounts", value: accounts.length.toString() },
    {
      label: "Posts (30d)",
      value: stats ? stats.postsLast30d.toString() : "—",
    },
    {
      label: "Views (30d)",
      value: stats && stats.viewsLast30d > 0
        ? compactNumber(stats.viewsLast30d)
        : "—",
    },
    { label: "Categories", value: categories.length.toString() },
    { label: "Reports", value: liveReports.toString() },
    {
      label: "Last scrape",
      value: mostRecentScrape ? relativeDate(mostRecentScrape) : "Pending",
    },
  ];

  return (
    <>
      <section className="mb-4">
        <h1 className="t-display-1 uppercase text-ink">Dashboard</h1>
        <p className="mt-1 t-small text-ink-3">
          {project?.name ?? "Workspace"} — every account in this project.
        </p>
      </section>

      {topAccount && (
        <section className="mb-2">
          <TopAccountTile
            account={topAccount}
            views={stats?.topAccountViews ?? 0}
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

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <span data-numeric className="t-small text-ink-2">
            {accounts.length} account{accounts.length === 1 ? "" : "s"}
          </span>
          <Link
            href="/accounts"
            className="tap-btn t-micro text-ink-3 hover:text-ink"
          >
            See all →
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {accounts.slice(0, 8).map((a) => (
            <li key={a.id}>
              <AccountRow account={a} />
            </li>
          ))}
          <li>
            <AddAccountTile />
          </li>
        </ul>
      </section>
    </>
  );
}

function TopAccountTile({
  account,
  views,
}: {
  account: {
    id: string;
    handle: string;
    category: { palette_id: string; label: string } | null;
  };
  views: number;
}) {
  const paletteClass = paletteBg(account.category?.palette_id);
  return (
    <Link
      href={`/accounts/${account.id}`}
      className="tap-row block rounded-md border border-accent-line bg-accent-soft p-4 transition-colors duration-[120ms] hover:opacity-95"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="t-micro text-ink-3">Top by views (30d)</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              data-numeric
              className="leading-none text-ink"
              style={{
                fontFamily: "var(--font-unbounded)",
                fontWeight: 800,
                fontSize: 36,
                letterSpacing: "-0.015em",
              }}
            >
              {compactNumber(views)}
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
  cta: string;
  onCta: () => void;
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
      <button
        type="button"
        onClick={onCta}
        className="tap-btn mt-5 inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
      >
        <IconPlus stroke="#0A0A0A" />
        {cta}
      </button>
    </div>
  );
}
