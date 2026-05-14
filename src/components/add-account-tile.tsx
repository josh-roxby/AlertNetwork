"use client";

import { useShell } from "@/components/shell-context";
import { IconPlus } from "@/components/icons";

export function AddAccountTile() {
  const { openSheet } = useShell();

  return (
    <button
      type="button"
      onClick={() => openSheet({ kind: "addAccount" })}
      className="tap-row group flex w-full items-center gap-3 rounded-md border border-dashed border-line-2 bg-transparent px-3 py-3 text-left transition-colors duration-[120ms] hover:border-line-3 hover:bg-surface-2/40"
    >
      <span
        aria-hidden
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2 group-hover:bg-surface-3 group-hover:text-ink"
      >
        <IconPlus />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block t-body font-semibold text-ink-2 group-hover:text-ink">
          Add account
        </span>
        <span className="mt-0.5 block t-small text-ink-3">
          Paste a TikTok URL — handle is detected automatically.
        </span>
      </span>
    </button>
  );
}
