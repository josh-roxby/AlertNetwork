export function HealthScore({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone =
    clamped >= 75
      ? "text-positive"
      : clamped >= 50
        ? "text-foreground"
        : "text-negative";
  return (
    <span data-numeric className={`font-semibold ${tone}`}>
      {clamped.toFixed(0)}
    </span>
  );
}

export function TrendArrow({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span data-numeric className="text-muted-2">
        →
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      data-numeric
      className={up ? "text-positive" : "text-negative"}
      title={`${up ? "+" : ""}${delta.toFixed(1)}%`}
    >
      {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}
