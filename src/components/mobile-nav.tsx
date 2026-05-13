"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { label: string; href: string }[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Accounts", href: "/accounts" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="-ml-1 inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink hover:bg-surface-2 active:scale-[0.97] lg:hidden"
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
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="drawer-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="drawer-panel absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-line bg-surface"
          >
            <div className="flex h-14 items-center justify-between border-b border-line px-5">
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                  <path
                    d="M3 3l10 10M13 3L3 13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-3 py-4">
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative rounded-sm px-3 py-3 text-[15px] transition-colors duration-[120ms] ${
                      active
                        ? "bg-surface-2 text-ink"
                        : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent"
                      />
                    )}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto px-5 pb-5">
              <div className="rounded-md border border-line-2 bg-surface-2 p-3 t-small text-ink-2">
                <div className="t-micro mb-1 text-ink-3">Preview</div>
                Auth is disabled. Shell and placeholder data only.
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
