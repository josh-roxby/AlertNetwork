"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useShell } from "@/components/shell-context";
import { useEscape, useScrollLock } from "@/components/overlay";
import {
  IconAccounts,
  IconChevronRight,
  IconClose,
  IconDashboard,
  IconReports,
  IconSettings,
} from "@/components/icons";
import {
  CATEGORIES,
  placeholderAccounts,
  placeholderProjects,
} from "@/lib/placeholder-data";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/accounts", label: "Accounts", Icon: IconAccounts },
  { href: "/reports", label: "Reports", Icon: IconReports },
  { href: "/settings", label: "Settings", Icon: IconSettings },
] as const;

const CATEGORY_COLOR: Record<(typeof CATEGORIES)[number]["id"], string> = {
  fashion: "bg-cat-fashion",
  food: "bg-cat-food",
  beauty: "bg-cat-beauty",
  tech: "bg-cat-tech",
  sports: "bg-cat-sports",
  music: "bg-cat-music",
  travel: "bg-cat-travel",
  lifestyle: "bg-cat-lifestyle",
};

export function Drawer() {
  const { drawerOpen, closeDrawer } = useShell();
  const pathname = usePathname();

  useEscape(drawerOpen, closeDrawer);
  useScrollLock(drawerOpen);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  if (!drawerOpen) return null;

  const project = placeholderProjects[0];
  const accountsByCategory = placeholderAccounts.reduce(
    (acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div
      className="fixed inset-0 z-[var(--z-drawer)]"
      role="dialog"
      aria-modal="true"
      aria-label="Workspace navigation"
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={closeDrawer}
        className="drawer-backdrop absolute inset-0 bg-[var(--backdrop)]"
      />
      <aside
        className="drawer-panel relative z-10 ml-0 flex h-full max-w-[320px] flex-col border-r border-line bg-bg"
        style={{ width: "82%" }}
      >
        <div className="sticky top-0 z-10 flex h-[52px] shrink-0 items-center justify-between border-b border-line bg-bg px-4">
          <Link
            href="/"
            onClick={closeDrawer}
            className="flex items-center gap-2 text-ink"
            style={{ fontFamily: "var(--font-unbounded)" }}
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
            />
            <span className="t-h1 uppercase tracking-tight">Alert Network</span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeDrawer}
            className="tap-btn inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <IconClose />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
          <button
            type="button"
            className="tap-row flex w-full items-center gap-3 rounded-md border border-line-2 bg-surface p-3 text-left hover:bg-surface-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-surface-3 text-ink-2">
              <IconDashboard />
            </span>
            <span className="min-w-0 flex-1">
              <span className="t-micro block text-ink-3">Project</span>
              <span className="t-h2 block truncate text-ink">
                {project?.name}
              </span>
            </span>
            <IconChevronRight />
          </button>

          <div className="mt-5">
            <div className="t-micro mb-2 px-1 text-ink-3">Workspace</div>
            <ul className="flex flex-col">
              {NAV.map(({ href, label, Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={closeDrawer}
                      aria-current={active ? "page" : undefined}
                      className={`tap-row flex items-center gap-3 rounded-sm px-3 py-3 t-body transition-colors duration-[120ms] ${
                        active
                          ? "bg-accent-soft text-accent"
                          : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                      }`}
                    >
                      <Icon />
                      <span className="font-medium">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-5">
            <div className="t-micro mb-2 px-1 text-ink-3">Categories</div>
            <ul className="grid grid-cols-2 gap-1">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="tap-row flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2.5 text-left hover:bg-surface-2"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden
                        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORY_COLOR[c.id]}`}
                      />
                      <span className="truncate t-body text-ink-2">
                        {c.label}
                      </span>
                    </span>
                    <span
                      data-numeric
                      className="t-meta text-ink-3"
                      style={{ fontSize: 10 }}
                    >
                      {accountsByCategory[c.id] ?? 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Link
              href="/settings"
              onClick={closeDrawer}
              className="mt-3 flex w-full items-center justify-between rounded-sm border border-dashed border-line-2 px-3 py-2.5 text-ink-3 transition-colors duration-[120ms] hover:border-line-3 hover:text-ink"
            >
              <span
                className="t-meta"
                style={{ fontSize: 10, letterSpacing: "0.14em" }}
              >
                Manage tags & categories
              </span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="shrink-0 border-t border-line bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-[12px] font-semibold text-ink ring-1 ring-line-2"
            >
              JR
            </span>
            <span className="min-w-0">
              <span className="block t-body font-medium text-ink">
                Josh Roxby
              </span>
              <span className="block t-small truncate text-ink-3">
                josh@exhalestudios.co
              </span>
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
