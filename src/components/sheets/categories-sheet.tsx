"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/sheet";
import {
  CATEGORIES,
  placeholderAccounts,
  type Category,
} from "@/lib/placeholder-data";

// Canonical 8-colour palette tokens. New / edited categories pick from
// this fixed set so the dashboard charts and dots stay consistent.
const PALETTE: { id: Category; label: string; dot: string }[] = [
  { id: "fashion", label: "Pink", dot: "bg-cat-fashion" },
  { id: "food", label: "Orange", dot: "bg-cat-food" },
  { id: "beauty", label: "Violet", dot: "bg-cat-beauty" },
  { id: "tech", label: "Cyan", dot: "bg-cat-tech" },
  { id: "sports", label: "Lime", dot: "bg-cat-sports" },
  { id: "music", label: "Red", dot: "bg-cat-music" },
  { id: "travel", label: "Blue", dot: "bg-cat-travel" },
  { id: "lifestyle", label: "Teal", dot: "bg-cat-lifestyle" },
];

type CategoryRow = {
  id: string;
  label: string;
  paletteId: Category;
  count: number;
};

export function CategoriesSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const initialRows: CategoryRow[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of placeholderAccounts) {
      counts[a.category] = (counts[a.category] ?? 0) + 1;
    }
    return CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      paletteId: c.id,
      count: counts[c.id] ?? 0,
    }));
  }, []);

  const [rows, setRows] = useState<CategoryRow[]>(initialRows);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftPalette, setDraftPalette] = useState<Category>("fashion");
  const [creating, setCreating] = useState(false);

  function startEdit(row: CategoryRow) {
    setEditing(row.id);
    setDraftName(row.label);
    setDraftPalette(row.paletteId);
    setCreating(false);
  }

  function cancelEdit() {
    setEditing(null);
    setCreating(false);
    setDraftName("");
  }

  function saveEdit() {
    if (!editing) return;
    if (draftName.trim().length === 0) return;
    setRows(
      rows.map((r) =>
        r.id === editing
          ? { ...r, label: draftName.trim(), paletteId: draftPalette }
          : r,
      ),
    );
    cancelEdit();
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setDraftName("");
    setDraftPalette(unusedPaletteId(rows));
  }

  function saveCreate() {
    if (draftName.trim().length === 0) return;
    const id = `new_${Date.now()}`;
    setRows([
      ...rows,
      {
        id,
        label: draftName.trim(),
        paletteId: draftPalette,
        count: 0,
      },
    ]);
    cancelEdit();
  }

  function remove(id: string) {
    setRows(rows.filter((r) => r.id !== id));
    if (editing === id) cancelEdit();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Categories"
      description="Categories are workspace-wide. Colour shows on avatar dots, charts and badges."
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
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const palette = PALETTE.find((p) => p.id === r.paletteId)!;
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
          return (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-3"
            >
              <span
                aria-hidden
                className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-bg ${palette.dot}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block t-body font-semibold text-ink">
                  {r.label}
                </span>
                <span
                  data-numeric
                  className="block t-meta text-ink-3"
                  style={{ fontSize: 10 }}
                >
                  {r.count} {r.count === 1 ? "account" : "accounts"}
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

      <p className="mt-4 rounded-sm border border-accent-line bg-accent-soft px-3 py-2 t-small text-accent">
        Preview only. Category edits persist for this session but reset on
        reload until the DB layer is wired up.
      </p>
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
  paletteId: Category;
  onName: (v: string) => void;
  onPalette: (id: Category) => void;
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

function unusedPaletteId(rows: CategoryRow[]): Category {
  const used = new Set(rows.map((r) => r.paletteId));
  const free = PALETTE.find((p) => !used.has(p.id));
  return free ? free.id : "fashion";
}
