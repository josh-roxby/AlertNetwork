"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMessage("");

    const supabase = supabaseBrowser();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-bg px-4">
        <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-[var(--sh-lg)]">
          <Brand />
          <div className="mt-6 space-y-2">
            <div className="t-h2 text-ink">Check your inbox</div>
            <p className="t-body text-ink-2">
              We sent a one-time sign-in link to{" "}
              <span className="text-ink">{email}</span>. Click it from this
              device to finish signing in.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setErrorMessage("");
            }}
            className="tap-btn mt-6 t-small text-ink-3 hover:text-ink"
          >
            Use a different email
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-[var(--sh-lg)]"
      >
        <Brand />
        <div className="mt-6 space-y-1">
          <div className="t-h2 text-ink">Sign in</div>
          <p className="t-small text-ink-3">
            Enter your email and we&apos;ll send you a one-time sign-in link.
          </p>
        </div>

        <label className="mt-5 block">
          <span className="t-micro mb-1.5 block text-ink-3">Email</span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={status === "sending"}
            className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
          />
        </label>

        {status === "error" && errorMessage && (
          <p className="mt-3 t-small text-bad" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "sending" || !email.trim()}
          className="tap-btn mt-5 w-full rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] transition-colors duration-[120ms] hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </button>
      </form>
    </main>
  );
}

function Brand() {
  return (
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
  );
}
