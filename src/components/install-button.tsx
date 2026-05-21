"use client";

import { useEffect, useRef, useState } from "react";
import { IconDownload } from "@/components/icons";
import { Sheet } from "@/components/sheet";

// "Add to Home Screen" install affordance. Renders a circular button
// in the top-right nav on both mobile and desktop shells when the
// app isn't already running standalone.
//
// Three browser paths:
//
//   1. Chrome / Edge / Android — fire `beforeinstallprompt` once the
//      site meets PWA criteria. We capture it, hold onto it, and
//      call .prompt() when the user clicks. Once accepted (or
//      dismissed) the event won't fire again on that profile —
//      we treat dismissal as "user said no" and hide the button.
//
//   2. iOS Safari — never fires beforeinstallprompt. Users have to
//      do Share → Add to Home Screen by hand. We detect iOS Safari
//      via UA, show the button, and on click open a Sheet with
//      illustrated steps.
//
//   3. Already installed / running as PWA — we read
//      window.matchMedia('(display-mode: standalone)') AND
//      navigator.standalone (iOS legacy). Hide the button in
//      either case so installed users don't see it.
//
// State is intentionally local — no Context needed; the button
// renders the same in both shells.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState =
  | { kind: "loading" }
  | { kind: "hidden" } // already installed OR no install path
  | { kind: "native"; prompt: BeforeInstallPromptEvent }
  | { kind: "ios" };

export function InstallButton({ className }: { className?: string }) {
  const [state, setState] = useState<InstallState>({ kind: "loading" });
  const [iosOpen, setIosOpen] = useState(false);
  // Keep a ref too — React's setState is async and the event handler
  // fires once; we want to be able to call .prompt() in a separate
  // user-gesture handler later.
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already standalone? Hide and bail — no listeners.
    if (isStandalone()) {
      setState({ kind: "hidden" });
      return;
    }

    function onBeforeInstall(e: Event) {
      // Prevent Chrome's mini-info bar; we'll surface the prompt
      // ourselves via the button.
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      promptRef.current = evt;
      setState({ kind: "native", prompt: evt });
    }

    function onInstalled() {
      // Fired after the user accepts the install. Drop the prompt
      // and hide the button — the next launch will be standalone.
      promptRef.current = null;
      setState({ kind: "hidden" });
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari never fires beforeinstallprompt — detect it via UA
    // and surface the manual-instructions fallback. If we're not on
    // iOS Safari and the prompt event hasn't fired by next tick, we
    // hide the button entirely (older Firefox / browsers without
    // PWA support).
    const isiOSSafari = /iP(hone|ad|od)/i.test(navigator.userAgent) &&
      /Safari/i.test(navigator.userAgent) &&
      !/CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);

    if (isiOSSafari) {
      // Settle to "ios" path only if we don't already have a native
      // prompt (mostly hypothetical — iOS doesn't fire one).
      setTimeout(() => {
        setState((curr) => (curr.kind === "native" ? curr : { kind: "ios" }));
      }, 50);
    } else {
      // Other non-Chrome browsers: give beforeinstallprompt a
      // generous window to fire after page load. If it hasn't
      // arrived by then, the browser doesn't support install →
      // hide.
      const t = setTimeout(() => {
        setState((curr) => (curr.kind === "loading" ? { kind: "hidden" } : curr));
      }, 2000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleClick() {
    if (state.kind === "native") {
      const evt = promptRef.current;
      if (!evt) return;
      await evt.prompt();
      const choice = await evt.userChoice;
      // Either way, the event can only be used once. Hide the button.
      promptRef.current = null;
      setState({ kind: choice.outcome === "accepted" ? "hidden" : "hidden" });
    } else if (state.kind === "ios") {
      setIosOpen(true);
    }
  }

  if (state.kind === "loading" || state.kind === "hidden") return null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install Alert Network"
        title="Install Alert Network"
        className={`tap-btn inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-2 bg-surface text-ink-2 transition-colors duration-[120ms] hover:border-ink-3 hover:bg-surface-2 hover:text-ink ${className ?? ""}`}
      >
        <IconDownload />
      </button>

      <Sheet
        open={iosOpen}
        onClose={() => setIosOpen(false)}
        title="Install on iOS"
        description="Save Alert Network to your Home Screen so it launches as a standalone app."
        footer={
          <button
            type="button"
            onClick={() => setIosOpen(false)}
            className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Got it
          </button>
        }
      >
        <ol className="flex flex-col gap-3 text-ink-2">
          <Step
            n={1}
            body={
              <>
                Open this page in <span className="font-semibold text-ink">Safari</span>
                {" "}(not Chrome or another browser).
              </>
            }
          />
          <Step
            n={2}
            body={
              <>
                Tap the <span className="font-semibold text-ink">Share</span> button —
                the square with an up-arrow in the toolbar.
              </>
            }
          />
          <Step
            n={3}
            body={
              <>
                Scroll the share sheet and tap{" "}
                <span className="font-semibold text-ink">Add to Home Screen</span>.
              </>
            }
          />
          <Step
            n={4}
            body="Tap Add. The app appears on your Home Screen and launches standalone."
          />
        </ol>
      </Sheet>
    </>
  );
}

function Step({ n, body }: { n: number; body: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[#0A0A0A]"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {n}
      </span>
      <span className="t-body leading-snug">{body}</span>
    </li>
  );
}

// True when the page is currently launched as an installed PWA.
// Two probes: modern matchMedia + the iOS-specific navigator.standalone
// legacy boolean (Safari never picks up display-mode: standalone, so
// without this iOS PWA users would still see the install button).
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches
  ) {
    return true;
  }
  type WithStandalone = Navigator & { standalone?: boolean };
  const nav = window.navigator as WithStandalone;
  if (nav.standalone === true) return true;
  return false;
}
