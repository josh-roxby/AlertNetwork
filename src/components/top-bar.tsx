import { PLACEHOLDER_MODE } from "@/lib/placeholder-data";
import { MobileNav } from "@/components/mobile-nav";
import { ProjectSwitcher } from "@/components/project-switcher";
import { UserMenu } from "@/components/user-menu";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur sm:gap-4 sm:px-6">
      <MobileNav />

      <ProjectSwitcher />

      <div className="relative mx-auto hidden w-full max-w-[480px] md:block">
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

      <button
        type="button"
        aria-label="Search"
        className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink md:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 12l3 3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="flex items-center gap-3 md:ml-0">
        {PLACEHOLDER_MODE && (
          <span className="t-micro hidden rounded-full border border-line-2 bg-surface px-2.5 py-1 text-ink-3 sm:inline">
            Placeholder data
          </span>
        )}
        <UserMenu />
      </div>
    </header>
  );
}
