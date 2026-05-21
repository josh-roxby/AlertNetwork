"use client";

import { usePathname } from "next/navigation";
import {
  IconEye,
  IconPlus,
  IconSidebar,
  IconTeam,
} from "@/components/icons";
import { useShell } from "@/components/shell-context";

type SheetFab = "addAccount" | "newReport" | "manageTeam" | "newProject";

type FabSpec =
  | { kind: "drawer"; label: string }
  | { kind: "sheet"; sheet: SheetFab; label: string }
  | { kind: "link"; href: string; target: "_blank"; label: string; icon: "eye" }
  | { kind: "none" };

function fabForPath(pathname: string, surface: "mobile" | "desktop"): FabSpec {
  if (pathname === "/" || pathname.startsWith("/dashboard")) {
    // Mobile dashboard FAB opens the project drawer. Desktop has no drawer
    // (project switcher lives in the topbar), so the primary action becomes
    // "add account".
    return surface === "desktop"
      ? { kind: "sheet", sheet: "addAccount", label: "Add account" }
      : { kind: "drawer", label: "Open project drawer" };
  }
  if (pathname.startsWith("/accounts/")) {
    return { kind: "none" };
  }
  if (pathname.startsWith("/accounts")) {
    return { kind: "sheet", sheet: "addAccount", label: "Add account" };
  }
  if (pathname.startsWith("/reports/")) {
    // Sub-page: surface a 'view in new tab' eye so the share-out is one tap.
    const id = pathname.split("/")[2];
    return {
      kind: "link",
      href: `/reports/${id}/view`,
      target: "_blank",
      label: "View report in new tab",
      icon: "eye",
    };
  }
  if (pathname.startsWith("/reports")) {
    return { kind: "sheet", sheet: "newReport", label: "New report" };
  }
  if (pathname.startsWith("/projects")) {
    return { kind: "sheet", sheet: "newProject", label: "New project" };
  }
  if (pathname.startsWith("/settings")) {
    return { kind: "sheet", sheet: "manageTeam", label: "Manage team" };
  }
  return { kind: "none" };
}

const mobileClassName =
  "tap-fab absolute z-[var(--z-fab)] inline-flex h-[46px] w-[46px] items-center justify-center rounded-xs bg-accent text-[#0A0A0A] shadow-[var(--sh-fab)] transition-colors duration-[120ms] hover:bg-accent-dim lg:hidden";
const mobileStyle = { bottom: 16, right: 12 } as const;

const desktopClassName =
  "tap-fab fixed z-[var(--z-fab)] hidden h-[46px] w-[46px] items-center justify-center rounded-xs bg-accent text-[#0A0A0A] shadow-[var(--sh-fab)] transition-colors duration-[120ms] hover:bg-accent-dim lg:inline-flex";
const desktopStyle = { bottom: 4, right: 4 } as const;

function FabBase({
  surface,
  className,
  style,
}: {
  surface: "mobile" | "desktop";
  className: string;
  style: { bottom: number; right: number };
}) {
  const pathname = usePathname();
  const { openDrawer, openSheet, canManage, isSuperAdmin } = useShell();
  const spec = fabForPath(pathname, surface);
  if (spec.kind === "none") return null;

  // Project creation is super-admin only — gate it separately to
  // catch non-super-admin owners on /projects.
  if (spec.kind === "sheet" && spec.sheet === "newProject" && !isSuperAdmin) {
    return null;
  }

  // Viewers don't get the per-page "create" affordance. The view-in-
  // new-tab eye on a specific report is still useful for them, and
  // the settings page's "Manage team" sheet lets them see who's on
  // the project (read-only). Managers can add accounts / reports.
  if (
    spec.kind === "sheet" &&
    !canManage &&
    spec.sheet !== "manageTeam"
  ) {
    return null;
  }

  if (spec.kind === "link") {
    return (
      <a
        href={spec.href}
        target={spec.target}
        rel="noopener noreferrer"
        aria-label={spec.label}
        className={className}
        style={style}
      >
        <IconEye stroke="#0A0A0A" />
      </a>
    );
  }

  const onClick =
    spec.kind === "drawer"
      ? openDrawer
      : () => openSheet({ kind: spec.sheet });

  const Icon =
    spec.kind === "drawer"
      ? IconSidebar
      : spec.sheet === "manageTeam"
        ? IconTeam
        : IconPlus;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={spec.label}
      className={className}
      style={style}
    >
      <Icon stroke="#0A0A0A" />
    </button>
  );
}

export function Fab() {
  return (
    <FabBase
      surface="mobile"
      className={mobileClassName}
      style={mobileStyle}
    />
  );
}

export function DesktopFab() {
  return (
    <FabBase
      surface="desktop"
      className={desktopClassName}
      style={desktopStyle}
    />
  );
}
