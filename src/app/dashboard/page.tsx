"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatsGrid, type Stat } from "@/components/stats-grid";
import { Chip } from "@/components/chip";
import { FilterStrip } from "@/components/filter-strip";
import { AccountRow } from "@/components/account-row";
import { AddAccountTile } from "@/components/add-account-tile";
import { MetricLegend } from "@/components/metric-legend";
import { FeaturedReports } from "@/components/featured-reports";
import {
  CATEGORIES,
  placeholderAccounts,
  placeholderReports,
  type Account,
} from "@/lib/placeholder-data";
import { compactNumber } from "@/lib/format";
import { healthBand } from "@/components/health-score";
import { IconChevronRight } from "@/components/icons";

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
);

const CATEGORY_COLOR: Record<string, string> = {
  fashion: "bg-cat-fashion",
  food: "bg-cat-food",
  beauty: "bg-cat-beauty",
  tech: "bg-cat-tech",
  sports: "bg-cat-sports",
  music: "bg-cat-music",
  travel: "bg-cat-travel",
  lifestyle: "bg-cat-lifestyle",
};

type DashboardFilter = "all" | "excellent" | "strong" | "watching" | "movers";

function matchFilter(account: Account, f: DashboardFilter): boolean {
  if (f === "all") return true;
  if (f === "movers") return Math.abs(account.trendDelta) >= 20;
  return healthBand(account.healthScore) === f;
}

export default function DashboardPage() {
  const [filter, setFilter] = useState<DashboardFilter>("all");

  const accounts = placeholderAccounts;
  const reports = placeholderReports;

  const avgHealth = Math.round(
    accounts.reduce((sum, a) => sum + a.healthScore, 0) / accounts.length,
  );
  const moversCount = accounts.filter((a) => Math.abs(a.trendDelta) >= 20).length;
  const excellentCount = accounts.filter(
    (a) => healthBand(a.healthScore) === "excellent",
  ).length;
  const strongCount = accounts.filter(
    (a) => healthBand(a.healthScore) === "strong",
  ).length;
  const watchingCount = accounts.filter(
    (a) => healthBand(a.healthScore) === "watching",
  ).length;
  const totalFollowers = accounts.reduce((sum, a) => sum + a.followers, 0);
  const liveReports = reports.filter((r) => r.status === "live").length;

  const topAccount = useMemo(
    () => [...accounts].sort((a, b) => b.healthScore - a.healthScore)[0],
    [accounts],
  );

  const filtered = useMemo(
    () =>
      [...accounts]
        .filter((a) => matchFilter(a, filter))
        .sort((a, b) => b.healthScore - a.healthScore),
    [accounts, filter],
  );

  const stats: Stat[] = [
    { label: "Accounts", value: accounts.length.toString() },
    {
      label: "Avg health",
      value: avgHealth.toString(),
      trend: { kind: "good", label: "↑4.2" },
    },
    { label: "Categories", value: CATEGORIES.length.toString() },
    { label: "Live reports", value: liveReports.toString() },
    {
      label: "Movers",
      value: moversCount.toString(),
      trend: { kind: "neutral", label: "≥20%" },
    },
    {
      label: "Reach",
      value: compactNumber(totalFollowers),
      trend: { kind: "good", label: "↑18%" },
    },
  ];

  return (
    <>
      <section className="mb-4">
        <h1 className="t-display-1 uppercase text-ink">Dashboard</h1>
        <p className="mt-1 t-small text-ink-3">
          Live snapshot of every monitored account in this project.
        </p>
      </section>

      {topAccount && (
        <section className="mb-2">
          <TopHealthTile account={topAccount} />
        </section>
      )}

      <section className="mb-7">
        <StatsGrid stats={stats} />
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
        <div className="mb-2 px-1">
          <MetricLegend />
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
    </>
  );
}

function TopHealthTile({ account }: { account: Account }) {
  const trendUp = account.trendDelta >= 0;
  return (
    <Link
      href={`/accounts/${account.id}`}
      className="tap-row block rounded-md border border-accent-line bg-accent-soft p-4 transition-colors duration-[120ms] hover:bg-accent-soft hover:opacity-95"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="t-micro text-ink-3">Top health</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              data-numeric
              className="leading-none text-ink"
              style={{
                fontFamily: "var(--font-unbounded)",
                fontWeight: 800,
                fontSize: 44,
                letterSpacing: "-0.015em",
              }}
            >
              {account.healthScore}
            </span>
            <span
              data-numeric
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                trendUp ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
              }`}
            >
              {trendUp ? "↑" : "↓"}
              {Math.abs(account.trendDelta).toFixed(1)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 t-small text-ink">
            <span className="truncate font-semibold">{account.handle}</span>
            <span className="text-ink-3">·</span>
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <span
                aria-hidden
                className={`inline-block h-1.5 w-1.5 rounded-full ${CATEGORY_COLOR[account.category]}`}
              />
              {CATEGORY_LABEL[account.category]}
            </span>
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
