"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "anw-theme";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

function resolveInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = resolveInitial();
    applyTheme(initial);
    // Pre-paint bootstrap (layout.tsx) already set data-theme before React
    // hydration, so this catches up component state to match. Cascading
    // re-render is intentional — disabling the rule for this single tick.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    setHydrated(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — quietly continue
    }
  }

  // Render a stable button so the header layout doesn't shift; lock the
  // visible glyph to a single state until we know the resolved theme.
  const showSun = hydrated && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        hydrated
          ? theme === "dark"
            ? "Switch to light theme"
            : "Switch to dark theme"
          : "Toggle theme"
      }
      className="tap-btn inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
    >
      {showSun ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="9" cy="9" r="3" />
      <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4 4l1.5 1.5M12.5 12.5L14 14M4 14l1.5-1.5M12.5 5.5L14 4" />
    </svg>
  );
}

function MoonIcon() {
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
      <path d="M14.5 11A6 6 0 0 1 7 3.5a6 6 0 1 0 7.5 7.5z" />
    </svg>
  );
}
