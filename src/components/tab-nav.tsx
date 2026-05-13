"use client";

export function TabNav<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="no-scrollbar -mx-3 flex items-center gap-5 overflow-x-auto border-b border-line px-3"
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(t.id)}
            className={`tap-btn relative shrink-0 px-0 pb-3 pt-3 t-body transition-colors duration-[120ms] ${
              isActive
                ? "font-semibold text-ink"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {t.label}
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
