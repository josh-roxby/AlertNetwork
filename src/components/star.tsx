// Small star glyph used by the "Mark as featured" button on report
// detail and by the featured-reports section on /dashboard.

export function Star({
  filled,
  className,
}: {
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M8 1.6l1.9 4 4.3.4-3.2 2.9 1 4.2L8 11l-3.9 2.2 1-4.2-3.2-3 4.3-.4z" />
    </svg>
  );
}
