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
import { listTags } from "@/lib/data/tags";
import { listReports } from "@/lib/data/reports";
import { listPostsForProject } from "@/lib/data/posts";
import {
  isSuperAdmin as fetchIsSuperAdmin,
  roleForProject,
  type ProjectRoleForUser,
} from "@/lib/data/members";
import type {
  AccountView,
  CategoryRow,
  PostRow,
  ProjectRow,
  ReportRow,
  TagRow,
} from "@/lib/data/types";

export type SheetState =
  | null
  | { kind: "addAccount" }
  | { kind: "newReport" }
  | { kind: "newProject" }
  | { kind: "manageTeam" }
  | { kind: "categories" }
  | { kind: "tags" }
  | { kind: "editAccount"; accountId: string }
  | { kind: "manageReport"; reportId: string }
  | { kind: "manageProject" };

const ACTIVE_PROJECT_KEY = "anw-active-project";

type ShellContextValue = {
  drawerOpen: boolean;
  sheet: SheetState;
  activeProjectId: string | null;
  projects: ProjectRow[];
  projectsLoading: boolean;
  categories: CategoryRow[];
  categoriesLoading: boolean;
  tags: TagRow[];
  tagsLoading: boolean;
  accounts: AccountView[];
  accountsLoading: boolean;
  reports: ReportRow[];
  reportsLoading: boolean;
  posts: PostRow[];
  postsLoading: boolean;
  postsByAccount: Map<string, PostRow[]>;
  // Caller's role on the active project. Used everywhere we render
  // create / edit affordances — null means we're still resolving or
  // not signed in; "viewer" means the UI should hide mutating
  // controls; "owner" gets everything.
  currentRole: ProjectRoleForUser;
  isOwner: boolean;
  // True when the caller can mutate project contents — owner OR
  // manager. Gates add-account, edit-account, rescan, new-report,
  // category/tag edits, etc. Owner-only actions (invite members,
  // generate-now, send-test, change password, health config) keep
  // checking `isOwner`.
  canManage: boolean;
  // True when the caller appears in `super_admins`. Drives the "New
  // project" affordance — only super-admins can create projects.
  isSuperAdmin: boolean;
  // True until the first projects + isSuperAdmin sync after mount
  // completes. Pages use this to hold a unified skeleton instead of
  // flashing between empty-state and content as each query resolves.
  bootstrapping: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  openSheet: (s: SheetState) => void;
  closeSheet: () => void;
  setActiveProjectId: (id: string) => void;
  refreshProjects: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshTags: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  refreshReports: () => Promise<void>;
  refreshPosts: () => Promise<void>;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountView[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    null,
  );
  const [currentRole, setCurrentRole] = useState<ProjectRoleForUser>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);

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
      const [rows, sa] = await Promise.all([
        loadProjects(),
        fetchIsSuperAdmin().catch(() => false),
      ]);
      if (cancelled) return;

      setIsSuperAdmin(sa);

      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(ACTIVE_PROJECT_KEY)
          : null;
      const validStored = rows.find((p) => p.id === stored);
      const next = validStored?.id ?? rows[0]?.id ?? null;
      setActiveProjectIdState(next);

      // First-sync gate. Pages hold a unified skeleton while this is
      // true; flipping it off here means we never flash between
      // "empty state" and "real data" — only one transition from
      // skeleton → content.
      setBootstrapping(false);
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
    // Refresh BOTH projects and super-admin status — the dashboard
    // diagnostic "Refresh data" button calls this, and a stuck user
    // most likely needs both to re-resolve to recover.
    const [rows, sa] = await Promise.all([
      loadProjects(),
      fetchIsSuperAdmin().catch(() => false),
    ]);
    setIsSuperAdmin(sa);
    if (!activeProjectId && rows[0]) {
      setActiveProjectId(rows[0].id);
    }
  }, [loadProjects, activeProjectId, setActiveProjectId]);

  // Per-project loaders share the same shape: when `silent` is true
  // they keep the previous state visible while re-fetching, so a
  // post-write refresh doesn't flash the skeleton. `silent` is `false`
  // for project switches (data is genuinely stale) and the initial
  // mount, and `true` for explicit refresh calls.

  const loadCategories = useCallback(
    async (projectId: string | null, opts: { silent?: boolean } = {}) => {
      if (!projectId) {
        setCategories([]);
        setCategoriesLoading(false);
        return;
      }
      if (!opts.silent) setCategoriesLoading(true);
      try {
        const rows = await listCategories(projectId);
        setCategories(rows);
      } catch {
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    },
    [],
  );

  const refreshCategories = useCallback(async () => {
    await loadCategories(activeProjectId, { silent: true });
  }, [loadCategories, activeProjectId]);

  const loadTags = useCallback(
    async (projectId: string | null, opts: { silent?: boolean } = {}) => {
      if (!projectId) {
        setTags([]);
        setTagsLoading(false);
        return;
      }
      if (!opts.silent) setTagsLoading(true);
      try {
        const rows = await listTags(projectId);
        setTags(rows);
      } catch {
        setTags([]);
      } finally {
        setTagsLoading(false);
      }
    },
    [],
  );

  const refreshTags = useCallback(async () => {
    await loadTags(activeProjectId, { silent: true });
  }, [loadTags, activeProjectId]);

  const loadAccounts = useCallback(
    async (projectId: string | null, opts: { silent?: boolean } = {}) => {
      if (!projectId) {
        setAccounts([]);
        setAccountsLoading(false);
        return;
      }
      if (!opts.silent) setAccountsLoading(true);
      try {
        const rows = await listAccounts(projectId);
        setAccounts(rows);
      } catch {
        setAccounts([]);
      } finally {
        setAccountsLoading(false);
      }
    },
    [],
  );

  const refreshAccounts = useCallback(async () => {
    await loadAccounts(activeProjectId, { silent: true });
  }, [loadAccounts, activeProjectId]);

  const loadReports = useCallback(
    async (projectId: string | null, opts: { silent?: boolean } = {}) => {
      if (!projectId) {
        setReports([]);
        setReportsLoading(false);
        return;
      }
      if (!opts.silent) setReportsLoading(true);
      try {
        const rows = await listReports(projectId);
        setReports(rows);
      } catch {
        setReports([]);
      } finally {
        setReportsLoading(false);
      }
    },
    [],
  );

  const refreshReports = useCallback(async () => {
    await loadReports(activeProjectId, { silent: true });
  }, [loadReports, activeProjectId]);

  const loadPosts = useCallback(
    async (projectId: string | null, opts: { silent?: boolean } = {}) => {
      if (!projectId) {
        setPosts([]);
        setPostsLoading(false);
        return;
      }
      if (!opts.silent) setPostsLoading(true);
      try {
        // 30-day window keeps the payload bounded — health is
        // computed on this slice in `lib/data/health.ts`.
        const rows = await listPostsForProject(projectId, {
          sinceHours: 24 * 30,
        });
        setPosts(rows);
      } catch {
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    },
    [],
  );

  const refreshPosts = useCallback(async () => {
    await loadPosts(activeProjectId, { silent: true });
  }, [loadPosts, activeProjectId]);

  // Reload per-project data whenever the active project changes. Not
  // silent — the project switch genuinely invalidates the existing
  // lists, so users should see a skeleton during the fetch.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadCategories(activeProjectId);
    loadTags(activeProjectId);
    loadAccounts(activeProjectId);
    loadReports(activeProjectId);
    loadPosts(activeProjectId);
  }, [
    activeProjectId,
    loadCategories,
    loadTags,
    loadAccounts,
    loadReports,
    loadPosts,
  ]);

  // Resolve the caller's role on the active project. Re-runs on
  // project switch + auth-state change so a fresh sign-in or invite
  // acceptance immediately unlocks the UI affordances we gate on it.
  useEffect(() => {
    let cancelled = false;
    if (!activeProjectId) {
      setCurrentRole(null);
      return;
    }
    (async () => {
      const role = await roleForProject(activeProjectId);
      if (!cancelled) setCurrentRole(role);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Bucket posts by account once per render so consumers don't have
  // to redo the grouping on every memo recompute. Cheap for the
  // volumes we care about (~3000 rows max).
  const postsByAccount = useMemo(() => {
    const map = new Map<string, PostRow[]>();
    for (const p of posts) {
      const arr = map.get(p.account_id);
      if (arr) arr.push(p);
      else map.set(p.account_id, [p]);
    }
    return map;
  }, [posts]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openSheet = useCallback((s: SheetState) => setSheet(s), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const isOwner = currentRole === "owner";
  const canManage = currentRole === "owner" || currentRole === "manager";

  const value = useMemo<ShellContextValue>(
    () => ({
      drawerOpen,
      sheet,
      activeProjectId,
      projects,
      projectsLoading,
      categories,
      categoriesLoading,
      tags,
      tagsLoading,
      accounts,
      accountsLoading,
      reports,
      reportsLoading,
      posts,
      postsLoading,
      postsByAccount,
      currentRole,
      isOwner,
      canManage,
      isSuperAdmin,
      bootstrapping,
      openDrawer,
      closeDrawer,
      openSheet,
      closeSheet,
      setActiveProjectId,
      refreshProjects,
      refreshCategories,
      refreshTags,
      refreshAccounts,
      refreshReports,
      refreshPosts,
    }),
    [
      drawerOpen,
      sheet,
      activeProjectId,
      projects,
      projectsLoading,
      categories,
      categoriesLoading,
      tags,
      tagsLoading,
      accounts,
      accountsLoading,
      reports,
      reportsLoading,
      posts,
      postsLoading,
      postsByAccount,
      currentRole,
      isOwner,
      canManage,
      isSuperAdmin,
      bootstrapping,
      openDrawer,
      closeDrawer,
      openSheet,
      closeSheet,
      setActiveProjectId,
      refreshProjects,
      refreshCategories,
      refreshTags,
      refreshAccounts,
      refreshReports,
      refreshPosts,
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
