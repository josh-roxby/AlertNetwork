"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { useShell, useActiveProject } from "@/components/shell-context";
import { createReport, type ReportScope } from "@/lib/data/reports";
import { paletteBg } from "@/lib/data/palette";

type ScopeKind = "project" | "category" | "account";

export function NewReportSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const {
    activeProjectId,
    categories,
    accounts,
    refreshReports,
  } = useShell();
  const project = useActiveProject();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("weekly");
  const [scopeKind, setScopeKind] = useState<ScopeKind>("project");
  const [scopeCategories, setScopeCategories] = useState<Set<string>>(
    new Set(),
  );
  const [scopeAccounts, setScopeAccounts] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function close() {
    setName("");
    setDescription("");
    setCadence("weekly");
    setScopeKind("project");
    setScopeCategories(new Set());
    setScopeAccounts(new Set());
    setStatus("idle");
    setErrorMessage("");
    onClose();
  }

  function toggleCategory(id: string) {
    const next = new Set(scopeCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setScopeCategories(next);
  }

  function toggleAccount(id: string) {
    const next = new Set(scopeAccounts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setScopeAccounts(next);
  }

  async function submit() {
    if (!activeProjectId) {
      setStatus("error");
      setErrorMessage("Pick an active project first.");
      return;
    }
    if (!name.trim()) return;
    if (scopeKind === "category" && scopeCategories.size === 0) {
      setStatus("error");
      setErrorMessage("Pick at least one category.");
      return;
    }
    if (scopeKind === "account" && scopeAccounts.size === 0) {
      setStatus("error");
      setErrorMessage("Pick at least one account.");
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    const scope: ReportScope =
      scopeKind === "category"
        ? { kind: "category", categoryIds: Array.from(scopeCategories) }
        : scopeKind === "account"
          ? { kind: "account", accountIds: Array.from(scopeAccounts) }
          : { kind: "project" };

    try {
      const report = await createReport({
        projectId: activeProjectId,
        name,
        description,
        cadence,
        scope,
      });
      await refreshReports();
      close();
      router.push(`/reports/${report.id}`);
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Couldn't create the report.",
      );
    }
  }

  const disabled = status === "saving";

  return (
    <Sheet
      open={open}
      onClose={close}
      title="New report"
      description={`Scheduled summary for ${project?.name ?? "this project"}.`}
      footer={
        <>
          <button
            type="button"
            onClick={close}
            disabled={disabled}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !name.trim()}
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disabled ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Monthly partner roundup"
          disabled={disabled}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </label>

      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional — used as the email intro."
          disabled={disabled}
          className="w-full resize-none rounded-sm border border-line-2 bg-surface-2 px-3 py-2 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </label>

      <div className="mb-4">
        <span className="t-micro mb-1.5 block text-ink-3">Cadence</span>
        <div className="grid grid-cols-2 gap-2">
          {(["weekly", "monthly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCadence(c)}
              aria-pressed={cadence === c}
              disabled={disabled}
              className={`tap-row rounded-sm border px-3 py-2.5 text-left transition-colors duration-[120ms] ${
                cadence === c
                  ? "border-accent-line bg-accent-soft text-accent"
                  : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2"
              }`}
            >
              <span className="t-body font-medium">
                {c === "weekly" ? "Weekly" : "Monthly"}
              </span>
              <span className="mt-0.5 block t-micro text-ink-3">
                {c === "weekly"
                  ? "Every Monday · 08:00 UTC"
                  : "1st of month · 08:00 UTC"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <span className="t-micro mb-1.5 block text-ink-3">Scope</span>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: "project", label: "Project", hint: "Whole project" },
              { id: "category", label: "Category", hint: "Pick categories" },
              { id: "account", label: "Account", hint: "Pick accounts" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setScopeKind(opt.id)}
              aria-pressed={scopeKind === opt.id}
              disabled={disabled}
              className={`tap-row rounded-sm border px-2 py-2 text-center transition-colors duration-[120ms] ${
                scopeKind === opt.id
                  ? "border-accent-line bg-accent-soft text-accent"
                  : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2"
              }`}
            >
              <span className="block t-small font-medium">{opt.label}</span>
              <span className="mt-0.5 block t-micro text-ink-3">
                {opt.hint}
              </span>
            </button>
          ))}
        </div>

        {scopeKind === "category" && (
          <div className="mt-2 rounded-sm border border-dashed border-line-2 p-2">
            {categories.length === 0 ? (
              <p className="t-small text-ink-3">
                No categories yet. Add one inline when adding an account.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-1">
                {categories.map((c) => {
                  const selected = scopeCategories.has(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(c.id)}
                        aria-pressed={selected}
                        disabled={disabled}
                        className={`tap-row flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-left transition-colors duration-[120ms] ${
                          selected
                            ? "bg-accent-soft text-accent"
                            : "text-ink-2 hover:bg-surface-2"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`inline-block h-2 w-2 shrink-0 rounded-full ${paletteBg(c.palette_id)}`}
                        />
                        <span className="truncate t-small">{c.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {scopeKind === "account" && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-sm border border-dashed border-line-2 p-2">
            {accounts.length === 0 ? (
              <p className="t-small text-ink-3">
                No accounts in this project yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {accounts.map((a) => {
                  const selected = scopeAccounts.has(a.id);
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => toggleAccount(a.id)}
                        aria-pressed={selected}
                        disabled={disabled}
                        className={`tap-row flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-left transition-colors duration-[120ms] ${
                          selected
                            ? "bg-accent-soft text-accent"
                            : "text-ink-2 hover:bg-surface-2"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`inline-block h-2 w-2 shrink-0 rounded-full ${paletteBg(a.category?.palette_id)}`}
                        />
                        <span className="truncate t-small">{a.handle}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {status === "error" && errorMessage && (
        <p
          className="mt-3 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </Sheet>
  );
}
