"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { useShell } from "@/components/shell-context";
import {
  addReportRecipient,
  deleteReport,
  getReport,
  listReportRecipients,
  removeReportRecipient,
  updateReport,
  type ReportRecipientRow,
} from "@/lib/data/reports";
import { useAuthUser } from "@/lib/use-auth-user";
import type { ReportRow } from "@/lib/data/types";

type Status = ReportRow["status"];

const STATUS_OPTIONS: { id: Status; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "active", label: "Live" },
  { id: "paused", label: "Paused" },
];

export function ManageReportSheet({
  reportId,
  onClose,
}: {
  reportId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const open = reportId !== null;
  const { refreshReports } = useShell();
  const user = useAuthUser();

  const [report, setReport] = useState<ReportRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("weekly");
  const [status, setStatus] = useState<Status>("draft");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Send-test panel state
  const [testEmail, setTestEmail] = useState("");
  const [testState, setTestState] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "done"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  // Recipients panel state. `recipients` is sourced from
  // `report_recipients` whenever the sheet opens with a fresh
  // reportId, then mutated locally on add/remove so the UI stays
  // snappy without re-fetching.
  const [recipients, setRecipients] = useState<ReportRecipientRow[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");
  const [recipientError, setRecipientError] = useState("");
  const [recipientBusy, setRecipientBusy] = useState(false);

  // Run-now (dev) state
  const [runState, setRunState] = useState<
    | { kind: "idle" }
    | { kind: "running" }
    | { kind: "done"; accounts: number; sentAt: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load the report row whenever the sheet opens with a new id.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    getReport(reportId)
      .then((row) => {
        if (cancelled) return;
        if (row) {
          setReport(row);
          setName(row.name);
          setDescription(row.description ?? "");
          setCadence(row.cadence);
          setStatus(row.status as Status);
        }
      })
      .catch(() => {});
    setError("");
    setSavedAt(null);
    setTestEmail(user?.email ?? "");
    setTestState({ kind: "idle" });
    setRunState({ kind: "idle" });
    setConfirmDelete(false);

    // Load recipients in parallel with the report row.
    setRecipientsLoading(true);
    setNewRecipient("");
    setRecipientError("");
    listReportRecipients(reportId)
      .then((rows) => {
        if (!cancelled) setRecipients(rows);
      })
      .catch(() => {
        if (!cancelled) setRecipients([]);
      })
      .finally(() => {
        if (!cancelled) setRecipientsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reportId, user?.email]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function close() {
    setError("");
    setSavedAt(null);
    setTestState({ kind: "idle" });
    setRunState({ kind: "idle" });
    setConfirmDelete(false);
    setRecipientError("");
    setNewRecipient("");
    onClose();
  }

  async function addRecipient() {
    if (!report) return;
    const candidate = newRecipient.trim().toLowerCase();
    if (!candidate) return;
    if (!/^.+@.+\..+/.test(candidate)) {
      setRecipientError("Looks off — check the email and try again.");
      return;
    }
    if (recipients.some((r) => r.email.toLowerCase() === candidate)) {
      setRecipientError("That address is already on this report.");
      return;
    }
    setRecipientBusy(true);
    setRecipientError("");
    try {
      const row = await addReportRecipient(report.id, candidate);
      setRecipients((prev) =>
        [...prev, row].sort((a, b) => a.email.localeCompare(b.email)),
      );
      setNewRecipient("");
    } catch (err) {
      setRecipientError(
        err instanceof Error ? err.message : "Couldn't add that one.",
      );
    } finally {
      setRecipientBusy(false);
    }
  }

  async function removeRecipient(id: string) {
    const prev = recipients;
    // Optimistic — drop locally first, restore on failure.
    setRecipients((rows) => rows.filter((r) => r.id !== id));
    try {
      await removeReportRecipient(id);
    } catch (err) {
      setRecipients(prev);
      setRecipientError(
        err instanceof Error ? err.message : "Couldn't remove that one.",
      );
    }
  }

  async function save() {
    if (!report) return;
    setBusy(true);
    setError("");
    try {
      await updateReport(report.id, {
        name,
        description,
        cadence,
        status,
      });
      await refreshReports();
      const fresh = await getReport(report.id);
      if (fresh) setReport(fresh);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!report) return;
    const email = testEmail.trim();
    if (!email) return;
    setTestState({ kind: "sending" });
    try {
      const res = await fetch(`/api/reports/${report.id}/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        pending?: boolean;
        message?: string;
        error?: string;
      };
      if (res.status === 202 && body.pending) {
        setTestState({
          kind: "done",
          message: body.message ?? "Request reached the server.",
        });
      } else if (res.ok && body.ok) {
        setTestState({
          kind: "done",
          message: `Test sent to ${email}.`,
        });
      } else {
        setTestState({
          kind: "error",
          message: body.error ?? `Send failed (${res.status}).`,
        });
      }
    } catch (err) {
      setTestState({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
    }
  }

  async function runNow() {
    if (!report) return;
    setRunState({ kind: "running" });
    try {
      const res = await fetch(`/api/reports/${report.id}/run-now`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        accounts?: number;
        sentAt?: string;
        error?: string;
      };
      if (res.ok && body.ok) {
        setRunState({
          kind: "done",
          accounts: body.accounts ?? 0,
          sentAt: body.sentAt ?? new Date().toISOString(),
        });
        await refreshReports();
        const fresh = await getReport(report.id);
        if (fresh) setReport(fresh);
      } else {
        setRunState({
          kind: "error",
          message: body.error ?? `Run failed (${res.status}).`,
        });
      }
    } catch (err) {
      setRunState({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
    }
  }

  async function destroy() {
    if (!report) return;
    setBusy(true);
    setError("");
    try {
      await deleteReport(report.id);
      await refreshReports();
      close();
      router.push("/reports");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete.");
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  const dirty =
    report !== null &&
    (name !== report.name ||
      (description || null) !== (report.description ?? null) ||
      cadence !== report.cadence ||
      status !== report.status);

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Manage report"
      description={report ? report.name : "Report settings, send test, dev tools."}
      footer={
        <>
          <button
            type="button"
            onClick={close}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Close
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || busy}
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      {!report ? (
        <p className="t-body text-ink-3">Loading…</p>
      ) : (
        <>
          <section className="mb-5">
            <h3 className="t-micro mb-2 text-ink-3">Details</h3>
            <label className="mb-3 block">
              <span className="t-micro mb-1.5 block text-ink-3">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
              />
            </label>
            <label className="mb-3 block">
              <span className="t-micro mb-1.5 block text-ink-3">
                Description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                disabled={busy}
                className="w-full resize-none rounded-sm border border-line-2 bg-surface-2 px-3 py-2 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
              />
            </label>

            <div className="mb-3">
              <span className="t-micro mb-1.5 block text-ink-3">Cadence</span>
              <div className="grid grid-cols-2 gap-2">
                {(["weekly", "monthly"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCadence(c)}
                    aria-pressed={cadence === c}
                    disabled={busy}
                    className={`tap-row rounded-sm border px-3 py-2 text-left transition-colors duration-[120ms] ${
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
                        ? "Mon · 08:00 UTC"
                        : "1st · 08:00 UTC"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="t-micro mb-1.5 block text-ink-3">Status</span>
              <div className="grid grid-cols-3 gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatus(opt.id)}
                    aria-pressed={status === opt.id}
                    disabled={busy}
                    className={`tap-row rounded-sm border px-2 py-1.5 text-center transition-colors duration-[120ms] ${
                      status === opt.id
                        ? "border-accent-line bg-accent-soft text-accent"
                        : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2"
                    }`}
                  >
                    <span className="t-small font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {savedAt && !dirty && (
              <p className="mt-3 t-small text-good">Saved.</p>
            )}
            {error && (
              <p
                className="mt-3 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
                role="alert"
              >
                {error}
              </p>
            )}
          </section>

          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="t-micro text-ink-3">
                Recipients{" "}
                <span
                  data-numeric
                  className="text-ink-4"
                  style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                >
                  {recipientsLoading ? "…" : recipients.length}
                </span>
              </h3>
            </div>
            <p className="mb-2 t-small text-ink-3">
              Every address listed here receives the report on each scheduled
              send (Monday for weekly, 1st for monthly).
            </p>

            {recipientsLoading ? (
              <div className="rounded-md border border-dashed border-line-2 bg-surface px-3 py-4 text-center t-small text-ink-3">
                Loading…
              </div>
            ) : recipients.length === 0 ? (
              <div className="rounded-md border border-dashed border-line-2 bg-surface px-3 py-4 text-center">
                <p className="t-small text-ink-2">No recipients yet.</p>
                <p
                  className="mt-1 t-meta text-ink-3"
                  style={{ fontSize: 10 }}
                >
                  Add at least one address below.
                </p>
              </div>
            ) : (
              <ul className="mb-2 flex flex-col gap-1.5">
                {recipients.map((r) => (
                  <li key={r.id}>
                    <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2">
                      <span
                        data-numeric
                        className="min-w-0 flex-1 truncate t-body text-ink"
                        style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
                      >
                        {r.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(r.id)}
                        aria-label={`Remove ${r.email}`}
                        title="Remove"
                        className="tap-btn inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
                      >
                        <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>
                          ×
                        </span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void addRecipient();
              }}
              className="flex gap-2"
            >
              <input
                type="email"
                value={newRecipient}
                onChange={(e) => {
                  setNewRecipient(e.target.value);
                  if (recipientError) setRecipientError("");
                }}
                placeholder="new.recipient@example.com"
                disabled={recipientBusy}
                className="h-10 flex-1 rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!newRecipient.trim() || recipientBusy}
                className="tap-btn rounded-sm bg-accent px-3 py-2 t-small font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
              >
                {recipientBusy ? "Adding…" : "Add"}
              </button>
            </form>
            {recipientError && (
              <p
                className="mt-2 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
                role="alert"
              >
                {recipientError}
              </p>
            )}
          </section>

          <section className="mb-5">
            <h3 className="t-micro mb-2 text-ink-3">Send test</h3>
            <p className="mb-2 t-small text-ink-3">
              Drops a copy of this report in an inbox right now. Useful for
              eyeballing the email before the next scheduled send.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={testState.kind === "sending"}
                className="h-10 flex-1 rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={sendTest}
                disabled={
                  !testEmail.trim() || testState.kind === "sending"
                }
                className="tap-btn rounded-sm bg-accent px-3 py-2 t-small font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testState.kind === "sending" ? "Sending…" : "Send test"}
              </button>
            </div>
            {testState.kind === "done" && (
              <p className="mt-2 rounded-sm border border-accent-line bg-accent-soft px-3 py-2 t-small text-accent">
                {testState.message}
              </p>
            )}
            {testState.kind === "error" && (
              <p
                className="mt-2 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
                role="alert"
              >
                {testState.message}
              </p>
            )}
          </section>

          <section className="mb-5">
            <h3 className="t-micro mb-2 text-ink-3">
              Run report{" "}
              <span className="t-meta text-ink-4" style={{ fontSize: 9 }}>
                (DEV)
              </span>
            </h3>
            <p className="mb-2 t-small text-ink-3">
              Fires the generation step out-of-band — stamps `last_sent_at`
              and writes a `report_history` row using the data already
              persisted by the daily scrape. We&apos;ll remove this once
              real SMTP delivery is wired up.
            </p>
            <button
              type="button"
              onClick={runNow}
              disabled={runState.kind === "running"}
              className="tap-row flex w-full items-center justify-between rounded-md border border-line bg-surface px-3 py-3 text-left hover:bg-surface-2 disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block t-body font-medium text-ink">
                  Generate now
                </span>
                <span className="block t-small text-ink-3">
                  Counts scoped accounts, stamps the send, records history.
                </span>
              </span>
              <span aria-hidden className="text-ink-3">
                {runState.kind === "running" ? "…" : "▶"}
              </span>
            </button>
            {runState.kind === "done" && (
              <p className="mt-2 rounded-sm border border-good bg-good-soft px-3 py-2 t-small text-good">
                Recorded a send covering {runState.accounts} account
                {runState.accounts === 1 ? "" : "s"}.
              </p>
            )}
            {runState.kind === "error" && (
              <p
                className="mt-2 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
                role="alert"
              >
                {runState.message}
              </p>
            )}
          </section>

          <PasswordSection
            reportId={report.id}
            hasPassword={!!report.password_hash}
            onChanged={async () => {
              await refreshReports();
              const fresh = await getReport(report.id);
              if (fresh) setReport(fresh);
            }}
          />

          <section>
            <h3 className="t-micro mb-2 text-ink-3">Danger zone</h3>
            {confirmDelete ? (
              <div className="rounded-md border border-line bg-surface p-3">
                <p className="t-small text-ink-2">
                  Delete <span className="text-ink">{report.name}</span>?
                  Removes the report and its send history. This can&apos;t be
                  undone.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={busy}
                    className="tap-btn rounded-sm border border-line-2 bg-surface-2 px-3 py-2 t-small font-medium text-ink-2 hover:bg-surface-3 hover:text-ink disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={destroy}
                    disabled={busy}
                    className="tap-btn rounded-sm bg-bad px-3 py-2 t-small font-semibold text-[#0A0A0A] hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? "Deleting…" : "Yes, delete"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="tap-row flex w-full items-center justify-between rounded-md border border-line bg-surface px-3 py-3 text-left text-bad hover:bg-bad-soft disabled:opacity-60"
              >
                <span className="t-body font-medium">Delete report</span>
                <span aria-hidden>×</span>
              </button>
            )}
          </section>
        </>
      )}
    </Sheet>
  );
}

function PasswordSection({
  reportId,
  hasPassword,
  onChanged,
}: {
  reportId: string;
  hasPassword: boolean;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "done"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function set() {
    if (password.length < 4) {
      setStatus({ kind: "error", message: "Use at least 4 characters." });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      const res = await fetch(`/api/reports/${reportId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setStatus({
          kind: "error",
          message: body.error ?? "Could not save.",
        });
        return;
      }
      setPassword("");
      setEditing(false);
      setStatus({ kind: "done", message: "Password set." });
      await onChanged();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
    }
  }

  async function clear() {
    setStatus({ kind: "saving" });
    try {
      const res = await fetch(`/api/reports/${reportId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: null }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setStatus({
          kind: "error",
          message: body.error ?? "Could not clear.",
        });
        return;
      }
      setStatus({ kind: "done", message: "Password removed." });
      await onChanged();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
    }
  }

  const busy = status.kind === "saving";

  return (
    <section className="mb-5">
      <h3 className="t-micro mb-2 text-ink-3">Password protection</h3>
      <p className="mb-2 t-small text-ink-3">
        Lock the public <code>/view</code> link behind a password. Anyone
        with the URL also needs the password before the report renders.
      </p>

      {hasPassword && !editing ? (
        <div className="rounded-md border border-line bg-surface px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="t-small text-ink">
              Password is set.
              <span className="ml-1 t-meta text-ink-3" style={{ fontSize: 10 }}>
                Anyone visiting the view link will be prompted.
              </span>
            </span>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setStatus({ kind: "idle" });
                }}
                disabled={busy}
                className="tap-btn rounded-sm border border-line-2 bg-surface-2 px-3 py-1.5 t-small font-medium text-ink-2 hover:text-ink"
              >
                Change
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={busy}
                className="tap-btn rounded-sm border border-line-2 bg-surface-2 px-3 py-1.5 t-small font-medium text-bad hover:bg-bad-soft"
              >
                {busy ? "…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasPassword ? "New password" : "Set a password"}
            disabled={busy}
            className="h-10 flex-1 rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            onClick={set}
            disabled={busy || password.length < 4}
            className="tap-btn rounded-sm bg-accent px-3 py-2 t-small font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : hasPassword ? "Update" : "Set password"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setPassword("");
                setStatus({ kind: "idle" });
              }}
              className="tap-btn rounded-sm border border-line-2 bg-surface px-3 py-2 t-small font-medium text-ink-2 hover:text-ink"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {status.kind === "done" && (
        <p className="mt-2 t-small text-good">{status.message}</p>
      )}
      {status.kind === "error" && (
        <p
          className="mt-2 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
          role="alert"
        >
          {status.message}
        </p>
      )}
    </section>
  );
}
