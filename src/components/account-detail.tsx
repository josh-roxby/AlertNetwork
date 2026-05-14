"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccount, triggerAccountScrape } from "@/lib/data/accounts";
import { paletteBg } from "@/lib/data/palette";
import { relativeDate } from "@/lib/format";
import { SkeletonAccountDetail } from "@/components/skeletons";
import { useShell } from "@/components/shell-context";
import type { AccountView } from "@/lib/data/types";

export function AccountDetail({ accountId }: { accountId: string }) {
  const { refreshAccounts } = useShell();
  const [account, setAccount] = useState<AccountView | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [scrapeState, setScrapeState] = useState<
    | { kind: "idle" }
    | { kind: "scraping" }
    | { kind: "done"; scanned: number; written: number }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    getAccount(accountId)
      .then((row) => {
        if (cancelled) return;
        if (row) {
          setAccount(row);
          setStatus("ready");
        } else {
          setStatus("missing");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  async function rescan() {
    setScrapeState({ kind: "scraping" });
    const result = await triggerAccountScrape(accountId, 24 * 7);
    if (result.ok) {
      setScrapeState({
        kind: "done",
        scanned: result.scanned,
        written: result.written,
      });
      // Re-pull the account so last_scraped_at picks up.
      const fresh = await getAccount(accountId);
      if (fresh) setAccount(fresh);
      await refreshAccounts();
    } else {
      setScrapeState({ kind: "error", message: result.error });
    }
  }

  if (status === "loading") {
    return <SkeletonAccountDetail />;
  }

  if (status === "missing" || !account) {
    return (
      <div className="rounded-md border border-line bg-surface px-4 py-8 text-center">
        <p className="t-body text-ink-2">Account not found.</p>
        <Link
          href="/accounts"
          className="tap-btn mt-3 inline-block t-small text-accent hover:opacity-80"
        >
          ← Back to accounts
        </Link>
      </div>
    );
  }

  const paletteClass = paletteBg(account.category?.palette_id);
  const initial =
    account.handle.replace(/^@/, "").charAt(0).toUpperCase() || "?";

  return (
    <>
      <section className="mb-4 flex items-start gap-3">
        <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 ring-1 ring-line">
          <span
            className="text-ink"
            style={{
              fontFamily: "var(--font-unbounded)",
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            {initial}
          </span>
          <span
            aria-hidden
            className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ring-2 ring-bg ${paletteClass}`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="t-display-3 truncate uppercase text-ink">
            {account.display_name ?? account.handle.replace(/^@/, "")}
          </h1>
          <div className="mt-0.5 t-body truncate text-ink-3">
            {account.handle}
          </div>
        </div>
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-1.5">
        <Chip>
          <span
            aria-hidden
            className={`inline-block h-2 w-2 rounded-full ${paletteClass}`}
          />
          {account.category?.label ?? "Uncategorised"}
        </Chip>
        {account.tagLabels.map((t) => (
          <Chip key={t}>#{t}</Chip>
        ))}
      </section>

      <section className="mb-5 grid grid-cols-2 gap-2">
        <StatCell
          label="Followers"
          value={account.followers ? account.followers.toString() : "—"}
        />
        <StatCell
          label="Last scrape"
          value={
            account.last_scraped_at
              ? relativeDate(account.last_scraped_at)
              : "Pending"
          }
        />
        <StatCell label="Median views" value="—" />
        <StatCell label="Engagement" value="—" />
      </section>

      <section className="mb-5">
        <a
          href={account.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-btn flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 py-3 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          View on platform
          <span aria-hidden>↗</span>
        </a>
      </section>

      <section className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-6 text-center">
        <h2 className="t-h2 text-ink">
          {account.last_scraped_at ? "Last scrape" : "No scrape data yet"}
        </h2>
        <p className="mx-auto mt-2 max-w-[36ch] t-small text-ink-2">
          {account.last_scraped_at
            ? `Most recent run ${relativeDate(account.last_scraped_at)}. Per-post charts land in a later round.`
            : "Per-post metrics appear after the first successful scrape. Trigger one now or wait for the 08:00 UTC daily run."}
        </p>
        <button
          type="button"
          onClick={rescan}
          disabled={scrapeState.kind === "scraping"}
          className="tap-btn mt-4 inline-flex items-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-4 py-2 t-small font-medium text-ink hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scrapeState.kind === "scraping" ? "Scraping…" : "Rescan now"}
        </button>
        {scrapeState.kind === "done" && (
          <p className="mt-3 t-small text-good">
            Scanned {scrapeState.scanned}, wrote {scrapeState.written} post
            {scrapeState.written === 1 ? "" : "s"}.
          </p>
        )}
        {scrapeState.kind === "error" && (
          <p className="mt-3 t-small text-bad" role="alert">
            {scrapeState.message}
          </p>
        )}
      </section>
    </>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-2.5 py-1 text-ink-2"
      style={{ fontSize: 11 }}
    >
      {children}
    </span>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-3">
      <div className="t-micro text-ink-3">{label}</div>
      <div
        data-numeric
        className="mt-1 text-ink"
        style={{
          fontFamily: "var(--font-unbounded)",
          fontWeight: 800,
          fontSize: 24,
        }}
      >
        {value}
      </div>
    </div>
  );
}
