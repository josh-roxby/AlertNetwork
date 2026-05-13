"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAccounts,
  IconDashboard,
  IconReports,
  IconSettings,
} from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/accounts", label: "Accounts", Icon: IconAccounts },
  { href: "/reports", label: "Reports", Icon: IconReports },
  { href: "/settings", label: "Settings", Icon: IconSettings },
] as const;

export function FloatNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="absolute z-[var(--z-tabbar)] flex items-center gap-0.5 rounded-sm border border-line-2 bg-surface p-1 shadow-[var(--sh-nav)]"
      style={{ bottom: 12, left: 4 }}
    >
      {NAV.map(({ href, label, Icon }) => {
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
