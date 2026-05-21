"use client";

import { useRouter } from "next/navigation";
import { useShell, useActiveProject } from "@/components/shell-context";
import { compactNumber, percent, relativeDate } from "@/lib/format";
import { paletteBg } from "@/lib/data/palette";
import {
  BAND_TONE,
  computeAccountHealth,
} from "@/lib/data/health";
import { IconExternalLink } from "@/components/icons";
import type { AccountView, PostRow } from "@/lib/data/types";

// Width-pinned to keep the right column from squeezing the metric
// copy. Mirrors the legacy AccountRow layout (avatar + 2-line meta +
// health column).
const HEALTH_COL_MIN_WIDTH = 56;
const TREND_WINDOW = "WoW";

export function AccountRow({ account }: { account: AccountView }) {
  const { postsByAccount } = useShell();
  const project = useActiveProject();
  const router = useRouter();
  const posts = postsByAccount.get(account.id) ?? ([] as PostRow[]);
  const health = computeAccountHealth(posts, project?.health_config);
  const hasPosts = posts.length > 0;

  // The whole row navigates to the account detail. We render the
  // row as a button/div (not <a>) so the desktop-only "open on
  // platform" can sit inside as its own <a> without nesting
  // anchors. Keyboard users get tab + Enter via the role/tabIndex.
  function openDetail() {
    router.push(`/accounts/${account.id}`);
  }

  const initial =
    account.handle.replace(/^@/, "").charAt(0).toUpperCase() || "?";
  const palette = paletteBg(account.category?.palette_id);
  const categoryLabel = account.category?.label ?? "Uncategorised";
  const tagLabels = account.tagLabels.slice(0, 2);
  const trendUp = health.trendDelta >= 0;
  const tone = BAND_TONE[health.band];

  return (
    // Rendered as div+role=link so the desktop external <a> can sit
    // inside as a normal child (no nested anchors). Enter/Space
    // trigger navigation for keyboard users.
    <div
      role="link"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetail();
        }
      }}
      className="tap-row group flex w-full cursor-pointer items-center gap-3 rounded-md border border-line bg-surface px-3 py-3 text-left transition-colors duration-[120ms] hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 ring-1 ring-line">
        <span
          className="t-h2 text-ink"
          style={{ fontFamily: "var(--font-unbounded)" }}
        >
          {initial}
        </span>
        <span
          aria-hidden
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface ${palette}`}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="t-body block truncate font-semibold text-ink">
          {account.handle}
        </span>
        <span
          data-numeric
          className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 text-[10px] text-ink-3"
        >
          {hasPosts ? (
            <>
              <Metric prefix="Med" value={compactNumber(health.medianViews)} />
              <Sep />
              <Metric prefix="Tot" value={compactNumber(health.totalViews)} />
              <Sep />
              <Metric
                prefix="ER"
                value={percent(health.engagementRate, 1)}
              />
              <Sep />
              <span className="truncate">{categoryLabel}</span>
              {tagLabels.length > 0 && (
                <>
                  <Sep />
                  <span className="truncate">
                    {tagLabels.map((t) => `#${t}`).join(" ")}
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <span className="truncate">{categoryLabel}</span>
              {tagLabels.length > 0 && (
                <>
                  <Sep />
                  <span className="truncate">
                    {tagLabels.map((t) => `#${t}`).join(" ")}
                  </span>
                </>
              )}
              <Sep />
              <span>
                {account.last_scraped_at
                  ? `Scraped ${relativeDate(account.last_scraped_at)}`
                  : "First scrape pending"}
              </span>
            </>
          )}
        </span>
      </span>

      <span
        className="flex shrink-0 flex-col items-end"
        style={{ minWidth: HEALTH_COL_MIN_WIDTH }}
      >
        {hasPosts ? (
          <>
            <span
              data-numeric
              className={`t-display-3 leading-none ${tone}`}
            >
              {health.healthScore}
            </span>
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                trendUp ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
              }`}
            >
              <span data-numeric>
                {trendUp ? "↑" : "↓"}
                {Math.abs(health.trendDelta).toFixed(1)}
              </span>
              <span
                className="opacity-70"
                style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.05em" }}
              >
                {TREND_WINDOW}
              </span>
            </span>
          </>
        ) : (
          <span
            className="t-meta text-ink-3"
            style={{ fontSize: 10, letterSpacing: "0.08em" }}
          >
            NO DATA
          </span>
        )}
      </span>

      {/* Desktop-only "open on platform" affordance. Themed neutral
          (not yellow) so it doesn't compete with the primary row
          click target. stopPropagation prevents the parent row's
          click handler from also firing. */}
      <a
        href={account.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label={`Open ${account.handle} on TikTok`}
        title="Open on TikTok"
        className="tap-btn ml-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-line-2 bg-surface text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 hover:bg-surface-2 hover:text-ink lg:inline-flex"
      >
        <IconExternalLink />
      </a>
    </div>
  );
}

function Metric({ prefix, value }: { prefix: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="text-ink-4" style={{ fontWeight: 600 }}>
        {prefix}
      </span>
      <span className="text-ink-2">{value}</span>
    </span>
  );
}

function Sep() {
  return (
    <span aria-hidden className="text-ink-4">
      ·
    </span>
  );
}
