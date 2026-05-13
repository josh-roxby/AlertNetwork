type Inputs = {
  medianViews: number;
  engagementRatio: number;
  postsPerCycle: number;
  followers: number;
  trendDelta: number;
};

// Approximate the per-component contribution out of 100. This is purely for
// the placeholder breakdown bar — real numbers will come from the scoring
// service once it exists.
function componentContributions({
  medianViews,
  engagementRatio,
  postsPerCycle,
  followers,
  trendDelta,
}: Inputs) {
  const norm = (v: number, max: number) =>
    Math.max(0, Math.min(1, v / max));
  const median = norm(medianViews, 200_000) * 30;
  const engagement = norm(engagementRatio, 0.12) * 30;
  const frequency = norm(postsPerCycle, 3) * 20;
  const followersComp = norm(Math.log10(Math.max(1, followers)), 6) * 10;
  const momentum = Math.abs(trendDelta) >= 20 ? 10 : trendDelta > 0 ? 6 : 4;
  return [
    { label: "Median views", value: median, weight: 30 },
    { label: "Engagement", value: engagement, weight: 30 },
    { label: "Post frequency", value: frequency, weight: 20 },
    { label: "Followers", value: followersComp, weight: 10 },
    { label: "Momentum", value: momentum, weight: 10 },
  ];
}

export function HealthScoreBreakdown(props: Inputs) {
  const rows = componentContributions(props);
  const top = rows.reduce(
    (acc, r) => (r.value / r.weight > acc.value / acc.weight ? r : acc),
    rows[0],
  );

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const pct = (r.value / r.weight) * 100;
        const isTop = r === top && pct >= 80;
        return (
          <div key={r.label} className="flex items-center gap-3">
            <span
              className="t-meta text-ink-3"
              style={{ width: 110, fontSize: 10 }}
            >
              {r.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className={`h-full ${isTop ? "bg-accent" : "bg-ink-3"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span
              data-numeric
              className="text-ink-2"
              style={{ width: 36, textAlign: "right", fontSize: 11 }}
            >
              {r.value.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
