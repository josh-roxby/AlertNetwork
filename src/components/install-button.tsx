"use client";

import { useEffect, useRef, useState } from "react";
import { IconDownload } from "@/components/icons";
import { Sheet } from "@/components/sheet";

// "Add to Home Screen" install affordance. Renders a circular button
// in the top-right nav on both mobile and desktop shells whenever
// the app isn't already running standalone.
//
// Previous version waited for `beforeinstallprompt` to fire before
// showing anything — which meant on Chrome desktop the button often
// never appeared (Chrome only fires that event after its engagement
// heuristics are satisfied: a few visits, some interaction, ~30s on
// page). Now the button is always visible to non-standalone users,
// and the click handler picks the best install path it can:
//
//   1. If `beforeinstallprompt` has fired by click time → use the
//      native prompt directly.
//   2. iOS Safari → show the Share → Add to Home Screen sheet.
//   3. Anything else → show a generic "look in your browser menu"
//      sheet so the user still gets clear next steps.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Display =
  | { kind: "loading" }
  | { kind: "standalone" } // already installed → hide
  | { kind: "visible" };

type Modal = "none" | "ios" | "generic";

export function InstallButton({ className }: { className?: string }) {
  const [display, setDisplay] = useState<Display>({ kind: "loading" });
  const [modal, setModal] = useState<Modal>("none");
  // The native prompt event is ephemeral — Chrome only fires it
  // once per page lifetime. Keep it in a ref so we don't lose it on
  // re-renders.
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isStandalone()) {
      setDisplay({ kind: "standalone" });
      return;
    }
    setDisplay({ kind: "visible" });

    function onBeforeInstall(e: Event) {
      // Prevent Chrome's default mini-info bar — we'll surface the
      // prompt via our own button instead.
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
    }

    function onInstalled() {
      promptRef.current = null;
      setDisplay({ kind: "standalone" });
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleClick() {
    const native = promptRef.current;
    if (native) {
      await native.prompt();
      const choice = await native.userChoice;
      promptRef.current = null;
      if (choice.outcome === "accepted") {
        setDisplay({ kind: "standalone" });
      }
      return;
    }

    // No native prompt available. Show platform-appropriate fallback.
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isiOSSafari =
      /iP(hone|ad|od)/i.test(ua) &&
      /Safari/i.test(ua) &&
      !/CriOS|FxiOS|EdgiOS/i.test(ua);
    setModal(isiOSSafari ? "ios" : "generic");
  }

  if (display.kind !== "visible") return null;

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
        open={modal === "ios"}
        onClose={() => setModal("none")}
        title="Install on iOS"
        description="Save Alert Network to your Home Screen so it launches as a standalone app."
        footer={
          <button
            type="button"
            onClick={() => setModal("none")}
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

      <Sheet
        open={modal === "generic"}
        onClose={() => setModal("none")}
        title="Install Alert Network"
        description="Save the app to your device so it launches without the browser chrome."
        footer={
          <button
            type="button"
            onClick={() => setModal("none")}
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
                Open your browser&rsquo;s <span className="font-semibold text-ink">menu</span>{" "}
                (usually the ⋮ icon in the top-right).
              </>
            }
          />
          <Step
            n={2}
            body={
              <>
                Look for <span className="font-semibold text-ink">Install app</span>,{" "}
                <span className="font-semibold text-ink">Add to Home Screen</span>, or{" "}
                <span className="font-semibold text-ink">Save to dock</span>.
              </>
            }
          />
          <Step
            n={3}
            body={
              <>
                If you don&rsquo;t see those options, try{" "}
                <span className="font-semibold text-ink">Chrome</span>,{" "}
                <span className="font-semibold text-ink">Edge</span>, or iOS{" "}
                <span className="font-semibold text-ink">Safari</span> — those are
                the browsers with full install support.
              </>
            }
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
