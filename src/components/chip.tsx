"use client";

type ChipProps = {
  active?: boolean;
  count?: number;
  onClick?: () => void;
  children: React.ReactNode;
};

export function Chip({ active = false, count, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap-btn inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 transition-colors duration-[120ms] ${
        active
          ? "border-ink bg-ink text-bg"
          : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2"
      }`}
    >
      <span className="t-body" style={{ fontSize: 12, fontWeight: 500 }}>
        {children}
      </span>
      {typeof count === "number" && (
        <span
          data-numeric
          className={`text-[10px] font-semibold ${active ? "text-bg/70" : "text-ink-3"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function ChipDivider() {
  return (
    <span
      aria-hidden
      className="mx-1 inline-block h-5 w-px shrink-0 bg-line-2"
    />
  );
}
