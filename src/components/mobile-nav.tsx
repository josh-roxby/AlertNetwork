"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEscape, useScrollLock } from "@/components/overlay";

const NAV: { label: string; href: string; description: string }[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    description: "Live snapshot of monitored accounts",
  },
  {
    label: "Accounts",
    href: "/accounts",
    description: "Browse, filter and tag accounts",
  },
  {
    label: "Reports",
    href: "/reports",
    description: "Configurable scheduled snapshots",
  },
  {
    label: "Settings",
    href: "/settings",
    description: "Project and integration config",
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEscape(open, () => setOpen(false));
  useScrollLock(open);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="-ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-ink hover:bg-surface-2 active:scale-[0.97] lg:hidden"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
        >
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 flex flex-col bg-bg">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4 sm:px-6">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-ink"
                style={{ fontFamily: "var(--font-unbounded)" }}
              >
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
                />
                <span className="t-h1 uppercase tracking-tight">
                  Alert Network
                </span>
              </Link>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="-mr-1 inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                  <path
                    d="M4 4l10 10M14 4L4 14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="t-micro mb-3 text-ink-3">Navigate</div>
              <ul className="flex flex-col gap-2">
                {NAV.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`relative block rounded-md border px-4 py-4 transition-colors duration-[120ms] ${
                          active
                            ? "border-accent-line bg-accent-soft"
                            : "border-line bg-surface hover:bg-surface-2"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span
                            className={`t-h1 ${active ? "text-accent" : "text-ink"}`}
                          >
                            {item.label}
                          </span>
                          <span
                            aria-hidden
                            className={`text-lg ${active ? "text-accent" : "text-ink-3"}`}
                          >
                            →
                          </span>
                        </div>
                        <div className="mt-1 t-small text-ink-3">
                          {item.description}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="shrink-0 border-t border-line bg-surface px-4 py-4 sm:px-6">
              <div className="t-micro mb-1 text-ink-3">Preview</div>
              <p className="t-small text-ink-2">
                Auth is disabled. Shell and placeholder data only.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
