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
import type { ReportSnapshotV1 } from "@/lib/data/report-snapshot";

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
  const subject = `${input.reportName} · ${input.snapshot.window_days}d · ${sentLabel}`;

  const viewUrl = buildViewUrl(input);

  return {
    subject,
    html: renderHtml({ ...input, sentLabel, viewUrl }),
    text: renderText({ ...input, sentLabel, viewUrl }),
  };
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
  input: ReportEmailInput & { sentLabel: string; viewUrl: string },
): string {
  const { snapshot, reportName, reportDescription, sentLabel, viewUrl } = input;
  const t = snapshot.totals;

  const topPerformers = snapshot.accounts
    .filter((a) => a.health.postCount > 0)
    .sort((a, b) => b.health.healthScore - a.health.healthScore)
    .slice(0, 5);

  const overviewRows: Array<[string, string]> = [
    ["Window", `${snapshot.window_days} days`],
    ["Accounts", String(t.account_count)],
    ["Posts", compactNumber(t.post_count)],
    ["Total views", t.total_views > 0 ? compactNumber(t.total_views) : "—"],
    [
      "Avg engagement",
      t.engagement_rate > 0 ? percent(t.engagement_rate, 2) : "—",
    ],
    ["Avg health", t.covered_accounts > 0 ? String(t.avg_health) : "—"],
    ["Top score", t.top_score > 0 ? String(t.top_score) : "—"],
    ["Movers (≥8%)", String(t.movers_count)],
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
      <tr><td style="padding:24px 28px 16px 28px;border-bottom:1px solid ${C.line};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-size:11px;letter-spacing:0.18em;color:${C.ink3};text-transform:uppercase;">Alert Network · Report</td>
            <td align="right" style="font-size:11px;color:${C.ink3};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${sentLabel}</td>
          </tr>
        </table>
        <h1 style="margin:14px 0 0 0;font-size:24px;line-height:1.2;color:${C.ink};font-weight:800;">${escapeHtml(reportName)}</h1>
        ${
          reportDescription
            ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:1.5;color:${C.ink2};">${escapeHtml(reportDescription)}</p>`
            : ""
        }
      </td></tr>

      <!-- summary sentence -->
      <tr><td style="padding:20px 28px 0 28px;">
        <p style="margin:0;font-size:14px;line-height:1.55;color:${C.ink2};">${escapeHtml(summarySentence(snapshot))}</p>
      </td></tr>

      <!-- overview table -->
      <tr><td style="padding:20px 28px 0 28px;">
        <h2 style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.16em;color:${C.ink3};text-transform:uppercase;font-weight:600;">Overview</h2>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.line};border-radius:8px;border-collapse:separate;border-spacing:0;">
          ${overviewRows
            .map(
              ([label, value], i) => `
          <tr>
            <td style="padding:9px 12px;font-size:12px;color:${C.ink3};${i === 0 ? "" : `border-top:1px solid ${C.line};`}">${escapeHtml(label)}</td>
            <td align="right" style="padding:9px 12px;font-size:12px;color:${C.ink};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;${i === 0 ? "" : `border-top:1px solid ${C.line};`}">${escapeHtml(value)}</td>
          </tr>`,
            )
            .join("")}
        </table>
      </td></tr>

      ${
        topPerformers.length > 0
          ? `
      <!-- top performers -->
      <tr><td style="padding:20px 28px 0 28px;">
        <h2 style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.16em;color:${C.ink3};text-transform:uppercase;font-weight:600;">Top performers</h2>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${topPerformers.map((a) => renderAccountRow(a)).join("")}
        </table>
      </td></tr>`
          : ""
      }

      ${
        snapshot.top_posts.length > 0
          ? `
      <!-- top posts -->
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
          Sent by Alert Network. This report covers the last ${snapshot.window_days} days of activity across ${t.account_count} account${t.account_count === 1 ? "" : "s"}. View this same snapshot any time at the link above.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function renderAccountRow(a: ReportSnapshotV1["accounts"][number]): string {
  const bandTone = bandStyle(a.health.band);
  const stats =
    a.health.postCount > 0
      ? `${compactNumber(a.health.totalViews)} views · ${percent(a.health.engagementRate, 1)} ER · ${a.health.postCount} posts`
      : "No posts yet";
  return `
<tr><td style="padding-bottom:6px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.line};border-radius:8px;">
    <tr>
      <td style="padding:10px 12px;">
        <div style="font-size:13px;font-weight:600;color:${C.ink};">${escapeHtml(a.handle)}</div>
        <div style="margin-top:2px;font-size:11px;color:${C.ink3};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(stats)}</div>
      </td>
      <td align="right" style="padding:10px 12px;width:60px;">
        <span style="display:inline-block;padding:3px 8px;border-radius:999px;background:${bandTone.bg};color:${bandTone.ink};font-size:11px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${a.health.postCount > 0 ? a.health.healthScore : "—"}</span>
      </td>
    </tr>
  </table>
</td></tr>`;
}

function renderPostRow(p: ReportSnapshotV1["top_posts"][number]): string {
  const caption = (p.caption ?? "").trim() || "(no caption)";
  const captionShort = caption.length > 140 ? caption.slice(0, 137) + "…" : caption;
  const inner = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.line};border-radius:8px;">
  <tr><td style="padding:10px 12px;">
    <div style="font-size:13px;line-height:1.45;color:${C.ink};">${escapeHtml(captionShort)}</div>
    <div style="margin-top:6px;font-size:11px;color:${C.ink3};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
      <span style="color:${C.ink2};">${escapeHtml(p.handle ? "@" + p.handle.replace(/^@/, "") : "")}</span>
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

function bandStyle(band: ReportSnapshotV1["totals"]["avg_band"]): {
  bg: string;
  ink: string;
} {
  if (band === "excellent" || band === "strong") {
    return { bg: C.goodBg, ink: C.goodInk };
  }
  if (band === "weak" || band === "critical") {
    return { bg: C.badBg, ink: C.badInk };
  }
  return { bg: C.neutralBg, ink: C.neutralInk };
}

// Single-sentence summary used both as the preview text (hidden span
// up top, drives the inbox preheader) and as the lede paragraph.
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
  input: ReportEmailInput & { sentLabel: string; viewUrl: string },
): string {
  const { snapshot, reportName, reportDescription, sentLabel, viewUrl } = input;
  const t = snapshot.totals;
  const topPerformers = snapshot.accounts
    .filter((a) => a.health.postCount > 0)
    .sort((a, b) => b.health.healthScore - a.health.healthScore)
    .slice(0, 5);

  const lines: string[] = [];
  lines.push(reportName);
  lines.push(`Alert Network report · ${sentLabel}`);
  if (reportDescription) lines.push(reportDescription);
  lines.push("");
  lines.push(summarySentence(snapshot));
  lines.push("");
  lines.push("OVERVIEW");
  lines.push("--------");
  lines.push(`Window         ${snapshot.window_days} days`);
  lines.push(`Accounts       ${t.account_count}`);
  lines.push(`Posts          ${compactNumber(t.post_count)}`);
  lines.push(
    `Total views    ${t.total_views > 0 ? compactNumber(t.total_views) : "—"}`,
  );
  lines.push(
    `Avg engagement ${t.engagement_rate > 0 ? percent(t.engagement_rate, 2) : "—"}`,
  );
  lines.push(
    `Avg health     ${t.covered_accounts > 0 ? t.avg_health : "—"}`,
  );
  lines.push(`Top score      ${t.top_score > 0 ? t.top_score : "—"}`);
  lines.push(`Movers (>=8%)  ${t.movers_count}`);

  if (topPerformers.length > 0) {
    lines.push("");
    lines.push("TOP PERFORMERS");
    lines.push("--------------");
    for (const a of topPerformers) {
      lines.push(
        `${a.handle.padEnd(28)} ${String(a.health.healthScore).padStart(3)}  ${compactNumber(a.health.totalViews)} views`,
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
