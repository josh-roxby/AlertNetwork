"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveProject, useShell } from "@/components/shell-context";
import { paletteBg } from "@/lib/data/palette";
import { InstallButton } from "@/components/install-button";
import { NotificationsMenu } from "@/components/notifications-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  IconAccounts,
  IconDashboard,
  IconReports,
  IconSettings,
  IconSignOut,
} from "@/components/icons";
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
  // Settings hidden from viewers; managers + owner see it.
  { href: "/settings", label: "Settings", Icon: IconSettings, managerOnly: true },
];

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
  hideNav = false,
}: {
  children: React.ReactNode;
  pageTitle: string;
  pageEyebrow?: string;
  /**
   * Hide the workspace nav + categories + project switcher. Used when
   * the user has no projects yet — the only useful destination is
   * /projects so we strip the dead navigation surfaces.
   */
  hideNav?: boolean;
}) {
  const pathname = usePathname();
  const project = useActiveProject();
  const { categories, accounts, canManage } = useShell();
  const navItems = NAV.filter((n) => !n.managerOnly || canManage);
  const user = useAuthUser();
  const email = user?.email ?? "—";
  const initial = email[0]?.toUpperCase() ?? "?";

  const accountsByCategory = accounts.reduce<Record<string, number>>(
    (acc, a) => {
      if (a.category_id) {
        acc[a.category_id] = (acc[a.category_id] ?? 0) + 1;
      }
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
          {!hideNav && (
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
          )}
          <InstallButton />
          <ThemeToggle />
          {!hideNav && <NotificationsMenu />}
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
          {!hideNav && (
            <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="t-micro mb-2 px-2 text-ink-3">Workspace</div>
            <ul className="flex flex-col gap-0.5">
              {navItems.map(({ href, label, Icon }) => {
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

            {categories.length > 0 && (
              <>
                <div className="t-micro mb-2 mt-6 px-2 text-ink-3">
                  Categories
                </div>
                <ul className="flex flex-col gap-0.5">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/accounts?category=${c.id}`}
                        className="tap-row flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left hover:bg-surface-2"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
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
              </>
            )}

          </nav>
          )}
          {hideNav && <div className="flex-1" />}

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
