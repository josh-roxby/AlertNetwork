"use client";

import Link from "next/link";
import { StatsGrid, type Stat } from "@/components/stats-grid";
import { AccountRow } from "@/components/account-row";
import { AddAccountTile } from "@/components/add-account-tile";
import { IconPlus } from "@/components/icons";
import {
  SkeletonAccountList,
  SkeletonStatsGrid,
} from "@/components/skeletons";
import { useShell, useActiveProject } from "@/components/shell-context";
import { relativeDate } from "@/lib/format";

export default function DashboardPage() {
  const {
    activeProjectId,
    categories,
    accounts,
    accountsLoading,
    openSheet,
  } = useShell();
  const project = useActiveProject();

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

  const stats: Stat[] = [
    { label: "Accounts", value: accounts.length.toString() },
    { label: "Categories", value: categories.length.toString() },
    {
      label: "Last scrape",
      value: mostRecentScrape ? relativeDate(mostRecentScrape) : "Pending",
    },
    { label: "Live reports", value: "—" },
  ];

  return (
    <>
      <section className="mb-4">
        <h1 className="t-display-1 uppercase text-ink">Dashboard</h1>
        <p className="mt-1 t-small text-ink-3">
          {project?.name ?? "Workspace"} — every account in this project.
        </p>
      </section>

      {!mostRecentScrape && (
        <section className="mb-4 rounded-md border border-accent-line bg-accent-soft px-3 py-2.5 t-small text-accent">
          First scrape pending. Metrics will appear after the next daily run
          (08:00 UTC).
        </section>
      )}

      <section className="mb-7">
        <StatsGrid stats={stats} />
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
