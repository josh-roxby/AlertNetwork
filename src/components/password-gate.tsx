"use client";

import { useEffect, useState } from "react";
import { ReportView } from "@/components/report-view";
import {
  type Account,
  type Report,
  type ReportHistoryEntry,
} from "@/lib/placeholder-data";

const STORAGE_PREFIX = "anw-report-unlock-";

/**
 * Client-side password gate for the shareable view. The placeholder password
 * lives in `report.password`; once entered correctly, the unlock flag is
 * stored in localStorage so subsequent visits skip the gate. Real
 * implementation will need server-side validation + an HttpOnly cookie
 * (see TODO.md).
 */
export function PasswordGate({
  report,
  accounts,
  historyEntry,
}: {
  report: Report;
  accounts: Account[];
  historyEntry?: ReportHistoryEntry;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [entered, setEntered] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(STORAGE_PREFIX + report.id)
    ) {
      setUnlocked(true);
    }
  }, [report.id]);

  if (!hydrated) {
    // Avoid SSR/CSR mismatch: render nothing until we've checked localStorage.
    return <div className="min-h-screen bg-bg" />;
  }

  if (unlocked) {
    return (
      <ReportView
        report={report}
        accounts={accounts}
        historyEntry={historyEntry}
      />
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (entered === report.password) {
      window.localStorage.setItem(STORAGE_PREFIX + report.id, "1");
      setUnlocked(true);
      setError(null);
    } else {
      setError("That password didn’t match. Check with the report owner.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-8">
      <form
        onSubmit={submit}
        className="w-full max-w-[360px] rounded-md border border-line-2 bg-surface p-5 shadow-[var(--sh-md)]"
      >
        <div
          aria-hidden
          className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"
        >
          <LockGlyph />
        </div>
        <h1
          className="text-center t-display-3 uppercase text-ink"
          style={{ fontFamily: "var(--font-unbounded)" }}
        >
          Protected report
        </h1>
        <p className="mt-2 text-center t-small text-ink-3">
          This report is password-protected. Enter the password shared with
          you to view it.
        </p>

        <div className="mt-5">
          <label className="block">
            <span className="t-micro mb-1.5 block text-ink-3">Password</span>
            <input
              type="password"
              autoFocus
              value={entered}
              onChange={(e) => {
                setEntered(e.target.value);
                if (error) setError(null);
              }}
              className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
              placeholder="Enter password"
            />
          </label>
          {error && (
            <p className="mt-1.5 t-small text-bad">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={entered.length === 0}
          className="tap-btn mt-4 w-full rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          Unlock
        </button>

        <p className="mt-3 text-center t-meta text-ink-3" style={{ fontSize: 10 }}>
          Alert Network · Shared report
        </p>
      </form>
    </div>
  );
}

function LockGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="8" width="10" height="7" rx="1.5" />
      <path d="M6 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
