"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type FabKind = "drawer" | "addAccount" | "newReport" | "manageTeam";
export type SheetKind = "addAccount" | "newReport" | "manageTeam";

type ShellState = {
  drawerOpen: boolean;
  sheet: SheetKind | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  openSheet: (k: SheetKind) => void;
  closeSheet: () => void;
};

const ShellContext = createContext<ShellState | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetKind | null>(null);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openSheet = useCallback((k: SheetKind) => setSheet(k), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const value = useMemo<ShellState>(
    () => ({
      drawerOpen,
      sheet,
      openDrawer,
      closeDrawer,
      openSheet,
      closeSheet,
    }),
    [drawerOpen, sheet, openDrawer, closeDrawer, openSheet, closeSheet],
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
