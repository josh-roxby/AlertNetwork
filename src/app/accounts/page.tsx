import { Chip } from "@/components/chip";
import { FilterStrip } from "@/components/filter-strip";
import { AccountRow } from "@/components/account-row";
import { IconSearch } from "@/components/icons";
import { CATEGORIES, placeholderAccounts } from "@/lib/placeholder-data";

const CATEGORY_DOT: Record<string, string> = {
  fashion: "bg-cat-fashion",
  food: "bg-cat-food",
  beauty: "bg-cat-beauty",
  tech: "bg-cat-tech",
  sports: "bg-cat-sports",
  music: "bg-cat-music",
  travel: "bg-cat-travel",
  lifestyle: "bg-cat-lifestyle",
};

export default function AccountsPage() {
  const byCategory = placeholderAccounts.reduce(
    (acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <section className="mb-4">
        <h1 className="t-display-1 uppercase text-ink">Accounts</h1>
        <p className="mt-1 t-small text-ink-3">
          Every monitored account in this project. Tap to view details.
        </p>
      </section>

      <section className="mb-4">
        <label className="relative block">
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
      </section>

      <section className="mb-4">
        <FilterStrip>
          <Chip active count={placeholderAccounts.length}>
            All
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} count={byCategory[c.id] ?? 0}>
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
            {placeholderAccounts.length} accounts
          </span>
          <button
            type="button"
            className="tap-btn t-micro text-ink-3 hover:text-ink"
          >
            Sort · Health ↓
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {[...placeholderAccounts]
            .sort((a, b) => b.healthScore - a.healthScore)
            .map((a) => (
              <li key={a.id}>
                <AccountRow account={a} />
              </li>
            ))}
        </ul>
      </section>
    </>
  );
}
