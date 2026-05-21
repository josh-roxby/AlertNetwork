"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAccount, triggerAccountScrape } from "@/lib/data/accounts";
import { dailySeries, listPostsForAccount } from "@/lib/data/posts";
import { paletteBg } from "@/lib/data/palette";
import {
  BAND_BG,
  BAND_LABEL,
  BAND_TONE,
  computeAccountHealth,
} from "@/lib/data/health";
import { compactNumber, percent, relativeDate } from "@/lib/format";
import {
  CHART_MARGIN,
  ChartCard,
  ChartTooltip,
  X_AXIS,
  Y_AXIS,
} from "@/components/charts";
import { SkeletonAccountDetail } from "@/components/skeletons";
import { TabNav } from "@/components/tab-nav";
import { useShell, useActiveProject } from "@/components/shell-context";
import { IconChevronRight } from "@/components/icons";
import type { AccountView, PostRow } from "@/lib/data/types";

type ChartRange = "7d" | "30d" | "90d";
const RANGE_DAYS: Record<ChartRange, number> = { "7d": 7, "30d": 30, "90d": 90 };
type DetailTab = "charts" | "posts";

export function AccountDetail({ accountId }: { accountId: string }) {
  const { refreshAccounts, refreshPosts, openSheet, canManage } = useShell();
  const project = useActiveProject();
  const [account, setAccount] = useState<AccountView | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [tab, setTab] = useState<DetailTab>("charts");
  const [range, setRange] = useState<ChartRange>("30d");
  const [scrapeState, setScrapeState] = useState<
    | { kind: "idle" }
    | { kind: "scraping" }
    | { kind: "done"; scanned: number; written: number }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const reload = useCallback(async () => {
    const row = await getAccount(accountId);
    if (!row) {
      setStatus("missing");
      return;
    }
    setAccount(row);
    setStatus("ready");
    try {
      // 120-day window covers the 7/30/90d chart selector with
      // headroom while keeping the payload bounded.
      const ps = await listPostsForAccount(accountId, {
        sinceHours: 24 * 120,
      });
      setPosts(ps);
    } catch {
      setPosts([]);
    }
  }, [accountId]);

  // Initial fetch — toggling status from "loading" to "ready/missing"
  // is the explicit purpose of this effect, so the cascading setState
  // is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    reload().catch(() => {
      if (!cancelled) setStatus("missing");
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function rescan() {
    setScrapeState({ kind: "scraping" });
    // 0 = no time filter; write every post Apify returns. Same as
    // AddAccountSheet's initial backfill.
    const result = await triggerAccountScrape(accountId, 0);
    if (result.ok) {
      setScrapeState({
        kind: "done",
        scanned: result.scanned,
        written: result.written,
      });
      await reload();
      await refreshAccounts();
      await refreshPosts();
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

  const health = computeAccountHealth(posts, project?.health_config);
  const hasPosts = posts.length > 0;
  const trendUp = health.trendDelta >= 0;
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
        {canManage && (
          <button
            type="button"
            onClick={() =>
              openSheet({ kind: "editAccount", accountId: account.id })
            }
            className="tap-btn inline-flex shrink-0 items-center gap-1 rounded-full border border-line-2 bg-surface px-3 py-1.5 t-small font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Edit
          </button>
        )}
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-1.5">
        <Chip>
          <span
            aria-hidden
            className={`inline-block h-2 w-2 rounded-full ${paletteClass}`}
          />
          {account.category?.label ?? "Uncategorised"}
        </Chip>
        {hasPosts && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${BAND_BG[health.band]}`}
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            {BAND_LABEL[health.band]}
          </span>
        )}
        {account.tagLabels.map((t) => (
          <Chip key={t}>#{t}</Chip>
        ))}
      </section>

      {hasPosts && (
        <section className="mb-5 grid grid-cols-2 gap-2">
          <HealthCell health={health.healthScore} band={health.band} />
          <TrendCell delta={health.trendDelta} up={trendUp} />
        </section>
      )}

      <section className="mb-5 grid grid-cols-2 gap-2">
        <StatCell
          label="Posts (30d)"
          value={hasPosts ? health.postCount.toString() : "—"}
        />
        <StatCell
          label="Total views"
          value={hasPosts ? compactNumber(health.totalViews) : "—"}
        />
        <StatCell
          label="Median views"
          value={hasPosts ? compactNumber(health.medianViews) : "—"}
        />
        <StatCell
          label="Engagement"
          value={hasPosts ? percent(health.engagementRate, 1) : "—"}
        />
        <StatCell
          label="Posts / week"
          value={hasPosts ? health.postsPerWeek.toFixed(1) : "—"}
        />
        <StatCell
          label="Last scrape"
          value={
            account.last_scraped_at
              ? relativeDate(account.last_scraped_at)
              : "Pending"
          }
        />
      </section>

      <section className="mb-5 flex flex-col gap-2 sm:flex-row">
        <a
          href={account.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-btn flex flex-1 items-center justify-center gap-2 rounded-sm bg-accent px-4 py-3 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          View on platform
          <span aria-hidden>↗</span>
        </a>
        {canManage && (
          <button
            type="button"
            onClick={rescan}
            disabled={scrapeState.kind === "scraping"}
            className="tap-btn inline-flex items-center justify-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-4 py-3 t-body font-medium text-ink hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
          >
            {scrapeState.kind === "scraping" ? "Scraping…" : "Rescan now"}
          </button>
        )}
      </section>

      {scrapeState.kind === "done" && (
        <p className="mb-4 rounded-sm border border-good bg-good-soft px-3 py-2 t-small text-good">
          Scanned {scrapeState.scanned}, wrote {scrapeState.written} post
          {scrapeState.written === 1 ? "" : "s"}.
        </p>
      )}
      {scrapeState.kind === "error" && (
        <p
          className="mb-4 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
          role="alert"
        >
          {scrapeState.message}
        </p>
      )}

      <section className="mb-3">
        <TabNav<"charts" | "posts">
          tabs={[
            { id: "charts", label: "Charts" },
            { id: "posts", label: `Posts · ${posts.length}` },
          ]}
          active={tab}
          onChange={setTab}
        />
      </section>

      {tab === "charts" ? (
        <ChartsPanel posts={posts} range={range} onRange={setRange} />
      ) : (
        <section>
          {posts.length === 0 ? (
            <div className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-8 text-center">
              <p className="t-body text-ink-2">No posts cached yet.</p>
              <p className="mx-auto mt-1 max-w-[36ch] t-small text-ink-3">
                Hit Rescan now to fetch the last 7 days from TikTok, or wait
                for the daily cron at 08:00 UTC.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {posts.map((p) => (
                <li key={p.id}>
                  <PostRowCard post={p} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

function ChartsPanel({
  posts,
  range,
  onRange,
}: {
  posts: PostRow[];
  range: ChartRange;
  onRange: (r: ChartRange) => void;
}) {
  const series = useMemo(
    () => dailySeries(posts, RANGE_DAYS[range]),
    [posts, range],
  );

  const hasAny = posts.length > 0;

  return (
    <>
      <section className="mb-3 flex items-center justify-between">
        <h2 className="t-h1 text-ink">Trends</h2>
        <RangeSelector value={range} onChange={onRange} />
      </section>

      {!hasAny ? (
        <div className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-10 text-center">
          <p className="t-body text-ink-2">No data to chart yet.</p>
          <p className="mx-auto mt-1 max-w-[36ch] t-small text-ink-3">
            Run a scrape — once posts land in the DB the charts plot daily
            views, engagement and post frequency.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ChartCard
            label="Daily views"
            value={compactNumber(series.reduce((s, p) => s + p.views, 0))}
            valueLabel={`total · ${range}`}
            chart={
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={series} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id="views-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis {...X_AXIS} />
                  <YAxis
                    {...Y_AXIS}
                    width={36}
                    tickFormatter={(v: number) => compactNumber(v)}
                  />
                  <Tooltip content={<ChartTooltip formatter={compactNumber} />} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#views-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            }
          />

          <ChartCard
            label="Engagement rate"
            value={percent(
              series.reduce((s, p) => s + p.engagement, 0) / series.length,
              1,
            )}
            valueLabel="avg per day"
            chart={
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={series} margin={CHART_MARGIN}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis {...X_AXIS} />
                  <YAxis
                    {...Y_AXIS}
                    width={36}
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip formatter={(n: number) => percent(n, 1)} />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    stroke="var(--good)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            }
          />

          <ChartCard
            label="Posts per day"
            value={series.reduce((s, p) => s + p.posts, 0).toString()}
            valueLabel={`total · ${range}`}
            chart={
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={series} margin={CHART_MARGIN}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis {...X_AXIS} />
                  <YAxis
                    {...Y_AXIS}
                    width={28}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="posts" fill="var(--info)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            }
          />

          <ChartCard
            label="Likes per day"
            value={compactNumber(series.reduce((s, p) => s + p.likes, 0))}
            valueLabel={`total · ${range}`}
            chart={
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={series} margin={CHART_MARGIN}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis {...X_AXIS} />
                  <YAxis
                    {...Y_AXIS}
                    width={32}
                    tickFormatter={(v: number) => compactNumber(v)}
                  />
                  <Tooltip content={<ChartTooltip formatter={compactNumber} />} />
                  <Line
                    type="monotone"
                    dataKey="likes"
                    stroke="var(--ink)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            }
          />
        </div>
      )}
    </>
  );
}

function RangeSelector({
  value,
  onChange,
}: {
  value: ChartRange;
  onChange: (r: ChartRange) => void;
}) {
  const options: ChartRange[] = ["7d", "30d", "90d"];
  return (
    <div className="inline-flex rounded-sm border border-line-2 bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`tap-btn rounded-xs px-2.5 py-1 t-small font-medium transition-colors duration-[120ms] ${
            o === value ? "bg-bg text-ink" : "text-ink-3 hover:text-ink"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function PostRowCard({ post }: { post: PostRow }) {
  const inner = (
    <div className="tap-row flex items-start gap-3 rounded-md border border-line bg-surface px-3 py-3 hover:bg-surface-2">
      <span className="min-w-0 flex-1">
        <span
          className="block t-body text-ink"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.caption?.trim() || "(no caption)"}
        </span>
        <span
          data-numeric
          className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 t-meta text-ink-3"
          style={{ fontSize: 10 }}
        >
          <span>{compactNumber(post.views)} views</span>
          <span>{compactNumber(post.likes)} likes</span>
          <span>{compactNumber(post.comments)} comments</span>
          <span>{compactNumber(post.shares)} shares</span>
        </span>
        <span
          className="mt-1 block t-meta text-ink-4"
          style={{ fontSize: 10 }}
        >
          {relativeDate(post.posted_at)}
        </span>
      </span>
      {post.url && <IconChevronRight className="mt-1 shrink-0 text-ink-3" />}
    </div>
  );

  return post.url ? (
    <a href={post.url} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}

function HealthCell({
  health,
  band,
}: {
  health: number;
  band: keyof typeof BAND_TONE;
}) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-3">
      <div className="t-micro text-ink-3">Health</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          data-numeric
          className={`leading-none ${BAND_TONE[band]}`}
          style={{
            fontFamily: "var(--font-unbounded)",
            fontWeight: 800,
            fontSize: 32,
            letterSpacing: "-0.015em",
          }}
        >
          {health}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-0.5 ${BAND_BG[band]}`}
          style={{ fontSize: 10, fontWeight: 600 }}
        >
          {BAND_LABEL[band]}
        </span>
      </div>
    </div>
  );
}

function TrendCell({ delta, up }: { delta: number; up: boolean }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-3">
      <div className="t-micro text-ink-3">Trend WoW</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          data-numeric
          className={`leading-none ${up ? "text-good" : "text-bad"}`}
          style={{
            fontFamily: "var(--font-unbounded)",
            fontWeight: 800,
            fontSize: 32,
            letterSpacing: "-0.015em",
          }}
        >
          {up ? "↑" : "↓"}
          {Math.abs(delta).toFixed(1)}
          <span style={{ fontSize: 18 }}>%</span>
        </span>
      </div>
      <div className="mt-0.5 t-micro text-ink-3">vs prior 7 days · median</div>
    </div>
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
          fontSize: 22,
        }}
      >
        {value}
      </div>
    </div>
  );
}
