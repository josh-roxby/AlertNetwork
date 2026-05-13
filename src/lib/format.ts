export function compactNumber(n: number): string {
  return Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function percent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const hours = Math.round(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}
