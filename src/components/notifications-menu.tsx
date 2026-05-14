"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useEscape } from "@/components/overlay";
import { IconBell } from "@/components/icons";

// Real notifications (delivered report sends) land in M-3b.3 alongside
// the email dispatch pipeline. Until then the menu is intentionally
// empty — no placeholder data.
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
          <div className="px-4 py-6 text-center">
            <p className="t-body text-ink-2">No recent sends.</p>
            <p className="mt-1 t-small text-ink-3">
              Delivered reports will show up here.
            </p>
          </div>
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
