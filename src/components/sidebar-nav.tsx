"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { label: string; href: string }[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Accounts", href: "/accounts" },
  { label: "Projects", href: "/projects" },
  { label: "Reports", href: "/reports" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "rounded-md px-3 py-2 text-sm transition-colors " +
              (active
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:bg-surface-2 hover:text-foreground")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
