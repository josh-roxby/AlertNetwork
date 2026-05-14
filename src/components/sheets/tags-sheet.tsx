"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/sheet";
import { placeholderAccounts } from "@/lib/placeholder-data";

type TagRow = { name: string; count: number };

export function TagsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const initial: TagRow[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of placeholderAccounts) {
      for (const t of a.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, []);

  const [rows, setRows] = useState<TagRow[]>(initial);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [newTag, setNewTag] = useState("");

  function startRename(name: string) {
    setRenaming(name);
    setRenameDraft(name);
  }

  function cancelRename() {
    setRenaming(null);
    setRenameDraft("");
  }

  function commitRename() {
    if (!renaming) return;
    const cleaned = renameDraft.trim().replace(/^#/, "");
    if (cleaned.length === 0) return;
    setRows(
      rows.map((r) => (r.name === renaming ? { ...r, name: cleaned } : r)),
    );
    cancelRename();
  }

  function addNew() {
    const cleaned = newTag.trim().replace(/^#/, "");
    if (cleaned.length === 0) return;
    if (rows.some((r) => r.name === cleaned)) {
      setNewTag("");
      return;
    }
    setRows([...rows, { name: cleaned, count: 0 }]);
    setNewTag("");
  }

  function remove(name: string) {
    setRows(rows.filter((r) => r.name !== name));
    if (renaming === name) cancelRename();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Project tags"
      description="Tags are project-specific and free-form. Use them to group beyond category."
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
            onClick={addNew}
            disabled={newTag.trim().length === 0}
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add tag
          </button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <span
          aria-hidden
          className="t-meta text-ink-3"
          style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
        >
          #
        </span>
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addNew();
            }
          }}
          placeholder="new-tag"
          className="h-10 flex-1 rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-line bg-surface px-3 py-6 text-center">
          <p className="t-body text-ink-2">No tags yet.</p>
          <p className="mt-1 t-small text-ink-3">
            Type one above and hit Add tag.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            if (renaming === r.name) {
              return (
                <li
                  key={r.name}
                  className="rounded-md border border-accent-line bg-accent-soft p-3"
                >
                  <input
                    type="text"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelRename();
                      }
                    }}
                    autoFocus
                    className="h-10 w-full rounded-sm border border-line-2 bg-bg px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelRename}
                      className="tap-btn rounded-sm px-3 py-1.5 t-small font-medium text-ink-2 hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={commitRename}
                      disabled={renameDraft.trim().length === 0}
                      className="tap-btn rounded-sm bg-accent px-3 py-1.5 t-small font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </li>
              );
            }
            return (
              <li
                key={r.name}
                className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5"
              >
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-surface-2 px-2.5 py-1 text-ink-2"
                  style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                >
                  <span className="text-ink-3">#</span>
                  {r.name}
                </span>
                <span className="min-w-0 flex-1" />
                <span
                  data-numeric
                  className="text-ink-3"
                  style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                >
                  {r.count} {r.count === 1 ? "account" : "accounts"}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startRename(r.name)}
                    className="tap-btn rounded-sm border border-line-2 bg-surface-2 px-2.5 py-1 text-ink-2 hover:text-ink"
                    style={{ fontSize: 11 }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r.name)}
                    aria-label={`Remove tag ${r.name}`}
                    className="tap-btn inline-flex h-7 w-7 items-center justify-center rounded-sm text-ink-3 hover:bg-bad-soft hover:text-bad"
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 rounded-sm border border-accent-line bg-accent-soft px-3 py-2 t-small text-accent">
        Preview only. Tag edits persist for this session but reset on reload
        until the DB layer is wired up.
      </p>
    </Sheet>
  );
}
