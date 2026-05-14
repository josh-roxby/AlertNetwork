"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { useShell } from "@/components/shell-context";
import { createTag, deleteTag, renameTag } from "@/lib/data/tags";

export function TagsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { activeProjectId, tags, accounts, refreshTags, refreshAccounts } =
    useShell();

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState("");

  const countsById = accounts.reduce<Record<string, number>>((acc, a) => {
    for (const label of a.tagLabels) {
      // Match by label against tags state — both label-based and id-based
      // counts are useful, but we surface a per-row count below using
      // the tag id directly.
      acc[label] = (acc[label] ?? 0) + 1;
    }
    return acc;
  }, {});

  function startRename(id: string, current: string) {
    setRenaming(id);
    setRenameDraft(current);
    setError("");
  }

  function cancelRename() {
    setRenaming(null);
    setRenameDraft("");
    setError("");
  }

  async function commitRename() {
    if (!renaming) return;
    const cleaned = renameDraft.trim().replace(/^#/, "");
    if (cleaned.length === 0) return;
    try {
      await renameTag(renaming, cleaned);
      await refreshTags();
      await refreshAccounts();
      cancelRename();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  async function addNew() {
    if (!activeProjectId) return;
    const cleaned = newTag.trim().replace(/^#/, "");
    if (cleaned.length === 0) return;
    try {
      await createTag(activeProjectId, cleaned);
      await refreshTags();
      setNewTag("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add.");
    }
  }

  async function remove(id: string) {
    try {
      await deleteTag(id);
      await refreshTags();
      await refreshAccounts();
      if (renaming === id) cancelRename();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete.");
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Project tags"
      description="Tags are project-specific. Use them to group beyond category."
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

      {tags.length === 0 ? (
        <div className="rounded-md border border-line bg-surface px-3 py-6 text-center">
          <p className="t-body text-ink-2">No tags yet.</p>
          <p className="mt-1 t-small text-ink-3">
            Type one above and hit Add tag.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tags.map((r) => {
            const count = countsById[r.label] ?? 0;
            if (renaming === r.id) {
              return (
                <li
                  key={r.id}
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
                key={r.id}
                className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5"
              >
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-surface-2 px-2.5 py-1 text-ink-2"
                  style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                >
                  <span className="text-ink-3">#</span>
                  {r.label}
                </span>
                <span className="min-w-0 flex-1" />
                <span
                  data-numeric
                  className="text-ink-3"
                  style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                >
                  {count} {count === 1 ? "account" : "accounts"}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startRename(r.id, r.label)}
                    className="tap-btn rounded-sm border border-line-2 bg-surface-2 px-2.5 py-1 text-ink-2 hover:text-ink"
                    style={{ fontSize: 11 }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    aria-label={`Remove tag ${r.label}`}
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
