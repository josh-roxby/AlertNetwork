"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { useShell } from "@/components/shell-context";
import { createAccount, parseTikTokHandle } from "@/lib/data/accounts";

const NEW_CATEGORY_OPTION = "__new__";

export function AddAccountSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    activeProjectId,
    categories,
    refreshCategories,
    refreshAccounts,
    refreshTags,
  } = useShell();
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const showCategoryCreate = category === NEW_CATEGORY_OPTION;

  function commitTag() {
    const cleaned = tagDraft.trim().replace(/^#/, "");
    if (!cleaned) return;
    if (tags.includes(cleaned)) {
      setTagDraft("");
      return;
    }
    setTags([...tags, cleaned]);
    setTagDraft("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function reset() {
    setUrl("");
    setCategory("");
    setNewCategoryName("");
    setTags([]);
    setTagDraft("");
    setStatus("idle");
    setErrorMessage("");
  }

  async function submit() {
    if (!activeProjectId) {
      setStatus("error");
      setErrorMessage("Pick an active project first.");
      return;
    }
    if (!url.trim()) return;
    if (!parseTikTokHandle(url)) {
      setStatus("error");
      setErrorMessage("That doesn't look like a TikTok profile URL.");
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    try {
      const account = await createAccount({
        projectId: activeProjectId,
        url: url.trim(),
        categoryId:
          category && category !== NEW_CATEGORY_OPTION ? category : undefined,
        newCategoryLabel:
          category === NEW_CATEGORY_OPTION ? newCategoryName : undefined,
        tagLabels: tags,
      });
      if (category === NEW_CATEGORY_OPTION) {
        await refreshCategories();
      }
      if (tags.length > 0) {
        await refreshTags();
      }
      await refreshAccounts();
      reset();
      onClose();

      // Fire-and-forget 7-day backfill scrape. The sheet has already
      // closed; when the Apify call resolves, refreshAccounts() runs
      // again and the row picks up `last_scraped_at` + the new posts.
      // Failures are swallowed — the next daily cron run will catch
      // up. We don't await this so the UX stays snappy.
      void fetch("/api/scrape/tiktok-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          windowHours: 24 * 7,
        }),
      })
        .then(() => refreshAccounts())
        .catch(() => {});
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Couldn't add the account.",
      );
    }
  }

  const disabled = status === "saving";
  const canSubmit =
    !!activeProjectId &&
    !!url.trim() &&
    !disabled &&
    (category !== NEW_CATEGORY_OPTION || !!newCategoryName.trim());

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add account"
      description="Paste a TikTok URL — handle is detected automatically."
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={disabled}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disabled ? "Adding…" : "Add to project"}
          </button>
        </>
      }
    >
      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Profile URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@northlight"
          disabled={disabled}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </label>

      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={disabled}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink focus:border-accent focus:outline-none disabled:opacity-60"
        >
          <option value="">Pick a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
          <option value={NEW_CATEGORY_OPTION}>+ Add new category…</option>
        </select>
        {showCategoryCreate && (
          <div className="mt-2 rounded-sm border border-dashed border-line-2 p-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name"
              disabled={disabled}
              className="h-10 w-full rounded-xs border border-line-2 bg-bg px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
              autoFocus
            />
            <p className="mt-1.5 t-small text-ink-3">
              Categories are scoped to this project. A palette is assigned
              automatically — manage colours from Settings later.
            </p>
          </div>
        )}
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
          disabled={disabled}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <p className="mt-1 t-small text-ink-3">
          Enter or comma to add. Backspace on an empty input removes the last
          tag.
        </p>
      </div>

      {status === "error" && errorMessage && (
        <p className="mt-2 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad" role="alert">
          {errorMessage}
        </p>
      )}
    </Sheet>
  );
}

export function TeamSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Team & access"
      description="Members can edit. Viewers see scheduled reports only."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Close
          </button>
        </>
      }
    >
      <p className="rounded-sm border border-accent-line bg-accent-soft px-3 py-2 t-small text-accent">
        Single-owner workspaces in v1. Team membership and invites land in a
        later round.
      </p>
    </Sheet>
  );
}
