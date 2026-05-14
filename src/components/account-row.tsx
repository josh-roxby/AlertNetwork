import Link from "next/link";
import { relativeDate } from "@/lib/format";
import { paletteBg } from "@/lib/data/palette";
import type { AccountView } from "@/lib/data/types";

// Account list row. Until the scrape pipeline populates `posts` (N-1
// → N-3), per-account metrics (median views, engagement, health) are
// unknown — the row degrades to a "first scrape pending" status line.

export function AccountRow({ account }: { account: AccountView }) {
  const initial =
    account.handle.replace(/^@/, "").charAt(0).toUpperCase() || "?";
  const palette = paletteBg(account.category?.palette_id);
  const categoryLabel = account.category?.label ?? "Uncategorised";
  const lastScraped = account.last_scraped_at;
  const tagLabels = account.tagLabels.slice(0, 3);

  return (
    <Link
      href={`/accounts/${account.id}`}
      className="tap-row group flex w-full items-center gap-3 rounded-md border border-line bg-surface px-3 py-3 text-left transition-colors duration-[120ms] hover:bg-surface-2"
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
          <span>{categoryLabel}</span>
          {tagLabels.length > 0 && (
            <>
              <Sep />
              <span>
                {tagLabels.map((t) => `#${t}`).join(" · ")}
                {account.tagLabels.length > tagLabels.length &&
                  ` +${account.tagLabels.length - tagLabels.length}`}
              </span>
            </>
          )}
          <Sep />
          <span>
            {lastScraped
              ? `Scraped ${relativeDate(lastScraped)}`
              : "First scrape pending"}
          </span>
        </span>
      </span>
    </Link>
  );
}

function Sep() {
  return (
    <span aria-hidden className="text-ink-4">
      ·
    </span>
  );
}
