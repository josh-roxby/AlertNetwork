"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { CATEGORIES } from "@/lib/placeholder-data";

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-[14px] font-semibold text-[#0A0A0A] hover:bg-accent-dim active:scale-[0.97]"
    >
      <span aria-hidden>+</span>
      {children}
    </button>
  );
}

function Field({
  label,
  placeholder,
  hint,
  multiline = false,
  type = "text",
}: {
  label: string;
  placeholder: string;
  hint?: string;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className="mb-4 block">
      <span className="t-micro mb-1.5 block text-ink-3">{label}</span>
      {multiline ? (
        <textarea
          disabled
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-sm border border-line-2 bg-surface-2 px-3 py-2 text-[14px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-70"
        />
      ) : (
        <input
          disabled
          type={type}
          placeholder={placeholder}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 text-[14px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-70"
        />
      )}
      {hint && <span className="mt-1 block t-small text-ink-3">{hint}</span>}
    </label>
  );
}

function Footer({
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
        className="rounded-sm px-3 py-2 text-[13px] text-ink-2 hover:bg-surface-3 hover:text-ink"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled
        className="rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-50"
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

export function AddAccountAction() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PrimaryButton onClick={() => setOpen(true)}>Add account</PrimaryButton>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add account"
        description="Paste a TikTok URL — platform and handle are detected automatically."
        footer={<Footer onClose={() => setOpen(false)} cta="Add to project" />}
      >
        <Field
          label="Profile URL"
          type="url"
          placeholder="https://www.tiktok.com/@northlight"
        />
        <label className="mb-4 block">
          <span className="t-micro mb-1.5 block text-ink-3">Tier</span>
          <select
            disabled
            className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 text-[14px] text-ink disabled:opacity-70"
            defaultValue="daily"
          >
            <option value="daily">Daily — logged at 08:00 GMT</option>
            <option value="weekly">Weekly — logged on chosen weekday</option>
          </select>
        </label>
        <label className="mb-4 block">
          <span className="t-micro mb-1.5 block text-ink-3">Category</span>
          <select
            disabled
            className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 text-[14px] text-ink disabled:opacity-70"
            defaultValue=""
          >
            <option value="">Pick a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <PreviewNote />
      </Sheet>
    </>
  );
}

export function NewProjectAction() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PrimaryButton onClick={() => setOpen(true)}>New project</PrimaryButton>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="New project"
        description="Projects are workspaces. Every account, tag and report lives inside a project."
        footer={<Footer onClose={() => setOpen(false)} cta="Create project" />}
      >
        <Field label="Name" placeholder="Spring Music Sponsorships" />
        <Field
          label="Description"
          placeholder="UK-focused indie music creators, 50–200k follower band."
          multiline
        />
        <PreviewNote />
      </Sheet>
    </>
  );
}

export function NewReportAction() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PrimaryButton onClick={() => setOpen(true)}>New report</PrimaryButton>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="New report"
        description="Configurable snapshot delivered by email. One-off or scheduled."
        footer={<Footer onClose={() => setOpen(false)} cta="Schedule report" />}
      >
        <Field label="Name" placeholder="Client X — monthly partner roundup" />
        <label className="mb-4 block">
          <span className="t-micro mb-1.5 block text-ink-3">Scope</span>
          <select
            disabled
            className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 text-[14px] text-ink disabled:opacity-70"
            defaultValue="project"
          >
            <option value="project">Whole project</option>
            <option value="tag">By tag</option>
            <option value="account">Single account</option>
          </select>
        </label>
        <label className="mb-4 block">
          <span className="t-micro mb-1.5 block text-ink-3">Cadence</span>
          <select
            disabled
            className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 text-[14px] text-ink disabled:opacity-70"
            defaultValue="monthly"
          >
            <option value="one-off">One-off</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <Field
          label="Recipients"
          placeholder="client@example.com, lead@example.com"
          hint="Comma-separated. Recipients can differ from project members."
        />
        <PreviewNote />
      </Sheet>
    </>
  );
}
