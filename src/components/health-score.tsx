export type HealthBand =
  | "critical"
  | "weak"
  | "watching"
  | "strong"
  | "excellent";

export function healthBand(score: number): HealthBand {
  if (score < 20) return "critical";
  if (score < 40) return "weak";
  if (score < 60) return "watching";
  if (score < 80) return "strong";
  return "excellent";
}

const BAND_LABEL: Record<HealthBand, string> = {
  critical: "Critical",
  weak: "Weak",
  watching: "Watching",
  strong: "Strong",
  excellent: "Excellent",
};

const BAND_TONE: Record<HealthBand, string> = {
  critical: "text-bad",
  weak: "text-ink-3",
  watching: "text-ink-2",
  strong: "text-ink",
  excellent: "text-ink",
};

export function HealthScore({
  score,
  size = "md",
  showBand = false,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  showBand?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const band = healthBand(clamped);
  const display =
    size === "lg" ? "t-display-1" : size === "md" ? "t-display-3" : "t-h1";

  return (
    <span className={`inline-flex items-baseline gap-2 ${BAND_TONE[band]}`}>
      <span data-numeric className={display}>
        {clamped.toFixed(0)}
      </span>
      {showBand && <span className="t-micro">{BAND_LABEL[band]}</span>}
    </span>
  );
}

export function TrendArrow({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span data-numeric className="text-ink-3">
        →
      </span>
    );
  }
  const up = delta > 0;
  const sign = up ? "+" : "−";
  return (
    <span data-numeric className={up ? "text-good" : "text-bad"}>
      {up ? "↑" : "↓"} {sign}
      {Math.abs(delta).toFixed(1)}
    </span>
  );
}
