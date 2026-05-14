"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chip } from "@/components/chip";
import { FilterStrip } from "@/components/filter-strip";
import { AccountRow } from "@/components/account-row";
import { AddAccountTile } from "@/components/add-account-tile";
import { MetricLegend } from "@/components/metric-legend";
import { IconSearch } from "@/components/icons";
import {
  AccountsFilterSheet,
  DEFAULT_FILTERS,
  type AccountFilters,
} from "@/components/accounts-filter-sheet";
import {
  CATEGORIES,
  placeholderAccounts,
  type Category,
} from "@/lib/placeholder-data";

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

function isCategory(v: string | null): v is Category {
  return !!v && CATEGORIES.some((c) => c.id === v);
}

export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsView />
    </Suspense>
  );
}

function AccountsView() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const initialFilters: AccountFilters = isCategory(categoryParam)
    ? { ...DEFAULT_FILTERS, categories: new Set([categoryParam]) }
    : DEFAULT_FILTERS;
  const [filters, setFilters] = useState<AccountFilters>(initialFilters);
  const [filterOpen, setFilterOpen] = useState(false);

  // If the URL category param changes after mount (drawer link), apply it.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isCategory(categoryParam)) return;
    setFilters((prev) => ({
      ...prev,
      categories: new Set([categoryParam]),
    }));
  }, [categoryParam]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = useMemo(() => {
    return placeholderAccounts.filter((a) => {
      if (a.healthScore < filters.healthMin) return false;
      if (a.healthScore > filters.healthMax) return false;
      if (filters.categories.size > 0 && !filters.categories.has(a.category)) {
        return false;
      }
      return true;
    });
  }, [filters]);

  const byCategory = useMemo(
    () =>
      placeholderAccounts.reduce(
        (acc, a) => {
          acc[a.category] = (acc[a.category] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [],
  );

  const activeFilterCount =
    (filters.healthMin !== 0 || filters.healthMax !== 100 ? 1 : 0) +
    (filters.categories.size > 0 ? 1 : 0);

  return (
    <>
      <section className="mb-4">
        <h1 className="t-display-1 uppercase text-ink">Accounts</h1>
        <p className="mt-1 t-small text-ink-3">
          Every monitored account in this project. Tap to view details.
        </p>
      </section>

      <section className="mb-4">
        <div className="flex items-center gap-2">
          <label className="relative flex-1">
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
            >
              <IconSearch />
            </span>
            <input
              type="search"
              disabled
              placeholder="Search handles, tags, categories…"
              className="h-10 w-full rounded-full border border-line bg-surface-2 pl-10 pr-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-90"
            />
          </label>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            aria-label="Filter accounts"
            className={`tap-btn relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-[120ms] ${
              activeFilterCount > 0
                ? "border-accent-line bg-accent-soft text-accent"
                : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <FilterGlyph />
            {activeFilterCount > 0 && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-[#0A0A0A]"
                data-numeric
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </section>

      <section className="mb-4">
        <FilterStrip>
          <Chip
            active={filters.categories.size === 0}
            count={placeholderAccounts.length}
            onClick={() => setFilters({ ...filters, categories: new Set() })}
          >
            All
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={filters.categories.has(c.id)}
              count={byCategory[c.id] ?? 0}
              onClick={() => {
                const next = new Set(filters.categories);
                if (next.has(c.id)) next.delete(c.id);
                else next.add(c.id);
                setFilters({ ...filters, categories: next });
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`inline-block h-2 w-2 rounded-full ${CATEGORY_DOT[c.id]}`}
                />
                {c.label}
              </span>
            </Chip>
          ))}
        </FilterStrip>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <span data-numeric className="t-small text-ink-2">
            {filtered.length} of {placeholderAccounts.length}
          </span>
          <button
            type="button"
            className="tap-btn t-micro text-ink-3 hover:text-ink"
          >
            Sort · Health ↓
          </button>
        </div>
        <div className="mb-2 px-1">
          <MetricLegend />
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-md border border-line bg-surface px-3 py-6 text-center">
            <p className="t-body text-ink-2">No accounts match those filters.</p>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="tap-btn mt-2 t-micro text-accent hover:opacity-80"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...filtered]
              .sort((a, b) => b.healthScore - a.healthScore)
              .map((a) => (
                <li key={a.id}>
                  <AccountRow account={a} />
                </li>
              ))}
            <li>
              <AddAccountTile />
            </li>
          </ul>
        )}
      </section>

      <AccountsFilterSheet
        open={filterOpen}
        filters={filters}
        onChange={setFilters}
        onApply={() => setFilterOpen(false)}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        onClose={() => setFilterOpen(false)}
      />
    </>
  );
}

function FilterGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3 5h12M5 9h8M7 13h4" />
    </svg>
  );
}
