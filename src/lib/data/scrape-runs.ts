// Audit logging for every scrape invocation. Wraps the cron + manual
// scrape routes so we have a permanent record of: what fired, what
// triggered it, when it started/finished, what it wrote.
//
// Server-side only. All inserts use the service-role client so the
// public-facing RLS (super-admin SELECT only) doesn't block writes.

import "server-only";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ScrapeRunSource =
  | "vercel-cron"
  | "github-actions"
  | "pg-cron"
  | "manual"
  | "ui-rescan";

export type ScrapeRunStatus =
  | "running"
  | "success"
  | "failed"
  | "partial"
  | "skipped";

// Detect which trigger fired this request. We look at:
//   - `?source=` query param (the GH Actions workflow and pg_cron
//     both set this — they're under our control)
//   - User-Agent (Vercel cron sends one matching /vercel-cron/i)
//   - Default to "manual" — the catch-all for curl / scripts
export function detectSource(request: NextRequest): ScrapeRunSource {
  const explicit = new URL(request.url).searchParams.get("source");
  if (
    explicit === "vercel-cron" ||
    explicit === "github-actions" ||
    explicit === "pg-cron" ||
    explicit === "manual" ||
    explicit === "ui-rescan"
  ) {
    return explicit;
  }
  const ua = request.headers.get("user-agent") ?? "";
  if (/vercel-cron/i.test(ua)) return "vercel-cron";
  return "manual";
}

// Start a run. Inserts a `running` row and returns its id so the
// route can update it later. Never throws — auditing failure must
// not block the actual scrape.
export async function startScrapeRun(
  admin: SupabaseClient,
  args: {
    source: ScrapeRunSource;
    route: string;
    notes?: Record<string, unknown>;
  },
): Promise<string | null> {
  try {
    const { data, error } = await admin
      .from("scrape_runs")
      .insert({
        source: args.source,
        route: args.route,
        status: "running",
        notes: args.notes ?? null,
      })
      .select("id")
      .single();
    if (error) {
      console.warn(`[scrape-runs] insert failed: ${error.message}`);
      return null;
    }
    return data?.id as string;
  } catch (err) {
    console.warn(
      `[scrape-runs] insert threw: ${err instanceof Error ? err.message : err}`,
    );
    return null;
  }
}

// Finish a run with final counts + status. Idempotent on retry —
// the cron route can call this multiple times safely. No-op if
// `runId` is null (start failed, but we still want the route to
// complete).
export async function finishScrapeRun(
  admin: SupabaseClient,
  runId: string | null,
  args: {
    status: ScrapeRunStatus;
    accountsTotal?: number;
    accountsOk?: number;
    postsWritten?: number;
    apifyItems?: number;
    errorMessage?: string;
    notes?: Record<string, unknown>;
    startedAt: number; // ms epoch from Date.now()
  },
): Promise<void> {
  if (!runId) return;
  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - args.startedAt;
  try {
    await admin
      .from("scrape_runs")
      .update({
        status: args.status,
        finished_at: finishedAt.toISOString(),
        duration_ms: durationMs,
        accounts_total: args.accountsTotal ?? 0,
        accounts_ok: args.accountsOk ?? 0,
        posts_written: args.postsWritten ?? 0,
        apify_items: args.apifyItems ?? 0,
        error_message: args.errorMessage ?? null,
        notes: args.notes ?? null,
      })
      .eq("id", runId);
  } catch (err) {
    console.warn(
      `[scrape-runs] finish update failed: ${err instanceof Error ? err.message : err}`,
    );
  }
}

// Check whether the route ran successfully recently. Used by the
// cron handlers to dedup — if pg_cron, Vercel cron and GH Actions
// all fire within minutes of each other we only want one to do the
// actual work (Apify costs money per item).
//
// Returns the started_at of the most recent successful run within
// `windowMinutes`, or null if none.
export async function recentSuccessfulRun(
  admin: SupabaseClient,
  route: string,
  windowMinutes: number,
): Promise<string | null> {
  try {
    const cutoff = new Date(
      Date.now() - windowMinutes * 60 * 1000,
    ).toISOString();
    const { data } = await admin
      .from("scrape_runs")
      .select("started_at, status")
      .eq("route", route)
      .in("status", ["success", "partial"])
      .gte("started_at", cutoff)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.started_at as string | undefined) ?? null;
  } catch {
    return null;
  }
}
