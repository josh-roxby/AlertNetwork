import { CATEGORIES, type Category } from "@/lib/placeholder-data";

const DOT: Record<Category, string> = {
  fashion: "bg-cat-fashion",
  food: "bg-cat-food",
  beauty: "bg-cat-beauty",
  tech: "bg-cat-tech",
  sports: "bg-cat-sports",
  music: "bg-cat-music",
  travel: "bg-cat-travel",
  lifestyle: "bg-cat-lifestyle",
};

const LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
) as Record<Category, string>;

export function CategoryTag({ category }: { category: Category }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 py-[5px] pl-[10px] pr-3 text-ink-2 transition-colors duration-[120ms] hover:bg-surface-3 hover:text-ink"
      style={{ fontSize: 12, fontWeight: 500 }}
    >
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${DOT[category]}`}
      />
      {LABEL[category]}
    </span>
  );
}

export function Tag({
  label,
  removable = false,
}: {
  label: string;
  removable?: boolean;
}) {
  return (
    <span
      className="group inline-flex items-center gap-1 rounded-full border border-line bg-surface-3 px-2.5 py-1 text-ink-2"
      style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
    >
      <span className="text-ink-3">#</span>
      {label}
      {removable && (
        <button
          type="button"
          className="ml-0.5 hidden text-ink-3 hover:text-ink group-hover:inline"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
