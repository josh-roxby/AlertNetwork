"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { useShell, useActiveProject } from "@/components/shell-context";
import {
  createAccount,
  parseTikTokHandle,
  triggerAccountScrape,
} from "@/lib/data/accounts";

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
    refreshPosts,
  } = useShell();
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [status, setStatus] = useState<
    | "idle"
    | "saving"
    | "scraping"
    | "done"
    | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [scrapeSummary, setScrapeSummary] = useState<{
    scanned: number;
    written: number;
  } | null>(null);

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
    setScrapeSummary(null);
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

    let createdAccount;
    try {
      createdAccount = await createAccount({
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
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Couldn't add the account.",
      );
      return;
    }

    // Now run the backfill scrape WHILE the sheet stays open so the
    // user sees progress + outcome. windowHours=0 disables the time
    // filter — Apify already returns posts most-recent-first, so the
    // initial scrape captures everything visible. The daily cron
    // re-runs at 48h so it stays a no-op for fresh data.
    setStatus("scraping");
    const result = await triggerAccountScrape(createdAccount.id, 0);
    await refreshAccounts();
    await refreshPosts();
    if (result.ok) {
      setScrapeSummary({ scanned: result.scanned, written: result.written });
      if (result.written === 0 && result.scanned > 0) {
        // Apify returned posts but the mapper rejected every one of
        // them — likely a schema mismatch we haven't seen before.
        // Surface the field names so the user can report them.
        setStatus("error");
        setErrorMessage(
          `Apify returned ${result.scanned} post${result.scanned === 1 ? "" : "s"} but none could be mapped to the database. Fields seen: ${(result.diagnosticKeys ?? []).slice(0, 8).join(", ") || "unknown"}.`,
        );
      } else {
        setStatus("done");
      }
    } else {
      setStatus("error");
      setErrorMessage(
        `Scrape failed: ${result.error} — the account is saved; you can retry from its detail page.`,
      );
    }
  }

  const busy = status === "saving" || status === "scraping";
  const canSubmit =
    !!activeProjectId &&
    !!url.trim() &&
    status === "idle" &&
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
        status === "done" || status === "error" ? (
          <>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={busy}
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
              {status === "saving"
                ? "Adding…"
                : status === "scraping"
                  ? "Scraping…"
                  : "Add to project"}
            </button>
          </>
        )
      }
    >
      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Profile URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@northlight"
          disabled={busy}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </label>

      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={busy}
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
              disabled={busy}
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
          disabled={busy}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <p className="mt-1 t-small text-ink-3">
          Enter or comma to add. Backspace on an empty input removes the last
          tag.
        </p>
      </div>

      {status === "scraping" && (
        <p className="mt-2 rounded-sm border border-accent-line bg-accent-soft px-3 py-2 t-small text-accent">
          Scraping the last 7 days from TikTok. This can take up to a
          minute — keep the sheet open.
        </p>
      )}

      {status === "done" && scrapeSummary && (
        <p className="mt-2 rounded-sm border border-good bg-good-soft px-3 py-2 t-small text-good">
          Account added. Scanned {scrapeSummary.scanned} post
          {scrapeSummary.scanned === 1 ? "" : "s"}, wrote {scrapeSummary.written}
          {scrapeSummary.written === 1 ? "" : ""} to the project.
        </p>
      )}

      {status === "error" && errorMessage && (
        <p
          className="mt-2 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </Sheet>
  );
}

type MemberRowFromApi = {
  id: string;
  project_id: string;
  user_id: string;
  role: "viewer";
  invited_email: string;
  invited_at: string;
  display_email: string;
};

export function TeamSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { activeProjectId, isOwner } = useShell();
  const project = useActiveProject();

  const [members, setMembers] = useState<MemberRowFromApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Refresh the list when the sheet opens or the project changes.
  // Errors get surfaced inline rather than thrown — the rest of the
  // sheet stays usable even if the network is flaky.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || !activeProjectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/projects/${activeProjectId}/members`)
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          members?: MemberRowFromApi[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error ?? "Failed to load members.");
          setMembers([]);
        } else {
          setMembers(body.members ?? []);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, activeProjectId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProjectId) return;
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy("invite");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        outcome?: "invited" | "existing";
        member?: MemberRowFromApi;
        error?: string;
      };
      if (!res.ok || !body.ok || !body.member) {
        setError(body.error ?? "Failed to invite.");
        return;
      }
      setNotice(
        body.outcome === "invited"
          ? `Magic-link sent to ${trimmed}. They'll have view access once they sign in.`
          : `${trimmed} added as a viewer. They already had an account — share the dashboard URL with them.`,
      );
      setEmail("");
      // Optimistic refresh: append the new row and re-fetch quietly
      // so the display_email backfill is consistent.
      setMembers((prev) => [...prev, body.member as MemberRowFromApi]);
      fetch(`/api/projects/${activeProjectId}/members`)
        .then(async (r) => {
          const b = (await r.json().catch(() => ({}))) as {
            members?: MemberRowFromApi[];
          };
          if (b.members) setMembers(b.members);
        })
        .catch(() => {});
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(memberId: string, displayEmail: string) {
    if (!activeProjectId) return;
    if (
      !window.confirm(`Remove ${displayEmail} from ${project?.name ?? "this project"}?`)
    ) {
      return;
    }
    setBusy(memberId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/projects/${activeProjectId}/members/${memberId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed to remove member.");
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setNotice(`${displayEmail} removed.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Team & access"
      description={
        isOwner
          ? "Invite viewers to see the dashboard, accounts and report views. They can't edit anything."
          : "You have view-only access to this project."
      }
      footer={
        <button
          type="button"
          onClick={onClose}
          className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          Close
        </button>
      }
    >
      {isOwner && (
        <form onSubmit={handleInvite} className="mb-4 flex flex-col gap-2">
          <label className="t-micro text-ink-3" htmlFor="member-email">
            Invite by email
          </label>
          <div className="flex gap-2">
            <input
              id="member-email"
              type="email"
              autoComplete="off"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="viewer@example.com"
              disabled={busy === "invite"}
              className="h-10 flex-1 rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy === "invite" || !email.trim()}
              className="tap-btn shrink-0 rounded-sm bg-accent px-4 t-small font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "invite" ? "Sending…" : "Invite"}
            </button>
          </div>
          <p className="t-meta text-ink-4" style={{ fontSize: 10 }}>
            They&apos;ll get a magic-link sign-in email. Viewers can see the
            dashboard, accounts and report views — they can&apos;t add accounts
            or change settings.
          </p>
        </form>
      )}

      {error && (
        <p
          className="mb-3 rounded-sm border border-bad bg-bad-soft px-2.5 py-2 t-small text-bad"
          role="alert"
        >
          {error}
        </p>
      )}
      {notice && !error && (
        <p
          className="mb-3 rounded-sm border border-accent-line bg-accent-soft px-2.5 py-2 t-small text-accent"
          role="status"
        >
          {notice}
        </p>
      )}

      <div className="mb-2 flex items-center justify-between">
        <h3 className="t-micro text-ink-3">
          Members{members.length > 0 ? ` · ${members.length + 1}` : ""}
        </h3>
        {loading && (
          <span className="t-meta text-ink-4" style={{ fontSize: 10 }}>
            Loading…
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        <li className="flex items-center justify-between gap-3 rounded-sm border border-line bg-surface px-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate t-body text-ink">
              {project?.name ? `${project.name} · owner` : "Owner"}
            </div>
            <div
              className="t-meta text-ink-3"
              style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            >
              Full access
            </div>
          </div>
          <span
            className="inline-flex shrink-0 items-center rounded-full bg-good-soft px-2 py-0.5 text-good"
            style={{ fontSize: 10, fontWeight: 700 }}
          >
            Owner
          </span>
        </li>
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-sm border border-line bg-surface px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate t-body text-ink">{m.display_email}</div>
              <div
                className="t-meta text-ink-3"
                style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              >
                Invited {new Date(m.invited_at).toLocaleDateString("en-GB")}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-ink-2"
                style={{ fontSize: 10, fontWeight: 700 }}
              >
                Viewer
              </span>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemove(m.id, m.display_email)}
                  disabled={busy === m.id}
                  className="tap-btn rounded-sm border border-line-2 bg-surface px-2.5 py-1 t-small text-ink-3 hover:border-bad hover:text-bad disabled:opacity-60"
                >
                  {busy === m.id ? "…" : "Remove"}
                </button>
              )}
            </div>
          </li>
        ))}
        {!loading && members.length === 0 && (
          <li
            className="rounded-sm border border-dashed border-line-2 bg-surface px-3 py-4 text-center t-small text-ink-3"
          >
            No viewers yet.{isOwner ? " Invite one above." : ""}
          </li>
        )}
      </ul>
    </Sheet>
  );
}
