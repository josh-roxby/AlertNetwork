"use client";

import { useRouter } from "next/navigation";
import { IconBack, IconBell, IconHamburger } from "@/components/icons";
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

  return (
    <header
      className="absolute inset-x-0 top-0 z-[var(--z-sticky)] grid h-[52px] grid-cols-[36px_1fr_36px] items-center gap-1 border-b border-line bg-bg px-1"
      style={{ paddingInline: 4 }}
    >
      {backHref ? (
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.push(backHref)}
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

      <div className="flex items-center justify-end">
        {rightAction ?? (
          <button
            type="button"
            aria-label="Notifications"
            className="tap-btn relative inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <IconBell />
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent"
            />
          </button>
        )}
      </div>
    </header>
  );
}
