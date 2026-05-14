// Tiny legend strip — shows what the short metric prefixes mean on
// account rows. Mono-cased to match the row metrics themselves.
export function MetricLegend() {
  return (
    <dl
      className="flex flex-wrap items-center gap-x-3 gap-y-1 t-meta text-ink-3"
      style={{ fontSize: 10 }}
    >
      <Item term="Med" definition="median views" />
      <Item term="Tot" definition="total views" />
      <Item term="ER" definition="engagement %" />
    </dl>
  );
}

function Item({ term, definition }: { term: string; definition: string }) {
  return (
    <span className="flex items-center gap-1">
      <dt className="text-ink-2">{term}</dt>
      <dd className="text-ink-3">{definition}</dd>
    </span>
  );
}
