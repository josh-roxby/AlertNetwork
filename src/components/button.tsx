type Variant = "primary" | "secondary" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent text-[#0A0A0A] hover:bg-accent-dim active:scale-[0.97]",
  secondary:
    "bg-surface-2 text-ink border border-line-2 hover:bg-surface-3 active:scale-[0.97]",
  ghost: "text-ink-2 hover:text-ink hover:bg-surface-2 active:scale-[0.97]",
};

export function Button({
  variant = "primary",
  children,
  type = "button",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
}) {
  return (
    <button
      type={type}
      className={`rounded-sm px-4 py-2.5 text-[14px] font-semibold transition-all duration-[120ms] disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
