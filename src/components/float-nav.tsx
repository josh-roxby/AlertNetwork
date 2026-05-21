"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAccounts,
  IconDashboard,
  IconReports,
  IconSettings,
} from "@/components/icons";
import { useShell } from "@/components/shell-context";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof IconDashboard;
  ownerOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/accounts", label: "Accounts", Icon: IconAccounts },
  { href: "/reports", label: "Reports", Icon: IconReports },
  // Settings is owner-only — viewers don't have anything to configure.
  { href: "/settings", label: "Settings", Icon: IconSettings, ownerOnly: true },
];

export function FloatNav() {
  const pathname = usePathname();
  const { isOwner } = useShell();
  const visible = NAV.filter((n) => !n.ownerOnly || isOwner);

  return (
    <nav
      aria-label="Primary"
      className="absolute z-[var(--z-tabbar)] flex items-center gap-0.5 rounded-sm border border-line-2 bg-surface p-1 shadow-[var(--sh-nav)] lg:hidden"
      style={{ bottom: 12, left: 12 }}
    >
      {visible.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`tap-tab relative inline-flex h-[46px] w-[46px] items-center justify-center rounded-xs transition-colors duration-[120ms] ${
              active
                ? "bg-accent-soft text-accent"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon />
            {active && (
              <span
                aria-hidden
                className="absolute bottom-1 h-1 w-1 rounded-full bg-accent"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
