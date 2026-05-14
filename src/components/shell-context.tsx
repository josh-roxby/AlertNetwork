"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type SheetState =
  | null
  | { kind: "addAccount" }
  | { kind: "newReport" }
  | { kind: "manageTeam" }
  | { kind: "categories" }
  | { kind: "tags" }
  | { kind: "editAccount"; accountId: string };

type ShellContextValue = {
  drawerOpen: boolean;
  sheet: SheetState;
  openDrawer: () => void;
  closeDrawer: () => void;
  openSheet: (s: SheetState) => void;
  closeSheet: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openSheet = useCallback((s: SheetState) => setSheet(s), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const value = useMemo<ShellContextValue>(
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
