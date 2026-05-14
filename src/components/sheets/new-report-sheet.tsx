"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { ScopeControl } from "@/components/scope-control";
import {
  placeholderAccounts,
  type Category,
  type Report,
} from "@/lib/placeholder-data";

const CADENCE_OPTIONS: Report["cadence"][] = ["weekly", "monthly"];

export function NewReportSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cadence, setCadence] = useState<Report["cadence"]>("monthly");
  const [schedule, setSchedule] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientDraft, setRecipientDraft] = useState("");
  const [scope, setScope] = useState<Report["scopeKind"]>("project");
  const [pickedCategories, setPickedCategories] = useState<Set<Category>>(
    () => new Set(),
  );
  const [pickedAccounts, setPickedAccounts] = useState<Set<string>>(
    () => new Set(),
  );
  const [passwordOn, setPasswordOn] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  function reset() {
    setName("");
    setDescription("");
    setCadence("monthly");
    setSchedule("");
    setRecipients([]);
    setRecipientDraft("");
    setScope("project");
    setPickedCategories(new Set());
    setPickedAccounts(new Set());
    setPasswordOn(false);
    setPasswordValue("");
  }

  function commitRecipient() {
    const cleaned = recipientDraft.trim();
    if (!cleaned || recipients.includes(cleaned)) {
      setRecipientDraft("");
      return;
    }
    setRecipients([...recipients, cleaned]);
    setRecipientDraft("");
  }

  function removeRecipient(r: string) {
    setRecipients(recipients.filter((x) => x !== r));
  }

  function toggleCategory(c: Category) {
    const next = new Set(pickedCategories);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setPickedCategories(next);
  }
  function toggleAccount(id: string) {
    const next = new Set(pickedAccounts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPickedAccounts(next);
  }

  function close() {
    reset();
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="New report"
      description="Schedule a snapshot delivered by email."
      footer={
        <>
          <button
            type="button"
            onClick={close}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled
            className="tap-btn rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create &amp; edit
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
          placeholder="Client X — monthly partner roundup"
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
      </label>

      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Top performing partner accounts this month"
          rows={3}
          className="w-full resize-none rounded-sm border border-line-2 bg-surface-2 px-3 py-2 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
      </label>

      <div className="mb-4">
        <span className="t-micro mb-1.5 block text-ink-3">Cadence</span>
        <div className="grid grid-cols-2 gap-1 rounded-sm border border-line-2 bg-surface-2 p-1">
          {CADENCE_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCadence(c)}
              aria-pressed={c === cadence}
              className={`tap-btn rounded-xs px-2 py-1.5 t-small font-medium transition-colors duration-[120ms] ${
                c === cadence ? "bg-bg text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {c === "weekly" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      <label className="mb-4 block">
        <span className="t-micro mb-1.5 block text-ink-3">Send on</span>
        <input
          type="text"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder={
            cadence === "weekly"
              ? "Mon · 09:00 GMT"
              : "1st of month · 08:00 GMT"
          }
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
      </label>

      <div className="mb-4">
        <span className="t-micro mb-1.5 block text-ink-3">Recipients</span>
        {recipients.length > 0 && (
          <ul className="mb-2 flex flex-col gap-1">
            {recipients.map((r) => (
              <li
                key={r}
                className="flex items-center justify-between gap-2 rounded-sm border border-line-2 bg-surface-2 px-3 py-2"
              >
                <span className="t-body truncate text-ink">{r}</span>
                <button
                  type="button"
                  onClick={() => removeRecipient(r)}
                  aria-label={`Remove ${r}`}
                  className="tap-btn t-meta shrink-0 text-ink-3 hover:text-ink"
                  style={{ fontSize: 10 }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            type="email"
            value={recipientDraft}
            onChange={(e) => setRecipientDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commitRecipient();
              }
            }}
            placeholder="name@example.com"
            className="h-10 flex-1 rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={commitRecipient}
            disabled={recipientDraft.trim().length === 0}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-3 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <ScopeControl
        scope={scope}
        pickedCategories={pickedCategories}
        pickedAccounts={pickedAccounts}
        onScopeChange={setScope}
        onToggleCategory={toggleCategory}
        onToggleAccount={toggleAccount}
        totalAccounts={placeholderAccounts.length}
      />

      <div
        className={`mb-4 rounded-md border transition-colors duration-[120ms] ${
          passwordOn
            ? "border-accent-line bg-accent-soft"
            : "border-line-2 bg-surface"
        }`}
      >
        <button
          type="button"
          onClick={() => setPasswordOn((v) => !v)}
          aria-pressed={passwordOn}
          className="tap-row flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span
              className={`block t-body font-semibold ${passwordOn ? "text-accent" : "text-ink"}`}
            >
              {passwordOn ? "Password protected" : "Require password to view"}
            </span>
            <span className="mt-0.5 block t-small text-ink-3">
              Recipients enter the password to open the shareable view.
            </span>
          </span>
          <span
            aria-hidden
            className={`relative inline-block h-6 w-10 shrink-0 rounded-full transition-colors duration-[120ms] ${
              passwordOn ? "bg-accent" : "bg-surface-3"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#0A0A0A] transition-transform duration-[120ms] ${
                passwordOn ? "translate-x-[18px]" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
        {passwordOn && (
          <div className="border-t border-line-2 px-4 py-3">
            <label className="block">
              <span className="t-micro mb-1.5 block text-ink-3">Password</span>
              <input
                type="text"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="e.g. clientx-2026"
                className="h-10 w-full rounded-sm border border-line-2 bg-bg px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
              />
            </label>
          </div>
        )}
      </div>

      <p className="mt-2 rounded-sm border border-accent-line bg-accent-soft px-3 py-2 t-small text-accent">
        Preview only. Create &amp; edit is wired up alongside the DB layer.
      </p>
    </Sheet>
  );
}
