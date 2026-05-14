"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CATEGORIES,
  placeholderAccounts,
} from "@/lib/placeholder-data";
import { useActiveProject } from "@/components/shell-context";
import { NotificationsMenu } from "@/components/notifications-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  IconAccounts,
  IconChevronRight,
  IconDashboard,
  IconReports,
  IconSettings,
  IconSignOut,
} from "@/components/icons";
import type { Category } from "@/lib/placeholder-data";
import { useAuthUser } from "@/lib/use-auth-user";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/accounts", label: "Accounts", Icon: IconAccounts },
  { href: "/reports", label: "Reports", Icon: IconReports },
  { href: "/settings", label: "Settings", Icon: IconSettings },
] as const;

const CATEGORY_COLOR: Record<Category, string> = {
  fashion: "bg-cat-fashion",
  food: "bg-cat-food",
  beauty: "bg-cat-beauty",
  tech: "bg-cat-tech",
  sports: "bg-cat-sports",
  music: "bg-cat-music",
  travel: "bg-cat-travel",
  lifestyle: "bg-cat-lifestyle",
};

/**
 * Desktop shell — visible only at `lg:` and up. Renders a top bar with
 * brand + project switcher + ambient controls, a persistent left sidebar
 * with workspace nav + categories + user footer, and a main scroll area
 * that hosts page content.
 *
 * The mobile shell (Header, FloatNav, Drawer, FAB) is hidden at `lg:` so
 * the two layouts never overlap.
 */
export function DesktopShell({
  children,
  pageTitle,
  pageEyebrow,
}: {
  children: React.ReactNode;
  pageTitle: string;
  pageEyebrow?: string;
}) {
  const pathname = usePathname();
  const project = useActiveProject();
  const user = useAuthUser();
  const email = user?.email ?? "—";
  const initial = email[0]?.toUpperCase() ?? "?";

  const accountsByCategory = placeholderAccounts.reduce<Record<string, number>>(
    (acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <div
      className="hidden h-[100dvh] flex-col bg-bg lg:flex"
      data-print="hide"
    >
      <header className="grid h-[60px] shrink-0 grid-cols-[240px_1fr_auto] items-center gap-4 border-b border-line px-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-ink"
          style={{ fontFamily: "var(--font-unbounded)" }}
        >
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
          />
          <span className="t-h1 uppercase tracking-tight">Alert Network</span>
        </Link>
        <div className="min-w-0">
          {pageEyebrow && (
            <div className="t-micro text-ink-3">{pageEyebrow}</div>
          )}
          <div className="t-h2 truncate text-ink">{pageTitle}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/projects"
            className="tap-btn inline-flex items-center gap-2 rounded-sm border border-line-2 bg-surface px-3 py-1.5 t-small font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <span
              className="t-micro text-ink-3"
              style={{ fontSize: 9, letterSpacing: "0.14em" }}
            >
              Project
            </span>
            <span className="text-ink">{project?.name ?? "Workspace"}</span>
            <span aria-hidden className="text-ink-3">
              ▾
            </span>
          </Link>
          <ThemeToggle />
          <NotificationsMenu />
          <span
            aria-label={`Signed in as ${email}`}
            title={email}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink ring-1 ring-line-2"
          >
            {initial}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-line bg-surface">
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="t-micro mb-2 px-2 text-ink-3">Workspace</div>
            <ul className="flex flex-col gap-0.5">
              {NAV.map(({ href, label, Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`tap-row flex items-center gap-3 rounded-sm px-3 py-2.5 t-body transition-colors duration-[120ms] ${
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

            <div className="t-micro mb-2 mt-6 px-2 text-ink-3">Categories</div>
            <ul className="flex flex-col gap-0.5">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/accounts?category=${c.id}`}
                    className="tap-row flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left hover:bg-surface-2"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
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
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href="/settings#tags-categories-section"
              className="mt-3 flex w-full items-center justify-between rounded-sm border border-dashed border-line-2 px-3 py-2.5 text-ink-3 transition-colors duration-[120ms] hover:border-line-3 hover:text-ink"
            >
              <span
                className="t-meta"
                style={{ fontSize: 10, letterSpacing: "0.14em" }}
              >
                Manage tags &amp; categories
              </span>
              <IconChevronRight />
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-3 py-3">
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

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1100px] px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
