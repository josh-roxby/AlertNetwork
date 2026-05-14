"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEscape } from "@/components/overlay";
import { IconBell } from "@/components/icons";
import { placeholderReports } from "@/lib/placeholder-data";
import { relativeDate } from "@/lib/format";

type Recent = {
  reportId: string;
  reportName: string;
  sentAt: string;
  recipients: number;
  accounts: number;
};

const MAX_ITEMS = 6;

function recentSends(): Recent[] {
  const all: Recent[] = [];
  for (const r of placeholderReports) {
    for (const h of r.history) {
      if (h.status !== "delivered") continue;
      all.push({
        reportId: r.id,
        reportName: r.name,
        sentAt: h.sentAt,
        recipients: h.recipients,
        accounts: h.accounts,
      });
    }
  }
  return all
    .sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt))
    .slice(0, MAX_ITEMS);
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEscape(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const items = useMemo(() => recentSends(), []);
  const hasUnread = items.length > 0;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="tap-btn relative inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <IconBell />
        {hasUnread && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent"
          />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="menu-panel absolute right-0 top-full z-[var(--z-menu)] mt-2 w-[280px] overflow-hidden rounded-md border border-line-2 bg-surface shadow-[var(--sh-lg)]"
        >
          <div className="border-b border-line px-4 py-3">
            <div className="t-body font-semibold text-ink">Notifications</div>
            <div className="t-small text-ink-3">
              Recent successful report sends.
            </div>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="t-body text-ink-2">No recent sends.</p>
              <p className="mt-1 t-small text-ink-3">
                Delivered reports will show up here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {items.map((item) => (
                <li key={`${item.reportId}-${item.sentAt}`}>
                  <Link
                    href={`/reports/${item.reportId}`}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="tap-row flex items-start gap-3 px-4 py-2.5 transition-colors duration-[120ms] hover:bg-surface-2"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-good"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block t-body truncate font-medium text-ink">
                        {item.reportName}
                      </span>
                      <span
                        data-numeric
                        className="mt-0.5 block text-ink-3"
                        style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                      >
                        {item.recipients} recipients · {item.accounts}{" "}
                        accounts · {relativeDate(item.sentAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line px-4 py-2 text-center">
            <Link
              href="/reports"
              onClick={() => setOpen(false)}
              className="t-meta text-ink-3 hover:text-ink"
              style={{ fontSize: 10 }}
            >
              View all reports →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
