"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chip } from "@/components/chip";
import { FilterStrip } from "@/components/filter-strip";
import { AccountRow } from "@/components/account-row";
import { AddAccountTile } from "@/components/add-account-tile";
import { IconPlus, IconSearch } from "@/components/icons";
import {
  AccountsFilterSheet,
  DEFAULT_FILTERS,
  type AccountFilters,
} from "@/components/accounts-filter-sheet";
import { useShell } from "@/components/shell-context";
import { paletteBg } from "@/lib/data/palette";
import { SkeletonAccountList } from "@/components/skeletons";

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
  const {
    activeProjectId,
    categories,
    accounts,
    accountsLoading,
    openSheet,
  } = useShell();

  const [filters, setFilters] = useState<AccountFilters>(() =>
    categoryParam
      ? { categoryIds: new Set([categoryParam]) }
      : DEFAULT_FILTERS,
  );
  const [filterOpen, setFilterOpen] = useState(false);

  // Drawer / sidebar category deep-links can change after mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!categoryParam) return;
    setFilters((prev) => ({
      ...prev,
      categoryIds: new Set([categoryParam]),
    }));
  }, [categoryParam]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = useMemo(
    () =>
      accounts.filter((a) => {
        if (filters.categoryIds.size === 0) return true;
        return a.category_id && filters.categoryIds.has(a.category_id);
      }),
    [accounts, filters.categoryIds],
  );

  const byCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of accounts) {
      if (a.category_id) counts[a.category_id] = (counts[a.category_id] ?? 0) + 1;
    }
    return counts;
  }, [accounts]);

  const activeFilterCount = filters.categoryIds.size > 0 ? 1 : 0;

  if (!activeProjectId) {
    return (
      <NoProjectState
        onCreate={() => openSheet({ kind: "newProject" })}
      />
    );
  }

  if (accountsLoading) {
    return (
      <>
        <section className="mb-4">
          <h1 className="t-display-1 uppercase text-ink">Accounts</h1>
          <p className="mt-1 t-small text-ink-3">
            Every monitored account in this project. Tap to view details.
          </p>
        </section>
        <SkeletonAccountList count={5} />
      </>
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyAccounts onAdd={() => openSheet({ kind: "addAccount" })} />
    );
  }

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

      {categories.length > 0 && (
        <section className="mb-4">
          <FilterStrip>
            <Chip
              active={filters.categoryIds.size === 0}
              count={accounts.length}
              onClick={() =>
                setFilters({ ...filters, categoryIds: new Set() })
              }
            >
              All
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c.id}
                active={filters.categoryIds.has(c.id)}
                count={byCategory[c.id] ?? 0}
                onClick={() => {
                  const next = new Set(filters.categoryIds);
                  if (next.has(c.id)) next.delete(c.id);
                  else next.add(c.id);
                  setFilters({ ...filters, categoryIds: next });
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={`inline-block h-2 w-2 rounded-full ${paletteBg(c.palette_id)}`}
                  />
                  {c.label}
                </span>
              </Chip>
            ))}
          </FilterStrip>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <span data-numeric className="t-small text-ink-2">
            {filtered.length} of {accounts.length}
          </span>
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
            {filtered.map((a) => (
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
        categories={categories}
        filters={filters}
        onChange={setFilters}
        onApply={() => setFilterOpen(false)}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        onClose={() => setFilterOpen(false)}
      />
    </>
  );
}

function NoProjectState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-2 text-center">
      <span
        aria-hidden
        className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent"
      >
        <IconPlus />
      </span>
      <h1 className="t-display-3 uppercase text-ink">Create a project first</h1>
      <p className="mt-2 max-w-[28ch] t-body text-ink-2">
        Accounts belong to a project. Create one to start monitoring TikTok URLs.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="tap-btn mt-5 inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
      >
        <IconPlus stroke="#0A0A0A" />
        New project
      </button>
    </div>
  );
}

function EmptyAccounts({ onAdd }: { onAdd: () => void }) {
  return (
    <>
      <section className="mb-4">
        <h1 className="t-display-1 uppercase text-ink">Accounts</h1>
        <p className="mt-1 t-small text-ink-3">
          Every monitored account in this project. Tap to view details.
        </p>
      </section>
      <div className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-8 text-center">
        <span
          aria-hidden
          className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent"
        >
          <IconPlus />
        </span>
        <h2 className="t-h2 text-ink">Add your first account</h2>
        <p className="mx-auto mt-2 max-w-[32ch] t-small text-ink-2">
          Paste a TikTok profile URL. The next scrape pulls the last 48 hours
          of posts.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="tap-btn mt-4 inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          <IconPlus stroke="#0A0A0A" />
          Add account
        </button>
      </div>
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
