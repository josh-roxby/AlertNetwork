"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { useShell } from "@/components/shell-context";
import { deleteAccount, updateAccount } from "@/lib/data/accounts";
import { ensureTag, setAccountTags } from "@/lib/data/tags";

export function EditAccountSheet({
  accountId,
  onClose,
}: {
  accountId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const open = accountId !== null;
  const {
    activeProjectId,
    accounts,
    categories,
    refreshAccounts,
    refreshTags,
    refreshPosts,
  } = useShell();
  const account = accountId ? accounts.find((a) => a.id === accountId) : null;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [categoryId, setCategoryId] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Re-seed form state whenever a new account is selected.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!account) return;
    setCategoryId(account.category_id ?? "");
    setTags(account.tagLabels);
    setTagDraft("");
    setStatus("idle");
    setErrorMessage("");
    setConfirmDelete(false);
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

  async function save() {
    if (!account || !activeProjectId) return;
    setStatus("saving");
    setErrorMessage("");
    try {
      await updateAccount(account.id, {
        category_id: categoryId || null,
      });

      // Reconcile tag labels → ids.
      const tagRows = await Promise.all(
        tags.map((label) => ensureTag(activeProjectId, label)),
      );
      await setAccountTags(
        account.id,
        tagRows.map((t) => t.id),
      );

      await refreshAccounts();
      await refreshTags();
      onClose();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Couldn't save the changes.",
      );
    }
  }

  async function destroy() {
    if (!account) return;
    setStatus("saving");
    setErrorMessage("");
    try {
      await deleteAccount(account.id);
      await refreshAccounts();
      await refreshPosts();
      onClose();
      router.push("/accounts");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Couldn't delete the account.",
      );
      setConfirmDelete(false);
    }
  }

  const disabled = status === "saving";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={account ? `Edit ${account.handle}` : "Edit account"}
      description="Update category and tags. Handle and URL stay tied to the source."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!account || disabled}
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disabled ? "Saving…" : "Save changes"}
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
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={disabled}
              className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink focus:border-accent focus:outline-none disabled:opacity-60"
            >
              <option value="">No category</option>
              {categories.map((c) => (
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
              disabled={disabled}
              className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
            />
            <p className="mt-1 t-small text-ink-3">
              Enter or comma to add. Backspace on an empty input removes the
              last tag.
            </p>
          </div>

          {status === "error" && errorMessage && (
            <p
              className="rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-6 rounded-md border border-line bg-surface p-3">
            <div className="t-micro mb-2 text-ink-3">Danger zone</div>
            {confirmDelete ? (
              <div>
                <p className="t-small text-ink-2">
                  Delete <span className="text-ink">{account.handle}</span>?
                  This removes the account, every cached post, and any tag
                  links. It cannot be undone.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={disabled}
                    className="tap-btn rounded-sm border border-line-2 bg-surface px-3 py-2 t-small font-medium text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={destroy}
                    disabled={disabled}
                    className="tap-btn rounded-sm bg-bad px-3 py-2 t-small font-semibold text-[#0A0A0A] hover:opacity-90 disabled:opacity-60"
                  >
                    {disabled ? "Deleting…" : "Yes, delete"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={disabled}
                className="tap-row flex w-full items-center justify-between rounded-sm border border-line-2 bg-surface-2 px-3 py-2 text-left text-bad hover:bg-bad-soft disabled:opacity-60"
              >
                <span className="t-small font-medium">Delete account</span>
                <span aria-hidden>×</span>
              </button>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}
