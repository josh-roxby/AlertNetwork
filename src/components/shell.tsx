"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { FloatNav } from "@/components/float-nav";
import { Fab, DesktopFab } from "@/components/fab";
import { Drawer } from "@/components/drawer";
import { DesktopShell } from "@/components/desktop-shell";
import {
  ShellProvider,
  useActiveProject,
  useShell,
} from "@/components/shell-context";
import { AddAccountSheet, TeamSheet } from "@/components/sheets";
import { NewReportSheet } from "@/components/sheets/new-report-sheet";
import { CategoriesSheet } from "@/components/sheets/categories-sheet";
import { TagsSheet } from "@/components/sheets/tags-sheet";
import { EditAccountSheet } from "@/components/sheets/edit-account-sheet";
import { NewProjectSheet } from "@/components/sheets/new-project-sheet";
import { findReport } from "@/lib/placeholder-data";
import type { AccountView } from "@/lib/data/types";

function headerFor(
  pathname: string,
  activeProjectName: string,
  accounts: AccountView[],
) {
  if (pathname === "/" || pathname.startsWith("/dashboard")) {
    return {
      eyebrow: "Project",
      title: activeProjectName,
    };
  }
  if (pathname.startsWith("/projects")) return { title: "Projects" };
  if (pathname.startsWith("/accounts/")) {
    const id = pathname.split("/")[2];
    const account = id ? accounts.find((a) => a.id === id) : null;
    return {
      eyebrow: "Accounts",
      title: account?.handle ?? "Account",
      backHref: "/accounts",
    };
  }
  if (pathname.startsWith("/accounts")) return { title: "Accounts" };
  if (pathname.startsWith("/reports/")) {
    // Reports still read from placeholder data — wired in M-3b.2.
    const id = pathname.split("/")[2];
    const report = id ? findReport(id) : null;
    return {
      eyebrow: "Reports",
      title: report?.name ?? "Report",
      backHref: "/reports",
    };
  }
  if (pathname.startsWith("/reports")) return { title: "Reports" };
  if (pathname.startsWith("/settings")) return { title: "Settings" };
  return { title: "Alert Network" };
}

// Routes that render bare — no shell frame, no header, no nav, no FAB.
// Used for shareable views that need to look standalone (and print clean),
// and for the unauthenticated /login route.
const VIEW_ONLY = /^\/reports\/[^/]+\/view(\/|$)/;
const SHELL_BYPASS = /^\/login(\/|$)/;
const PROJECTS_ROUTE = /^\/projects(\/|$)/;

function FrameInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { sheet, closeSheet, accounts, projects, projectsLoading } = useShell();
  const activeProject = useActiveProject();

  const onBareRoute =
    VIEW_ONLY.test(pathname) || SHELL_BYPASS.test(pathname);
  // First-run / signed-out state: no projects yet means the only place
  // the user should be is /projects. Every other surface is hidden so
  // the dead nav doesn't confuse them.
  const noProjects = !projectsLoading && projects.length === 0;
  const onProjectsRoute = PROJECTS_ROUTE.test(pathname);

  useEffect(() => {
    if (onBareRoute) return;
    if (!noProjects) return;
    if (onProjectsRoute) return;
    router.replace("/projects");
  }, [noProjects, onProjectsRoute, onBareRoute, router]);

  if (onBareRoute) {
    return <>{children}</>;
  }

  const head = headerFor(
    pathname,
    activeProject?.name ?? "Workspace",
    accounts,
  );

  return (
    <>
      {/* Desktop layout — sidebar + top bar at lg+; otherwise hidden. */}
      <DesktopShell
        pageTitle={head.title}
        pageEyebrow={head.eyebrow}
        hideNav={noProjects}
      >
        {children}
      </DesktopShell>

      {/* Mobile frame — hidden at lg+; visible below. Below md it stays
          capped at 480px (phone shell). From md to lg the frame fills the
          viewport so iPads aren't trapped in a narrow column; inner content
          stays capped for readability. */}
      <div
        className="relative mx-auto w-full max-w-[480px] overflow-hidden border-x border-line bg-bg md:max-w-none md:border-x-0 lg:hidden"
        style={{ height: "100dvh" }}
      >
        <Header
          eyebrow={head.eyebrow}
          title={head.title}
          backHref={head.backHref}
        />

        <main
          className="absolute inset-x-0 overflow-y-auto"
          style={{ top: 52, bottom: 0, paddingBottom: noProjects ? 20 : 92 }}
        >
          <div className="mx-auto w-full max-w-3xl px-4 pb-3 pt-4 md:px-6">
            {children}
          </div>
        </main>

        {/* Lower nav + FAB are gated on having at least one project so a
            fresh user can't get lost in dead links. */}
        {!noProjects && <FloatNav />}
        {!noProjects && <Fab />}
        <Drawer />
      </div>

      {/* Desktop FAB — only visible at lg+, fixed to viewport corner. */}
      {!noProjects && <DesktopFab />}

      <AddAccountSheet
        open={sheet?.kind === "addAccount"}
        onClose={closeSheet}
      />
      <NewReportSheet
        open={sheet?.kind === "newReport"}
        onClose={closeSheet}
      />
      <NewProjectSheet
        open={sheet?.kind === "newProject"}
        onClose={closeSheet}
      />
      <TeamSheet
        open={sheet?.kind === "manageTeam"}
        onClose={closeSheet}
      />
      <CategoriesSheet
        open={sheet?.kind === "categories"}
        onClose={closeSheet}
      />
      <TagsSheet open={sheet?.kind === "tags"} onClose={closeSheet} />
      <EditAccountSheet
        accountId={sheet?.kind === "editAccount" ? sheet.accountId : null}
        onClose={closeSheet}
      />
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <FrameInner>{children}</FrameInner>
    </ShellProvider>
  );
}
