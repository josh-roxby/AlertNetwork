// HTML + text email body for a report send.
//
// Renders from a stored `ReportSnapshotV1` (same payload backing the
// view page) so the email and the historical view-page are always in
// sync. Pure function — no I/O.
//
// Why hand-rolled HTML strings instead of React Email / MJML:
// Gmail, Outlook 365 and Apple Mail all strip <style> tags
// inconsistently. Inline styles are the only thing that renders the
// same across all three. The template is a single file so iteration
// is a one-file PR.
//
// The footer link always points to /reports/[id]/view?historyId=...
// so the recipient sees the same frozen snapshot, not live data.

import { compactNumber, percent } from "@/lib/format";
import type {
  ReportSnapshotV1,
  SnapshotAccount,
  SnapshotTotals,
} from "@/lib/data/report-snapshot";

const ukDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Token palette — mirrors the app's globals.css light theme so the
// email looks like a sibling of the in-app view. Inline-styles only.
const C = {
  bg: "#FAFAFA",
  surface: "#FFFFFF",
  surface2: "#F5F5F5",
  line: "#E5E5E5",
  ink: "#0A0A0A",
  ink2: "#525252",
  ink3: "#737373",
  ink4: "#A3A3A3",
  accent: "#FF6B35",
  accentInk: "#0A0A0A",
  goodBg: "#DCFCE7",
  goodInk: "#15803D",
  badBg: "#FEE2E2",
  badInk: "#B91C1C",
  neutralBg: "#F5F5F5",
  neutralInk: "#404040",
};

export type ReportEmailInput = {
  reportName: string;
  reportDescription: string | null;
  reportId: string;
  historyId: string | null;
  snapshot: ReportSnapshotV1;
  appUrl: string;
};

export type ReportEmailOutput = {
  subject: string;
  html: string;
  text: string;
};

export function renderReportEmail(input: ReportEmailInput): ReportEmailOutput {
  const sentLabel = ukDate.format(new Date(input.snapshot.generated_at));
  const cadenceLabel = cadenceLabelFor(input.snapshot);
  const subject = `${input.reportName} · ${cadenceLabel} · ${sentLabel}`;

  const viewUrl = buildViewUrl(input);

  return {
    subject,
    html: renderHtml({ ...input, sentLabel, cadenceLabel, viewUrl }),
    text: renderText({ ...input, sentLabel, cadenceLabel, viewUrl }),
  };
}

function cadenceLabelFor(s: ReportSnapshotV1): string {
  if (s.cadence === "weekly") return "Weekly insight · 7d";
  if (s.cadence === "monthly") return "Monthly insight · 30d";
  return `${s.window_days}d insight`;
}

function buildViewUrl(input: ReportEmailInput): string {
  const base = input.appUrl.replace(/\/$/, "");
  const path = `/reports/${input.reportId}/view`;
  const qs = input.historyId ? `?historyId=${input.historyId}` : "";
  return `${base}${path}${qs}`;
}

// HTML body — table-based layout, all inline styles. Tested against
// Gmail (web + iOS), Outlook 365 web, Apple Mail.
function renderHtml(
  input: ReportEmailInput & {
    sentLabel: string;
    cadenceLabel: string;
    viewUrl: string;
  },
): string {
  const { snapshot, reportName, reportDescription, sentLabel, cadenceLabel, viewUrl } =
    input;
  const t = snapshot.totals;

  // Sort accounts so the densest, healthiest ones lead.
  const accounts = [...snapshot.accounts].sort((a, b) => {
    const aScore = a.health.postCount > 0 ? a.health.healthScore : -1;
    const bScore = b.health.postCount > 0 ? b.health.healthScore : -1;
    if (bScore !== aScore) return bScore - aScore;
    return b.health.totalViews - a.health.totalViews;
  });

  const aggregateRows: Array<[string, string]> = [
    ["Views", compactNumber(t.total_views)],
    ["Likes", compactNumber(t.total_likes)],
    ["Comments", compactNumber(t.total_comments)],
    ["Shares", compactNumber(t.total_shares)],
    ["Saves", compactNumber(t.total_saves)],
    ["Posts", compactNumber(t.post_count)],
  ];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${escapeHtml(reportName)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};color:${C.ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(
    summarySentence(snapshot),
  )}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.bg};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:${C.surface};border:1px solid ${C.line};border-radius:12px;overflow:hidden;">

      <!-- header -->
      <tr><td style="padding:24px 28px 18px 28px;border-bottom:1px solid ${C.line};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-size:11px;letter-spacing:0.18em;color:${C.ink3};text-transform:uppercase;">Alert Network</td>
            <td align="right" style="font-size:11px;color:${C.ink3};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${sentLabel}</td>
          </tr>
        </table>
        <h1 style="margin:14px 0 0 0;font-size:24px;line-height:1.2;color:${C.ink};font-weight:800;">${escapeHtml(reportName)}</h1>
        <p style="margin:6px 0 0 0;font-size:12px;color:${C.ink3};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(cadenceLabel)}</p>
        ${
          reportDescription
            ? `<p style="margin:10px 0 0 0;font-size:14px;line-height:1.5;color:${C.ink2};">${escapeHtml(reportDescription)}</p>`
            : ""
        }
      </td></tr>

      <!-- aggregate channel totals (the screenshot's "24hr Metrics" pattern) -->
      <tr><td style="padding:20px 28px 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding-bottom:10px;">
              <span style="font-size:14px;font-weight:700;color:${C.ink};">${escapeHtml(`${snapshot.window_days}-day metrics`)}</span>
            </td>
            <td align="right" style="padding-bottom:10px;">
              ${renderDeltaPill(t, snapshot.prior_period_totals, "total_views", "views")}
            </td>
          </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.line};border-radius:8px;border-collapse:separate;border-spacing:0;">
          ${aggregateRows
            .map(
              ([label, value], i) => `
          <tr>
            <td style="padding:9px 12px;font-size:12px;color:${C.ink3};${i === 0 ? "" : `border-top:1px solid ${C.line};`}">${escapeHtml(label)}</td>
            <td align="right" style="padding:9px 12px;font-size:13px;color:${C.ink};font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;${i === 0 ? "" : `border-top:1px solid ${C.line};`}">${escapeHtml(value)}</td>
          </tr>`,
            )
            .join("")}
        </table>
      </td></tr>

      <!-- summary callouts: ER + avg health + period deltas -->
      <tr><td style="padding:14px 28px 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.line};border-radius:8px;">
          <tr>
            ${renderSummaryCell("Avg ER", t.engagement_rate > 0 ? percent(t.engagement_rate, 2) : "—", deltaForRate(t, snapshot.prior_period_totals))}
            ${renderSummaryCell("Avg health", t.covered_accounts > 0 ? String(t.avg_health) : "—", deltaForHealth(t, snapshot.prior_period_totals))}
            ${renderSummaryCell("Accounts", `${t.covered_accounts}/${t.account_count}`, null, true)}
          </tr>
        </table>
      </td></tr>

      <!-- per-account dense rows (header banner + stats grid) -->
      ${
        accounts.length > 0
          ? `
      <tr><td style="padding:20px 28px 0 28px;">
        <h2 style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.16em;color:${C.ink3};text-transform:uppercase;font-weight:600;">Accounts (${accounts.length})</h2>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${accounts.map((a) => renderAccountBlock(a)).join("")}
        </table>
      </td></tr>`
          : ""
      }

      ${
        snapshot.top_posts.length > 0
          ? `
      <tr><td style="padding:20px 28px 0 28px;">
        <h2 style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.16em;color:${C.ink3};text-transform:uppercase;font-weight:600;">Top posts</h2>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${snapshot.top_posts.map(renderPostRow).join("")}
        </table>
      </td></tr>`
          : ""
      }

      <!-- CTA -->
      <tr><td align="center" style="padding:28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border-radius:8px;background:${C.accent};">
            <a href="${escapeAttr(viewUrl)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:${C.accentInk};text-decoration:none;">View report online →</a>
          </td></tr>
        </table>
      </td></tr>

      <!-- footer -->
      <tr><td style="padding:18px 28px 24px 28px;border-top:1px solid ${C.line};">
        <p style="margin:0;font-size:11px;line-height:1.5;color:${C.ink4};">
          Sent by Alert Network · Covers the last ${snapshot.window_days} days of activity across ${t.account_count} account${t.account_count === 1 ? "" : "s"} · ${escapeHtml(sentLabel)}
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// One "block" per account: handle + health pill on a top row, then a
// 2x4 stats grid (Posts / Total Views / Total Eng / ER% over Mean / Median /
// Mode equivalent ("Top") / Last Post). Inspired by the screenshot
// layout but kept in our visual language.
function renderAccountBlock(a: SnapshotAccount): string {
  const bandTone = bandStyle();
  const meanViews =
    a.mean_views ??
    (a.health.postCount > 0
      ? Math.round(a.health.totalViews / a.health.postCount)
      : 0);
  const lastPostLabel = relativeAgeLabel(a.last_posted_at, a.health);

  const cells: Array<[string, string]> = [
    ["Posts", String(a.health.postCount)],
    ["Total views", compactNumber(a.health.totalViews)],
    ["Total eng.", compactNumber(a.health.totalEngagements)],
    ["ER%", a.health.engagementRate > 0 ? percent(a.health.engagementRate, 2) : "—"],
    ["Mean", compactNumber(meanViews)],
    ["Median", compactNumber(a.health.medianViews)],
    ["Per wk", a.health.postsPerWeek.toFixed(1)],
    ["Last post", lastPostLabel],
  ];

  return `
<tr><td style="padding-bottom:8px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.line};border-radius:8px;">
    <tr>
      <td style="padding:10px 12px 6px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td>
              <div style="font-size:14px;font-weight:700;color:${C.ink};">${escapeHtml(formatHandleDisplay(a.handle))}</div>
              ${a.category_label ? `<div style="margin-top:2px;font-size:11px;color:${C.ink3};">${escapeHtml(a.category_label)}</div>` : ""}
            </td>
            <td align="right">
              <span style="display:inline-block;padding:3px 8px;border-radius:999px;background:${bandTone.bg};color:${bandTone.ink};font-size:11px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">Health ${a.health.postCount > 0 ? a.health.healthScore : "—"}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:6px 4px 10px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${renderStatCells(cells)}
        </table>
      </td>
    </tr>
  </table>
</td></tr>`;
}

// 2 rows × 4 columns stats grid. Renders cells in pairs so each row
// stays the same width across email clients.
function renderStatCells(cells: Array<[string, string]>): string {
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 4) {
    const slice = cells.slice(i, i + 4);
    rows.push(
      `<tr>${slice
        .map(
          ([label, value]) => `
        <td width="25%" style="padding:6px 8px;vertical-align:top;">
          <div style="font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${C.ink4};">${escapeHtml(label)}</div>
          <div data-numeric style="margin-top:2px;font-size:13px;font-weight:700;color:${C.ink};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(value)}</div>
        </td>`,
        )
        .join("")}</tr>`,
    );
  }
  return rows.join("");
}

function renderPostRow(p: ReportSnapshotV1["top_posts"][number]): string {
  const caption = (p.caption ?? "").trim() || "(no caption)";
  const captionShort = caption.length > 140 ? caption.slice(0, 137) + "…" : caption;
  const inner = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.line};border-radius:8px;">
  <tr><td style="padding:10px 12px;">
    <div style="font-size:13px;line-height:1.45;color:${C.ink};">${escapeHtml(captionShort)}</div>
    <div style="margin-top:6px;font-size:11px;color:${C.ink3};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
      <span style="color:${C.ink2};">${escapeHtml(formatHandleDisplay(p.handle))}</span>
      &nbsp;·&nbsp; ${compactNumber(p.views)} views
      &nbsp;·&nbsp; ${compactNumber(p.likes)} likes
      &nbsp;·&nbsp; ${compactNumber(p.comments)} comments
    </div>
  </td></tr>
</table>`;
  return `<tr><td style="padding-bottom:6px;">${
    p.url
      ? `<a href="${escapeAttr(p.url)}" style="text-decoration:none;color:inherit;">${inner}</a>`
      : inner
  }</td></tr>`;
}

function renderSummaryCell(
  label: string,
  value: string,
  delta: { dir: "up" | "down" | "flat"; label: string } | null,
  last?: boolean,
): string {
  return `<td width="33%" style="padding:14px 12px;${last ? "" : `border-right:1px solid ${C.line};`}">
    <div style="font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${C.ink4};">${escapeHtml(label)}</div>
    <div data-numeric style="margin-top:4px;font-size:18px;font-weight:800;color:${C.ink};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(value)}</div>
    ${delta ? renderDeltaInline(delta) : ""}
  </td>`;
}

function renderDeltaInline(d: {
  dir: "up" | "down" | "flat";
  label: string;
}): string {
  const tone = deltaTone(d.dir);
  const arrow = d.dir === "up" ? "▲" : d.dir === "down" ? "▼" : "—";
  return `<div style="margin-top:4px;font-size:11px;font-weight:700;color:${tone.ink};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${arrow} ${escapeHtml(d.label)}</div>`;
}

// Pill version of a delta, used in the section header next to the
// "30-day metrics" / "7-day metrics" title.
function renderDeltaPill(
  current: SnapshotTotals,
  prior: SnapshotTotals | null | undefined,
  field: keyof SnapshotTotals,
  metricLabel: string,
): string {
  const d = deltaFor(current[field] as number, prior?.[field] as number | undefined);
  if (!d) return "";
  const tone = deltaTone(d.dir);
  const arrow = d.dir === "up" ? "▲" : d.dir === "down" ? "▼" : "—";
  return `<span style="display:inline-block;padding:3px 8px;border-radius:999px;background:${tone.bg};color:${tone.ink};font-size:11px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${arrow} ${escapeHtml(d.label)} ${escapeHtml(metricLabel)}</span>`;
}

function deltaForRate(
  current: SnapshotTotals,
  prior: SnapshotTotals | null | undefined,
): { dir: "up" | "down" | "flat"; label: string } | null {
  return deltaFor(current.engagement_rate, prior?.engagement_rate);
}
function deltaForHealth(
  current: SnapshotTotals,
  prior: SnapshotTotals | null | undefined,
): { dir: "up" | "down" | "flat"; label: string } | null {
  if (!prior || prior.covered_accounts === 0) return null;
  const diff = current.avg_health - prior.avg_health;
  if (current.covered_accounts === 0) return null;
  if (diff === 0) return { dir: "flat", label: "0" };
  return { dir: diff > 0 ? "up" : "down", label: `${diff > 0 ? "+" : ""}${diff}` };
}

function deltaFor(
  current: number,
  prior: number | undefined,
): { dir: "up" | "down" | "flat"; label: string } | null {
  if (prior === undefined || prior === null) return null;
  if (!Number.isFinite(prior) || prior === 0) {
    if (current === 0) return { dir: "flat", label: "0%" };
    return { dir: "up", label: "new" };
  }
  const pct = ((current - prior) / prior) * 100;
  if (Math.abs(pct) < 0.5) return { dir: "flat", label: "0%" };
  const label = `${pct > 0 ? "+" : ""}${pct.toFixed(pct >= 100 ? 0 : 1)}%`;
  return { dir: pct > 0 ? "up" : "down", label };
}

function deltaTone(dir: "up" | "down" | "flat"): { bg: string; ink: string } {
  if (dir === "up") return { bg: C.goodBg, ink: C.goodInk };
  if (dir === "down") return { bg: C.badBg, ink: C.badInk };
  return { bg: C.neutralBg, ink: C.neutralInk };
}

// Health pills are intentionally NOT colour-coded — same rationale as
// BAND_BG in src/lib/data/health.ts. The score number + label carry
// enough signal; tinting them green/red turns the email into a
// stoplight that's hard to read at a glance. Period-over-period
// deltas still use deltaTone() for ▲/▼ — that's separate from
// health-band tinting.
function bandStyle(): { bg: string; ink: string } {
  return { bg: C.neutralBg, ink: C.neutralInk };
}

function formatHandleDisplay(handle: string): string {
  const trimmed = handle.replace(/^@/, "");
  return `@${trimmed}`;
}

function relativeAgeLabel(
  lastPostedAt: string | null | undefined,
  health: SnapshotAccount["health"],
): string {
  if (!lastPostedAt) {
    return health.postCount === 0 ? "No posts" : "—";
  }
  const ms = Date.now() - new Date(lastPostedAt).getTime();
  if (ms < 0) return "now";
  const hours = ms / 3600_000;
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 10) return `${days.toFixed(1)}d`;
  return `${Math.round(days)}d`;
}

// Single-sentence summary used both as the preview text (hidden span
// up top, drives the inbox preheader) and elsewhere if needed.
function summarySentence(snapshot: ReportSnapshotV1): string {
  const t = snapshot.totals;
  const accountWord = t.account_count === 1 ? "account" : "accounts";
  if (t.covered_accounts === 0) {
    return `No posts recorded for ${t.account_count} ${accountWord} in the last ${snapshot.window_days} days.`;
  }
  const viewsPart =
    t.total_views > 0
      ? `${compactNumber(t.total_views)} total views`
      : "no views recorded";
  const erPart =
    t.engagement_rate > 0 ? `${percent(t.engagement_rate, 2)} engagement` : "";
  const healthPart = `average health ${t.avg_health}`;
  return `${t.account_count} ${accountWord} covered. ${viewsPart}${erPart ? ", " + erPart : ""}, ${healthPart}.`;
}

// Plain-text alternative for clients that don't render HTML (or for
// spam-filter scoring). Kept aligned with the HTML sections so the
// information set is identical.
function renderText(
  input: ReportEmailInput & {
    sentLabel: string;
    cadenceLabel: string;
    viewUrl: string;
  },
): string {
  const { snapshot, reportName, reportDescription, sentLabel, cadenceLabel, viewUrl } =
    input;
  const t = snapshot.totals;
  const accounts = [...snapshot.accounts].sort(
    (a, b) => b.health.healthScore - a.health.healthScore,
  );

  const lines: string[] = [];
  lines.push(reportName);
  lines.push(`${cadenceLabel} · ${sentLabel}`);
  if (reportDescription) lines.push(reportDescription);
  lines.push("");
  lines.push(summarySentence(snapshot));
  lines.push("");
  lines.push(`${snapshot.window_days}-DAY METRICS`);
  lines.push("--------------");
  lines.push(`Views        ${compactNumber(t.total_views)}`);
  lines.push(`Likes        ${compactNumber(t.total_likes)}`);
  lines.push(`Comments     ${compactNumber(t.total_comments)}`);
  lines.push(`Shares       ${compactNumber(t.total_shares)}`);
  lines.push(`Saves        ${compactNumber(t.total_saves)}`);
  lines.push(`Posts        ${compactNumber(t.post_count)}`);
  lines.push(
    `Avg ER       ${t.engagement_rate > 0 ? percent(t.engagement_rate, 2) : "—"}`,
  );
  lines.push(
    `Avg health   ${t.covered_accounts > 0 ? t.avg_health : "—"}`,
  );
  lines.push(`Accounts     ${t.covered_accounts}/${t.account_count}`);

  if (accounts.length > 0) {
    lines.push("");
    lines.push("ACCOUNTS");
    lines.push("--------");
    for (const a of accounts) {
      const meanViews =
        a.mean_views ??
        (a.health.postCount > 0
          ? Math.round(a.health.totalViews / a.health.postCount)
          : 0);
      lines.push(
        `@${a.handle.replace(/^@/, "")}  health ${a.health.postCount > 0 ? a.health.healthScore : "—"}`,
      );
      lines.push(
        `  posts ${a.health.postCount}  views ${compactNumber(a.health.totalViews)}  ` +
          `eng ${compactNumber(a.health.totalEngagements)}  er ${a.health.engagementRate > 0 ? percent(a.health.engagementRate, 2) : "—"}`,
      );
      lines.push(
        `  mean ${compactNumber(meanViews)}  median ${compactNumber(a.health.medianViews)}  ` +
          `last ${relativeAgeLabel(a.last_posted_at, a.health)}`,
      );
    }
  }

  if (snapshot.top_posts.length > 0) {
    lines.push("");
    lines.push("TOP POSTS");
    lines.push("---------");
    for (const p of snapshot.top_posts) {
      const caption = (p.caption ?? "(no caption)").replace(/\s+/g, " ").trim();
      const short = caption.length > 80 ? caption.slice(0, 77) + "…" : caption;
      lines.push(`@${p.handle.replace(/^@/, "")} — ${compactNumber(p.views)} views`);
      lines.push(`  ${short}`);
      if (p.url) lines.push(`  ${p.url}`);
    }
  }

  lines.push("");
  lines.push("View report online:");
  lines.push(viewUrl);
  lines.push("");
  lines.push("--");
  lines.push("Sent by Alert Network");
  return lines.join("\n");
}

// Minimal HTML-safety helpers. We only ever interpolate trusted data
// (account handles, captions, report names) but escape defensively.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
