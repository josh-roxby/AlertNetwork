"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { useShell } from "@/components/shell-context";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/data/categories";
import type { CategoryRow } from "@/lib/data/types";

const PALETTE: { id: string; label: string; dot: string }[] = [
  { id: "fashion", label: "Pink", dot: "bg-cat-fashion" },
  { id: "food", label: "Orange", dot: "bg-cat-food" },
  { id: "beauty", label: "Violet", dot: "bg-cat-beauty" },
  { id: "tech", label: "Cyan", dot: "bg-cat-tech" },
  { id: "sports", label: "Lime", dot: "bg-cat-sports" },
  { id: "music", label: "Red", dot: "bg-cat-music" },
  { id: "travel", label: "Blue", dot: "bg-cat-travel" },
  { id: "lifestyle", label: "Teal", dot: "bg-cat-lifestyle" },
];

function paletteDot(paletteId: string): string {
  return PALETTE.find((p) => p.id === paletteId)?.dot ?? "bg-ink-4";
}

export function CategoriesSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    activeProjectId,
    categories,
    accounts,
    refreshCategories,
    refreshAccounts,
  } = useShell();

  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftPalette, setDraftPalette] = useState<string>("fashion");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const countsById = accounts.reduce<Record<string, number>>((acc, a) => {
    if (a.category_id) acc[a.category_id] = (acc[a.category_id] ?? 0) + 1;
    return acc;
  }, {});

  function startEdit(row: CategoryRow) {
    setEditing(row.id);
    setDraftName(row.label);
    setDraftPalette(row.palette_id);
    setCreating(false);
    setError("");
  }

  function cancelEdit() {
    setEditing(null);
    setCreating(false);
    setDraftName("");
    setError("");
  }

  async function saveEdit() {
    if (!editing) return;
    if (draftName.trim().length === 0) return;
    try {
      await updateCategory(editing, {
        label: draftName,
        palette_id: draftPalette,
      });
      await refreshCategories();
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setDraftName("");
    setDraftPalette(unusedPaletteId(categories));
    setError("");
  }

  async function saveCreate() {
    if (!activeProjectId) return;
    if (draftName.trim().length === 0) return;
    try {
      await createCategory(activeProjectId, draftName, draftPalette);
      await refreshCategories();
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create.");
    }
  }

  async function remove(id: string) {
    try {
      await deleteCategory(id);
      await refreshCategories();
      // Deleting a category nulls out `category_id` on accounts via the
      // ON DELETE SET NULL FK, so refresh accounts too.
      await refreshAccounts();
      if (editing === id) cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete.");
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Categories"
      description="Project-scoped. Colour drives the dots on avatars, charts and chips."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Close
          </button>
          <button
            type="button"
            onClick={startCreate}
            disabled={creating || editing !== null}
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add category
          </button>
        </>
      }
    >
      {categories.length === 0 && !creating && (
        <p className="mb-3 rounded-sm border border-dashed border-line-2 px-3 py-4 text-center t-small text-ink-3">
          No categories yet. Add one or create them inline when adding an account.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {categories.map((r) => {
          if (editing === r.id) {
            return (
              <li key={r.id}>
                <EditorCard
                  name={draftName}
                  paletteId={draftPalette}
                  onName={setDraftName}
                  onPalette={setDraftPalette}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                />
              </li>
            );
          }
          const count = countsById[r.id] ?? 0;
          return (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-3"
            >
              <span
                aria-hidden
                className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-bg ${paletteDot(r.palette_id)}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block t-body font-semibold text-ink truncate">
                  {r.label}
                </span>
                <span
                  data-numeric
                  className="block t-meta text-ink-3"
                  style={{ fontSize: 10 }}
                >
                  {count} {count === 1 ? "account" : "accounts"}
                </span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(r)}
                  className="tap-btn rounded-sm border border-line-2 bg-surface-2 px-2.5 py-1 text-ink-2 hover:text-ink"
                  style={{ fontSize: 11 }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  aria-label={`Remove ${r.label}`}
                  className="tap-btn inline-flex h-7 w-7 items-center justify-center rounded-sm text-ink-3 hover:bg-bad-soft hover:text-bad"
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}

        {creating && (
          <li>
            <EditorCard
              name={draftName}
              paletteId={draftPalette}
              onName={setDraftName}
              onPalette={setDraftPalette}
              onSave={saveCreate}
              onCancel={cancelEdit}
            />
          </li>
        )}
      </ul>

      {error && (
        <p
          className="mt-3 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
          role="alert"
        >
          {error}
        </p>
      )}
    </Sheet>
  );
}

function EditorCard({
  name,
  paletteId,
  onName,
  onPalette,
  onSave,
  onCancel,
}: {
  name: string;
  paletteId: string;
  onName: (v: string) => void;
  onPalette: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-md border border-accent-line bg-accent-soft p-3">
      <label className="block">
        <span className="t-micro mb-1 block text-ink-3">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => onName(e.target.value)}
          autoFocus
          placeholder="Category name"
          className="h-10 w-full rounded-sm border border-line-2 bg-bg px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
      </label>

      <div className="mt-3">
        <span className="t-micro mb-1.5 block text-ink-3">Colour</span>
        <ul className="grid grid-cols-8 gap-1.5">
          {PALETTE.map((p) => {
            const selected = p.id === paletteId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onPalette(p.id)}
                  aria-label={p.label}
                  aria-pressed={selected}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-[120ms] ${
                    selected
                      ? "ring-2 ring-ink ring-offset-2 ring-offset-accent-soft"
                      : "hover:scale-110"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-5 w-5 rounded-full ${p.dot}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="tap-btn rounded-sm px-3 py-1.5 t-small font-medium text-ink-2 hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={name.trim().length === 0}
          className="tap-btn rounded-sm bg-accent px-3 py-1.5 t-small font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function unusedPaletteId(rows: CategoryRow[]): string {
  const used = new Set(rows.map((r) => r.palette_id));
  const free = PALETTE.find((p) => !used.has(p.id));
  return free ? free.id : PALETTE[0].id;
}
