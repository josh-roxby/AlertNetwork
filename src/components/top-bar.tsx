import { PLACEHOLDER_MODE, placeholderProjects } from "@/lib/placeholder-data";

export function TopBar() {
  const currentProject = placeholderProjects[0];

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-line bg-bg/85 px-6 backdrop-blur">
      <button
        type="button"
        className="flex items-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-3 py-1.5 text-left text-[13px] text-ink hover:bg-surface-3"
      >
        <span className="t-micro text-ink-3">Project</span>
        <span className="font-medium">{currentProject?.name}</span>
        <span aria-hidden className="text-ink-3">
          ▾
        </span>
      </button>

      <div className="relative mx-auto w-full max-w-[480px]">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
        >
          ⌕
        </span>
        <input
          type="search"
          placeholder="Search accounts, tags, reports…"
          disabled
          className="h-10 w-full rounded-full border border-transparent bg-[rgba(255,255,255,0.04)] pl-10 pr-16 text-[13px] text-ink placeholder:text-ink-3 focus:border-accent-line focus:bg-surface-2 focus:outline-none"
        />
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-xs border border-line-2 bg-surface-2 px-1.5 py-0.5 text-ink-3"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
        >
          ⌘K
        </span>
      </div>

      <div className="flex items-center gap-3">
        {PLACEHOLDER_MODE && (
          <span className="t-micro rounded-full border border-line-2 bg-surface px-2.5 py-1 text-ink-3">
            Placeholder data
          </span>
        )}
        <button
          type="button"
          aria-label="User menu"
          className="h-8 w-8 rounded-full bg-surface-2 ring-1 ring-line-2 hover:bg-surface-3"
        />
      </div>
    </header>
  );
}
