"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { FloatNav } from "@/components/float-nav";
import { Fab } from "@/components/fab";
import { Drawer } from "@/components/drawer";
import { ShellProvider, useShell } from "@/components/shell-context";
import {
  AddAccountSheet,
  NewReportSheet,
  TeamSheet,
} from "@/components/sheets";
import {
  findAccount,
  findReport,
  placeholderProjects,
} from "@/lib/placeholder-data";

function headerFor(pathname: string) {
  if (pathname === "/" || pathname.startsWith("/dashboard")) {
    const project = placeholderProjects[0];
    return {
      eyebrow: "Project",
      title: project?.name ?? "Workspace",
    };
  }
  if (pathname.startsWith("/accounts/")) {
    const id = pathname.split("/")[2];
    const account = id ? findAccount(id) : null;
    return {
      eyebrow: "Accounts",
      title: account?.handle ?? "Account",
      backHref: "/accounts",
    };
  }
  if (pathname.startsWith("/accounts")) return { title: "Accounts" };
  if (pathname.startsWith("/reports/")) {
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
// Used for shareable views that need to look standalone (and print clean).
const VIEW_ONLY = /^\/reports\/[^/]+\/view(\/|$)/;

function FrameInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sheet, closeSheet } = useShell();

  if (VIEW_ONLY.test(pathname)) {
    return <>{children}</>;
  }

  const head = headerFor(pathname);

  return (
    <div
      className="relative mx-auto w-full max-w-[480px] overflow-hidden border-x border-line bg-bg lg:max-w-[640px]"
      style={{ height: "100dvh" }}
    >
      <Header
        eyebrow={head.eyebrow}
        title={head.title}
        backHref={head.backHref}
      />

      <main
        className="absolute inset-x-0 overflow-y-auto"
        style={{ top: 52, bottom: 0, paddingBottom: 92 }}
      >
        <div className="px-4 pb-3 pt-4">{children}</div>
      </main>

      <FloatNav />
      <Fab />
      <Drawer />

      <AddAccountSheet
        open={sheet === "addAccount"}
        onClose={closeSheet}
      />
      <NewReportSheet
        open={sheet === "newReport"}
        onClose={closeSheet}
      />
      <TeamSheet open={sheet === "manageTeam"} onClose={closeSheet} />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <FrameInner>{children}</FrameInner>
    </ShellProvider>
  );
}
