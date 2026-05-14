"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { placeholderProjects } from "@/lib/placeholder-data";

export type SheetState =
  | null
  | { kind: "addAccount" }
  | { kind: "newReport" }
  | { kind: "newProject" }
  | { kind: "manageTeam" }
  | { kind: "categories" }
  | { kind: "tags" }
  | { kind: "editAccount"; accountId: string };

const ACTIVE_PROJECT_KEY = "anw-active-project";
const DEFAULT_PROJECT_ID = placeholderProjects[0]?.id ?? "";

type ShellContextValue = {
  drawerOpen: boolean;
  sheet: SheetState;
  activeProjectId: string;
  openDrawer: () => void;
  closeDrawer: () => void;
  openSheet: (s: SheetState) => void;
  closeSheet: () => void;
  setActiveProjectId: (id: string) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [activeProjectId, setActiveProjectIdState] =
    useState<string>(DEFAULT_PROJECT_ID);

  // Sync the active project from localStorage once after mount. Default
  // (DEFAULT_PROJECT_ID) renders on SSR so layout doesn't shift; localStorage
  // value overrides if present + valid.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (
      stored &&
      placeholderProjects.some((p) => p.id === stored) &&
      stored !== activeProjectId
    ) {
      setActiveProjectIdState(stored);
    }
    // Only run on mount — subsequent setActiveProjectId calls handle the write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setActiveProjectId = useCallback((id: string) => {
    setActiveProjectIdState(id);
    try {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    } catch {
      // localStorage unavailable — quietly continue
    }
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openSheet = useCallback((s: SheetState) => setSheet(s), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const value = useMemo<ShellContextValue>(
    () => ({
      drawerOpen,
      sheet,
      activeProjectId,
      openDrawer,
      closeDrawer,
      openSheet,
      closeSheet,
      setActiveProjectId,
    }),
    [
      drawerOpen,
      sheet,
      activeProjectId,
      openDrawer,
      closeDrawer,
      openSheet,
      closeSheet,
      setActiveProjectId,
    ],
  );

  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <ShellProvider>");
  return ctx;
}

export function useActiveProject() {
  const { activeProjectId } = useShell();
  return (
    placeholderProjects.find((p) => p.id === activeProjectId) ??
    placeholderProjects[0] ??
    null
  );
}
