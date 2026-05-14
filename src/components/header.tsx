"use client";

import { useRouter } from "next/navigation";
import { IconBack, IconHamburger } from "@/components/icons";
import { NotificationsMenu } from "@/components/notifications-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useShell } from "@/components/shell-context";

export function Header({
  eyebrow,
  title,
  backHref,
  rightAction,
}: {
  eyebrow?: string;
  title: string;
  backHref?: string;
  rightAction?: React.ReactNode;
}) {
  const router = useRouter();
  const { openDrawer } = useShell();

  function handleBack() {
    // Prefer browser back so the user returns through whatever stack
    // they navigated in via (e.g. dashboard → report → back goes home,
    // /reports → report → back goes to /reports). If we're the first
    // entry in the tab (deep link), fall back to the static parent.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    if (backHref) router.push(backHref);
  }

  return (
    <header
      className="absolute inset-x-0 top-0 z-[var(--z-sticky)] grid h-[52px] grid-cols-[36px_1fr_auto] items-center gap-1 border-b border-line bg-bg px-1 lg:hidden"
      style={{ paddingInline: 4 }}
    >
      {backHref ? (
        <button
          type="button"
          aria-label="Back"
          onClick={handleBack}
          className="tap-btn inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink hover:bg-surface-2"
        >
          <IconBack />
        </button>
      ) : (
        <button
          type="button"
          aria-label="Open menu"
          onClick={openDrawer}
          className="tap-btn inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink hover:bg-surface-2"
        >
          <IconHamburger />
        </button>
      )}

      <div className="min-w-0 px-1 text-center">
        {eyebrow && (
          <div className="t-micro truncate text-ink-3">{eyebrow}</div>
        )}
        <div className="t-h2 truncate text-ink">{title}</div>
      </div>

      <div className="flex items-center justify-end gap-0.5">
        <ThemeToggle />
        {rightAction ?? <NotificationsMenu />}
      </div>
    </header>
  );
}
