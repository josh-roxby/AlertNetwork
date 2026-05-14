"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { listProjects } from "@/lib/data/projects";
import { listCategories } from "@/lib/data/categories";
import { listAccounts } from "@/lib/data/accounts";
import type { AccountView, CategoryRow, ProjectRow } from "@/lib/data/types";

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

type ShellContextValue = {
  drawerOpen: boolean;
  sheet: SheetState;
  activeProjectId: string | null;
  projects: ProjectRow[];
  projectsLoading: boolean;
  categories: CategoryRow[];
  categoriesLoading: boolean;
  accounts: AccountView[];
  accountsLoading: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  openSheet: (s: SheetState) => void;
  closeSheet: () => void;
  setActiveProjectId: (id: string) => void;
  refreshProjects: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountView[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    null,
  );

  const loadProjects = useCallback(async () => {
    try {
      const rows = await listProjects();
      setProjects(rows);
      return rows;
    } catch {
      // Unauthenticated or env not set yet — leave empty.
      setProjects([]);
      return [] as ProjectRow[];
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  // Bootstrap: fetch projects, pick active from localStorage if valid,
  // otherwise default to the first project. Re-runs on auth changes
  // (sign-in / sign-out) so a fresh login sees their own projects.
  useEffect(() => {
    let cancelled = false;

    async function syncFromAuth() {
      const rows = await loadProjects();
      if (cancelled) return;

      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(ACTIVE_PROJECT_KEY)
          : null;
      const validStored = rows.find((p) => p.id === stored);
      const next = validStored?.id ?? rows[0]?.id ?? null;
      setActiveProjectIdState(next);
    }

    syncFromAuth();

    const supabase = supabaseBrowser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      syncFromAuth();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProjects]);

  const setActiveProjectId = useCallback((id: string) => {
    setActiveProjectIdState(id);
    try {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    } catch {
      // localStorage unavailable — quietly continue
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    const rows = await loadProjects();
    if (!activeProjectId && rows[0]) {
      setActiveProjectId(rows[0].id);
    }
  }, [loadProjects, activeProjectId, setActiveProjectId]);

  const loadCategories = useCallback(async (projectId: string | null) => {
    if (!projectId) {
      setCategories([]);
      setCategoriesLoading(false);
      return;
    }
    setCategoriesLoading(true);
    try {
      const rows = await listCategories(projectId);
      setCategories(rows);
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    await loadCategories(activeProjectId);
  }, [loadCategories, activeProjectId]);

  const loadAccounts = useCallback(async (projectId: string | null) => {
    if (!projectId) {
      setAccounts([]);
      setAccountsLoading(false);
      return;
    }
    setAccountsLoading(true);
    try {
      const rows = await listAccounts(projectId);
      setAccounts(rows);
    } catch {
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    await loadAccounts(activeProjectId);
  }, [loadAccounts, activeProjectId]);

  // Reload categories + accounts whenever the active project changes.
  // Both helpers set state internally; the cascading setState is
  // intentional (data fetched in response to an external change).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadCategories(activeProjectId);
    loadAccounts(activeProjectId);
  }, [activeProjectId, loadCategories, loadAccounts]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openSheet = useCallback((s: SheetState) => setSheet(s), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const value = useMemo<ShellContextValue>(
    () => ({
      drawerOpen,
      sheet,
      activeProjectId,
      projects,
      projectsLoading,
      categories,
      categoriesLoading,
      accounts,
      accountsLoading,
      openDrawer,
      closeDrawer,
      openSheet,
      closeSheet,
      setActiveProjectId,
      refreshProjects,
      refreshCategories,
      refreshAccounts,
    }),
    [
      drawerOpen,
      sheet,
      activeProjectId,
      projects,
      projectsLoading,
      categories,
      categoriesLoading,
      accounts,
      accountsLoading,
      openDrawer,
      closeDrawer,
      openSheet,
      closeSheet,
      setActiveProjectId,
      refreshProjects,
      refreshCategories,
      refreshAccounts,
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
  const { activeProjectId, projects } = useShell();
  return projects.find((p) => p.id === activeProjectId) ?? null;
}
