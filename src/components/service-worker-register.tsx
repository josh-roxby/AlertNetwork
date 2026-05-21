"use client";

import { useEffect } from "react";

// Registers the minimal pass-through service worker at /sw.js so
// Chrome desktop / Android will fire `beforeinstallprompt` and show
// the install affordance in the URL bar. The SW does no caching —
// see public/sw.js for the rationale.
//
// Registration runs once after first paint. We skip in development
// because the Next.js dev server doesn't serve a stable /sw.js scope
// and stale workers cause weird HMR failures.

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration failures aren't fatal — the app still works,
      // we just won't get the install prompt. Swallow silently to
      // avoid noisy console errors in unsupported environments.
    });
  }, []);

  return null;
}
