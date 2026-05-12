import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { PLACEHOLDER_MODE } from "@/lib/placeholder-data";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="sticky top-0 flex h-screen flex-col border-r border-border bg-surface">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 pt-5 pb-6 text-sm font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
          />
          Alert Network
        </Link>
        <SidebarNav />
        <div className="mt-auto px-5 pb-5">
          <div className="rounded-md border border-border bg-surface-2 p-3 text-xs text-muted">
            <div className="mb-1 font-mono uppercase tracking-wider text-muted-2">
              Preview
            </div>
            Auth is disabled. Shell and placeholder data only.
          </div>
        </div>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <div className="text-sm text-muted">
            <span className="font-mono uppercase tracking-wider text-muted-2">
              Workspace
            </span>{" "}
            / Lab · Exhale Studios
          </div>
          <div className="flex items-center gap-3">
            {PLACEHOLDER_MODE && (
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                Placeholder data
              </span>
            )}
            <span className="h-8 w-8 rounded-full bg-surface-2 ring-1 ring-border" />
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
