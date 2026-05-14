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

function fabForPath(pathname: string): FabSpec {
  if (pathname === "/" || pathname.startsWith("/dashboard")) {
    return { kind: "drawer", label: "Open project drawer" };
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

const className =
  "tap-fab absolute z-[var(--z-fab)] inline-flex h-[46px] w-[46px] items-center justify-center rounded-xs bg-accent text-[#0A0A0A] shadow-[var(--sh-fab)] transition-colors duration-[120ms] hover:bg-accent-dim lg:hidden";
const style = { bottom: 16, right: 12 } as const;

export function Fab() {
  const pathname = usePathname();
  const { openDrawer, openSheet } = useShell();
  const spec = fabForPath(pathname);
  if (spec.kind === "none") return null;

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
