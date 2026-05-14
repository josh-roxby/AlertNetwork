"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import {
  CATEGORIES,
  findAccount,
  type Category,
} from "@/lib/placeholder-data";

export function EditAccountSheet({
  accountId,
  onClose,
}: {
  accountId: string | null;
  onClose: () => void;
}) {
  const open = accountId !== null;
  const account = accountId ? findAccount(accountId) : null;

  const [category, setCategory] = useState<Category | "">("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");

  // Re-seed local form state whenever a new account is selected. The cascade
  // is intentional — we're syncing form state to a new server-derived source.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!account) return;
    setCategory(account.category);
    setTags(account.tags);
    setTagDraft("");
  }, [account]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function commitTag() {
    const cleaned = tagDraft.trim().replace(/^#/, "");
    if (!cleaned || tags.includes(cleaned)) {
      setTagDraft("");
      return;
    }
    setTags([...tags, cleaned]);
    setTagDraft("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={account ? `Edit ${account.handle}` : "Edit account"}
      description="Update category and tags. Other fields are managed automatically."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save changes
          </button>
        </>
      }
    >
      {!account ? (
        <p className="t-body text-ink-3">Account not found.</p>
      ) : (
        <>
          <label className="mb-4 block">
            <span className="t-micro mb-1.5 block text-ink-3">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink focus:border-accent focus:outline-none"
            >
              <option value="">Pick a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mb-4">
            <span className="t-micro mb-1.5 block text-ink-3">Tags</span>
            {tags.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <li key={t}>
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-surface-2 px-2.5 py-1 text-ink-2"
                      style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                    >
                      <span className="text-ink-3">#</span>
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        aria-label={`Remove tag ${t}`}
                        className="-mr-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-ink-3 hover:bg-surface-3 hover:text-ink"
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <input
              type="text"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  commitTag();
                } else if (
                  e.key === "Backspace" &&
                  tagDraft.length === 0 &&
                  tags.length > 0
                ) {
                  setTags(tags.slice(0, -1));
                }
              }}
              onBlur={commitTag}
              placeholder="Type a tag, press Enter"
              className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
            />
            <p className="mt-1 t-small text-ink-3">
              Enter or comma to add. Backspace on an empty input removes the
              last tag.
            </p>
          </div>

          <p className="mt-2 rounded-sm border border-accent-line bg-accent-soft px-3 py-2 t-small text-accent">
            Preview only. Save is wired up alongside the DB layer.
          </p>
        </>
      )}
    </Sheet>
  );
}
