"use client";

import { useEffect } from "react";

// Scrolls the scroll-area to the element matching `window.location.hash`
// on mount. The shell uses an internal scroll container (not the window),
// so browser hash-anchor scrolling doesn't fire automatically. The 260ms
// delay matches the spec — let the page render before we animate.
export function AnchorScroller() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const timer = window.setTimeout(() => {
      const el = document.getElementById(hash);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 260);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
