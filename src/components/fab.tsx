"use client";

import { usePathname } from "next/navigation";
import { IconPlus, IconSidebar, IconTeam } from "@/components/icons";
import { useShell } from "@/components/shell-context";

type FabSpec =
  | { kind: "drawer"; label: string }
  | { kind: "sheet"; sheet: "addAccount" | "newReport" | "manageTeam"; label: string }
  | { kind: "none" };

function fabForPath(pathname: string): FabSpec {
  if (pathname === "/" || pathname.startsWith("/dashboard")) {
    return { kind: "drawer", label: "Open project drawer" };
  }
  if (pathname.startsWith("/accounts")) {
    return { kind: "sheet", sheet: "addAccount", label: "Add account" };
  }
  if (pathname.startsWith("/reports/")) {
    return { kind: "none" };
  }
  if (pathname.startsWith("/reports")) {
    return { kind: "sheet", sheet: "newReport", label: "New report" };
  }
  if (pathname.startsWith("/settings")) {
    return { kind: "sheet", sheet: "manageTeam", label: "Manage team" };
  }
  return { kind: "none" };
}

export function Fab() {
  const pathname = usePathname();
  const { openDrawer, openSheet } = useShell();
  const spec = fabForPath(pathname);
  if (spec.kind === "none") return null;

  const onClick =
    spec.kind === "drawer" ? openDrawer : () => openSheet(spec.sheet);

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
      className="tap-fab absolute z-[var(--z-fab)] inline-flex h-[46px] w-[46px] items-center justify-center rounded-xs bg-accent text-[#0A0A0A] shadow-[var(--sh-fab)] transition-colors duration-[120ms] hover:bg-accent-dim"
      style={{ bottom: 16, right: 4 }}
    >
      <Icon stroke="#0A0A0A" />
    </button>
  );
}
