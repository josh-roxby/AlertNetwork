"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useShell, useActiveProject } from "@/components/shell-context";
import { useEscape, useScrollLock } from "@/components/overlay";
import {
  IconAccounts,
  IconChevronRight,
  IconClose,
  IconDashboard,
  IconReports,
  IconSettings,
  IconSignOut,
} from "@/components/icons";
import { paletteBg } from "@/lib/data/palette";
import { useAuthUser } from "@/lib/use-auth-user";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof IconDashboard;
  managerOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/accounts", label: "Accounts", Icon: IconAccounts },
  { href: "/reports", label: "Reports", Icon: IconReports },
  // Settings is hidden from viewers; managers + owner see it.
  { href: "/settings", label: "Settings", Icon: IconSettings, managerOnly: true },
];

export function Drawer() {
  const {
    drawerOpen,
    closeDrawer,
    categories,
    accounts,
    projects,
    projectsLoading,
    canManage,
  } = useShell();
  const navItems = NAV.filter((n) => !n.managerOnly || canManage);
  const hideNav = !projectsLoading && projects.length === 0;
  const pathname = usePathname();
  const project = useActiveProject();
  const user = useAuthUser();
  const email = user?.email ?? "—";
  const initial = email[0]?.toUpperCase() ?? "?";

  useEscape(drawerOpen, closeDrawer);
  useScrollLock(drawerOpen);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  if (!drawerOpen) return null;

  const accountsByCategory = accounts.reduce(
    (acc, a) => {
      if (a.category_id) {
        acc[a.category_id] = (acc[a.category_id] ?? 0) + 1;
      }
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
            <BrandMark size={22} className="text-accent" />
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
          <Link
            href="/projects"
            onClick={closeDrawer}
            className="tap-row flex w-full items-center gap-3 rounded-md border border-line-2 bg-surface p-3 text-left hover:bg-surface-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-surface-3 text-ink-2">
              <IconDashboard />
            </span>
            <span className="min-w-0 flex-1">
              <span className="t-micro block text-ink-3">Project</span>
              <span className="t-h2 block truncate text-ink">
                {project?.name ?? "Switch project"}
              </span>
            </span>
            <IconChevronRight />
          </Link>

          {!hideNav && (
          <div className="mt-5">
            <div className="t-micro mb-2 px-1 text-ink-3">Workspace</div>
            <ul className="flex flex-col">
              {navItems.map(({ href, label, Icon }) => {
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
          )}

          {categories.length > 0 && (
            <div className="mt-5">
              <div className="t-micro mb-2 px-1 text-ink-3">Categories</div>
              <ul className="grid grid-cols-2 gap-1">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/accounts?category=${c.id}`}
                      onClick={closeDrawer}
                      className="tap-row flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2.5 text-left hover:bg-surface-2"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          aria-hidden
                          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${paletteBg(c.palette_id)}`}
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
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-4 py-3">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-semibold text-ink ring-1 ring-line-2"
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block t-small truncate text-ink" title={email}>
              {email}
            </span>
            <span className="block t-micro text-ink-3">Signed in</span>
          </span>
          <form action="/auth/sign-out" method="POST">
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="tap-btn inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <IconSignOut />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
