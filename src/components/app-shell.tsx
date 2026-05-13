import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { TopBar } from "@/components/top-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface lg:flex">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 pt-5 pb-6 text-ink"
          style={{ fontFamily: "var(--font-unbounded)" }}
        >
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
          />
          <span className="t-h1 uppercase tracking-tight">Alert Network</span>
        </Link>
        <SidebarNav />
        <div className="mt-auto px-5 pb-5">
          <div className="rounded-md border border-line-2 bg-surface-2 p-3 t-small text-ink-2">
            <div className="t-micro mb-1 text-ink-3">Preview</div>
            Auth is disabled. Shell and placeholder data only.
          </div>
        </div>
      </aside>
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
