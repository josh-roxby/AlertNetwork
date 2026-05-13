"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useEscape } from "@/components/overlay";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEscape(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink ring-1 ring-line-2 hover:bg-surface-3"
      >
        JR
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="popover-panel absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-md border border-line-2 bg-surface shadow-[var(--sh-lg)]"
        >
          <div className="border-b border-line px-4 py-3">
            <div className="t-body font-medium text-ink">Josh Roxby</div>
            <div className="t-small text-ink-3">josh@exhalestudios.co</div>
          </div>
          <div className="py-1">
            <MenuItem href="/settings" onSelect={() => setOpen(false)}>
              Workspace settings
            </MenuItem>
            <MenuItem disabled>Theme · Dark (locked)</MenuItem>
            <MenuItem disabled>Keyboard shortcuts</MenuItem>
          </div>
          <div className="border-t border-line py-1">
            <MenuItem disabled>Sign out · Auth not wired</MenuItem>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  onSelect,
  disabled = false,
  children,
}: {
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "block w-full px-4 py-2.5 text-left t-body transition-colors duration-[120ms]";
  if (disabled) {
    return (
      <span className={`${cls} cursor-not-allowed text-ink-4`} role="menuitem">
        {children}
      </span>
    );
  }
  if (href) {
    return (
      <Link
        href={href}
        role="menuitem"
        onClick={onSelect}
        className={`${cls} text-ink-2 hover:bg-surface-2 hover:text-ink`}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      role="menuitem"
      onClick={onSelect}
      className={`${cls} text-ink-2 hover:bg-surface-2 hover:text-ink`}
    >
      {children}
    </button>
  );
}
