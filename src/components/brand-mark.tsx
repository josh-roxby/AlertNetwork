// Alert Network logo as an inline SVG component. Reused across:
//   - The header brand mark next to "Alert Network" (mobile + desktop)
//   - The PWA icon (rendered to PNG via ImageResponse in
//     src/app/icon.tsx and src/app/apple-icon.tsx)
//
// Vector recreation of the supplied artwork — hexagonal frame of
// dotted ring nodes, with three ascending bars in the centre.
// Strokes / fills use `currentColor` so the same component works on
// dark (white-on-black) and light (black-on-white) surfaces with no
// per-context variants.

import * as React from "react";

export function BrandMark({
  size = 24,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-labelledby={title ? id : undefined}
      className={className}
    >
      {title && <title id={id}>{title}</title>}

      {/* Hexagon edges. Top-left + lower edges solid (anchor strokes
          for stability at small sizes); other edges dotted. */}
      <path
        d="M50 18 L22 34"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path
        d="M22 66 L50 82 L78 66"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 18 L78 34 L78 66"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0.1 6"
      />
      <path
        d="M22 34 L22 66"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="0.1 6"
      />

      {/* Three ascending bars (left short / middle tall / right
          medium). Bottoms aligned at the lower hexagon row. */}
      <rect x={36} y={62} width={8} height={20} fill="currentColor" rx={0.5} />
      <rect x={46} y={44} width={8} height={38} fill="currentColor" rx={0.5} />
      <rect x={56} y={52} width={8} height={30} fill="currentColor" rx={0.5} />

      {/* Hexagon vertex rings — drawn last so they sit OVER the
          edge lines / bars. Open circles (stroke only). */}
      <Vertex cx={50} cy={18} />
      <Vertex cx={78} cy={34} />
      <Vertex cx={78} cy={66} />
      <Vertex cx={50} cy={82} />
      <Vertex cx={22} cy={66} />
      <Vertex cx={22} cy={34} />
    </svg>
  );
}

function Vertex({ cx, cy }: { cx: number; cy: number }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      stroke="currentColor"
      strokeWidth={2.5}
      fill="none"
    />
  );
}
