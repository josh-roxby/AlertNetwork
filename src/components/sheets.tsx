"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { CATEGORIES, placeholderProjects } from "@/lib/placeholder-data";

function FooterButtons({
  onClose,
  cta,
}: {
  onClose: () => void;
  cta: string;
}) {
  return (
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
        {cta}
      </button>
    </>
  );
}

function PreviewNote() {
  return (
    <p className="mt-2 rounded-sm border border-accent-line bg-accent-soft px-3 py-2 t-small text-accent">
      Preview only. Submission is disabled until the API and DB layer are
      wired up.
    </p>
  );
}

const NEW_CATEGORY_OPTION = "__new__";

export function AddAccountSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");

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
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add account"
      description="Paste a TikTok URL — handle is detected automatically."
      footer={<FooterButtons onClose={onClose} cta="Add to project" />}
    >
      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Profile URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@northlight"
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
      </label>

      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Pick a category…</option>
          {CATEGORIES.map((c) => (
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
              className="h-10 w-full rounded-xs border border-line-2 bg-bg px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
              autoFocus
            />
            <p className="mt-1.5 t-small text-ink-3">
              Categories are workspace-wide. Pick a colour from the fixed
              palette in Settings → Tags &amp; categories once a category
              manager exists (Round 3).
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
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
        <p className="mt-1 t-small text-ink-3">
          Enter or comma to add. Backspace on an empty input removes the
          last tag.
        </p>
      </div>

      <PreviewNote />
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
            Copy invite link
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
          >
            Done
          </button>
        </>
      }
    >
      <section className="mb-5">
        <h3 className="t-micro mb-2 text-ink-3">Members</h3>
        <TeamRow
          initials="JR"
          name="Josh Roxby"
          email="josh@exhalestudios.co"
          role="Owner"
          tone="owner"
        />
      </section>

      <section className="mb-5">
        <h3 className="t-micro mb-2 text-ink-3">Report viewers</h3>
        <TeamRow
          initials="SR"
          name="Sarah Reed"
          email="sarah@studio.com"
          role="Viewer"
          tone="viewer"
          removable
        />
      </section>

      <section>
        <h3 className="t-micro mb-2 text-ink-3">Invite by email</h3>
        <div className="flex gap-2">
          <input
            disabled
            type="email"
            placeholder="name@example.com"
            className="h-10 flex-1 rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-70"
          />
          <button
            type="button"
            disabled
            className="tap-btn rounded-sm bg-accent px-3 t-body font-semibold text-[#0A0A0A] disabled:opacity-50"
          >
            Send invite
          </button>
        </div>
        <p className="mt-1.5 t-small text-ink-3">
          Invited users join as Viewers by default. Promote to Member from
          their row.
        </p>
        <PreviewNote />
      </section>
    </Sheet>
  );
}

function TeamRow({
  initials,
  name,
  email,
  role,
  tone,
  removable = false,
}: {
  initials: string;
  name: string;
  email: string;
  role: string;
  tone: "owner" | "viewer";
  removable?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-3">
      <span
        aria-hidden
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ring-1 ring-line-2 ${
          tone === "owner"
            ? "bg-accent text-[#0A0A0A] ring-accent-line"
            : "bg-surface-3 text-ink"
        }`}
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block t-body font-medium text-ink">{name}</span>
        <span className="block t-small truncate text-ink-3">{email}</span>
      </span>
      <span
        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 ${
          tone === "owner"
            ? "bg-accent-soft text-accent"
            : "bg-surface-3 text-ink-3"
        }`}
        style={{ fontSize: 10, fontWeight: 600 }}
      >
        {role}
      </span>
      {removable && (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          className="tap-btn -mr-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function projectsExportPreview() {
  // Placeholder export used by the drawer's project card if we wire a real
  // switcher later. Keeps the placeholder data import meaningful for tree-
  // shaking checks.
  return placeholderProjects.length;
}
