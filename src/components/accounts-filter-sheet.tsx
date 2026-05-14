"use client";

import { Sheet } from "@/components/sheet";
import { CATEGORIES, type Category } from "@/lib/placeholder-data";

const CATEGORY_DOT: Record<Category, string> = {
  fashion: "bg-cat-fashion",
  food: "bg-cat-food",
  beauty: "bg-cat-beauty",
  tech: "bg-cat-tech",
  sports: "bg-cat-sports",
  music: "bg-cat-music",
  travel: "bg-cat-travel",
  lifestyle: "bg-cat-lifestyle",
};

export type AccountFilters = {
  healthMin: number;
  healthMax: number;
  categories: Set<Category>;
};

export const DEFAULT_FILTERS: AccountFilters = {
  healthMin: 0,
  healthMax: 100,
  categories: new Set<Category>(),
};

export function AccountsFilterSheet({
  open,
  filters,
  onChange,
  onApply,
  onReset,
  onClose,
}: {
  open: boolean;
  filters: AccountFilters;
  onChange: (next: AccountFilters) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  function setHealth(min: number, max: number) {
    onChange({ ...filters, healthMin: min, healthMax: max });
  }

  function toggleCategory(c: Category) {
    const next = new Set(filters.categories);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    onChange({ ...filters, categories: next });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter accounts"
      description="Narrow by health-score range and category."
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
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="t-micro text-ink-3">Health score</span>
          <span
            data-numeric
            className="text-ink"
            style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
          >
            {filters.healthMin} – {filters.healthMax}
          </span>
        </div>
        <RangeSlider
          min={0}
          max={100}
          step={5}
          valueMin={filters.healthMin}
          valueMax={filters.healthMax}
          onChange={setHealth}
        />
        <div className="mt-1 flex justify-between t-meta text-ink-4" style={{ fontSize: 9 }}>
          <span>0</span>
          <span>20</span>
          <span>40</span>
          <span>60</span>
          <span>80</span>
          <span>100</span>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="t-micro text-ink-3">Categories</span>
          <span
            data-numeric
            className="text-ink-3"
            style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          >
            {filters.categories.size === 0
              ? "All"
              : `${filters.categories.size} selected`}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-1">
          {CATEGORIES.map((c) => {
            const selected = filters.categories.has(c.id);
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
                    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORY_DOT[c.id]}`}
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
      </section>
    </Sheet>
  );
}

// Dual-thumb slider. Implemented as two stacked <input type="range"> with a
// connecting fill behind. Pure CSS + DOM, no library.
function RangeSlider({
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
}) {
  const pctLo = ((valueMin - min) / (max - min)) * 100;
  const pctHi = ((valueMax - min) / (max - min)) * 100;

  return (
    <div className="relative h-6">
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-3" />
      <div
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
        style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        onChange={(e) => {
          const v = Math.min(Number(e.target.value), valueMax - step);
          onChange(v, valueMax);
        }}
        aria-label="Minimum health score"
        className="range-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        onChange={(e) => {
          const v = Math.max(Number(e.target.value), valueMin + step);
          onChange(valueMin, v);
        }}
        aria-label="Maximum health score"
        className="range-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
      />
    </div>
  );
}
