"use client";

import { Sheet } from "@/components/sheet";
import { paletteBg } from "@/lib/data/palette";
import type { CategoryRow } from "@/lib/data/types";

export type AccountFilters = {
  categoryIds: Set<string>;
};

export const DEFAULT_FILTERS: AccountFilters = {
  categoryIds: new Set<string>(),
};

export function AccountsFilterSheet({
  open,
  filters,
  categories,
  onChange,
  onApply,
  onReset,
  onClose,
}: {
  open: boolean;
  filters: AccountFilters;
  categories: CategoryRow[];
  onChange: (next: AccountFilters) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  function toggleCategory(id: string) {
    const next = new Set(filters.categoryIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...filters, categoryIds: next });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter accounts"
      description="Narrow the list by category."
      footer={
        <>
          <button
            type="button"
            onClick={onReset}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
          >
            Apply
          </button>
        </>
      }
    >
      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="t-micro text-ink-3">Categories</span>
          <span
            data-numeric
            className="text-ink-3"
            style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          >
            {filters.categoryIds.size === 0
              ? "All"
              : `${filters.categoryIds.size} selected`}
          </span>
        </div>
        {categories.length === 0 ? (
          <p className="rounded-sm border border-dashed border-line-2 px-3 py-4 text-center t-small text-ink-3">
            No categories yet for this project.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-1">
            {categories.map((c) => {
              const selected = filters.categoryIds.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    aria-pressed={selected}
                    className={`tap-row flex w-full items-center gap-2.5 rounded-sm border px-3 py-2.5 text-left transition-colors duration-[120ms] ${
                      selected
                        ? "border-accent-line bg-accent-soft"
                        : "border-line-2 bg-surface hover:bg-surface-2"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border ${
                        selected
                          ? "border-accent bg-accent text-[#0A0A0A]"
                          : "border-line-3 bg-surface-2"
                      }`}
                    >
                      {selected && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M2 5l2 2 4-4" />
                        </svg>
                      )}
                    </span>
                    <span
                      aria-hidden
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${paletteBg(c.palette_id)}`}
                    />
                    <span
                      className={`t-body truncate ${selected ? "text-ink font-semibold" : "text-ink-2"}`}
                    >
                      {c.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Sheet>
  );
}
