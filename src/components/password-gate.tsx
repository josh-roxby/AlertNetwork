"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Renders when a report has a password set and the visitor doesn't
// hold the unlock cookie yet. Submits to /api/reports/[id]/unlock,
// which sets a path-scoped HttpOnly cookie. We then refresh the
// route so the server-rendered ReportView takes over.

export function PasswordGate({
  reportId,
  reportName,
}: {
  reportId: string;
  reportName: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch(`/api/reports/${reportId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setStatus("error");
        setErrorMessage(body.error ?? "Could not unlock.");
        return;
      }
      // Cookie is set — re-render server-side so the gate disappears.
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Network error.",
      );
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-bg px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-[var(--sh-lg)]"
      >
        <div
          className="flex items-center gap-2 text-ink"
          style={{ fontFamily: "var(--font-unbounded)" }}
        >
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
          />
          <span className="t-h1 uppercase tracking-tight">Alert Network</span>
        </div>
        <div className="mt-6 space-y-1">
          <div className="t-h2 text-ink">Password required</div>
          <p className="t-small text-ink-3">
            <span className="text-ink-2">{reportName}</span> is password
            protected. Enter the password to view.
          </p>
        </div>
        <label className="mt-5 block">
          <span className="t-micro mb-1.5 block text-ink-3">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === "submitting"}
            required
            autoFocus
            className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
          />
        </label>
        {status === "error" && errorMessage && (
          <p
            className="mt-3 t-small text-bad"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        <button
          type="submit"
          disabled={status === "submitting" || !password.trim()}
          className="tap-btn mt-5 w-full rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "submitting" ? "Unlocking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
