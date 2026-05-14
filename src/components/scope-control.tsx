"use client";

import {
  CATEGORIES,
  placeholderAccounts,
  type Category,
  type Report,
} from "@/lib/placeholder-data";
import { compactNumber } from "@/lib/format";

const CATEGORY_COLOR: Record<Category, string> = {
  fashion: "bg-cat-fashion",
  food: "bg-cat-food",
  beauty: "bg-cat-beauty",
  tech: "bg-cat-tech",
  sports: "bg-cat-sports",
  music: "bg-cat-music",
  travel: "bg-cat-travel",
  lifestyle: "bg-cat-lifestyle",
};

export const SCOPE_OPTIONS: Report["scopeKind"][] = [
  "project",
  "tag",
  "account",
];

export function ScopeControl({
  scope,
  pickedCategories,
  pickedAccounts,
  onScopeChange,
  onToggleCategory,
  onToggleAccount,
  totalAccounts,
}: {
  scope: Report["scopeKind"];
  pickedCategories: Set<Category>;
  pickedAccounts: Set<string>;
  onScopeChange: (s: Report["scopeKind"]) => void;
  onToggleCategory: (c: Category) => void;
  onToggleAccount: (id: string) => void;
  totalAccounts: number;
}) {
  return (
    <div className="mb-4">
      <span className="t-micro mb-1.5 block text-ink-3">Scope</span>
      <div className="grid grid-cols-3 gap-1 rounded-sm border border-line-2 bg-surface-2 p-1">
        {SCOPE_OPTIONS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onScopeChange(k)}
            aria-pressed={k === scope}
            className={`tap-btn rounded-xs px-2 py-1.5 t-small font-medium transition-colors duration-[120ms] ${
              k === scope ? "bg-bg text-ink" : "text-ink-2 hover:text-ink"
            }`}
          >
            {k === "project" ? "Project" : k === "tag" ? "Category" : "Specific"}
          </button>
        ))}
      </div>

      {scope === "project" && (
        <div className="mt-2 rounded-sm border border-line bg-surface px-3 py-2 t-small text-ink-2">
          Includes{" "}
          <span data-numeric className="text-ink">
            {totalAccounts}
          </span>{" "}
          account{totalAccounts === 1 ? "" : "s"} — every account in this
          project.
        </div>
      )}

      {scope === "tag" && (
        <div className="mt-2">
          <ul className="grid grid-cols-2 gap-1">
            {CATEGORIES.map((c) => {
              const selected = pickedCategories.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onToggleCategory(c.id)}
                    aria-pressed={selected}
                    className={`tap-row flex w-full items-center gap-2 rounded-sm border px-3 py-2 text-left transition-colors duration-[120ms] ${
                      selected
                        ? "border-accent-line bg-accent-soft"
                        : "border-line-2 bg-surface hover:bg-surface-2"
                    }`}
                  >
                    <Checkbox checked={selected} />
                    <span
                      aria-hidden
                      className={`inline-block h-2 w-2 rounded-full ${CATEGORY_COLOR[c.id]}`}
                    />
                    <span
                      className={`t-body ${selected ? "text-ink font-semibold" : "text-ink-2"}`}
                    >
                      {c.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 t-small text-ink-3">
            {pickedCategories.size === 0
              ? "Select one or more categories."
              : `${pickedCategories.size} selected.`}
          </p>
        </div>
      )}

      {scope === "account" && (
        <div className="mt-2">
          <ul className="flex max-h-[260px] flex-col gap-1 overflow-y-auto rounded-sm border border-line-2 bg-surface p-1">
            {placeholderAccounts.map((a) => {
              const selected = pickedAccounts.has(a.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onToggleAccount(a.id)}
                    aria-pressed={selected}
                    className={`tap-row flex w-full items-center gap-2 rounded-xs px-2 py-2 text-left transition-colors duration-[120ms] ${
                      selected ? "bg-accent-soft" : "hover:bg-surface-2"
                    }`}
                  >
                    <Checkbox checked={selected} />
                    <span
                      aria-hidden
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${CATEGORY_COLOR[a.category]}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block t-body truncate ${selected ? "text-ink font-semibold" : "text-ink-2"}`}
                      >
                        {a.handle}
                      </span>
                      <span
                        data-numeric
                        className="block t-small text-ink-3"
                      >
                        {compactNumber(a.followers)} followers · {a.healthScore}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 t-small text-ink-3">
            {pickedAccounts.size === 0
              ? "Select one or more accounts."
              : `${pickedAccounts.size} selected.`}
          </p>
        </div>
      )}
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border ${
        checked
          ? "border-accent bg-accent text-[#0A0A0A]"
          : "border-line-3 bg-surface-2"
      }`}
    >
      {checked && (
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
  );
}
