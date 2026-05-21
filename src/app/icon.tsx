import { ImageResponse } from "next/og";

// Auto-generated favicon / app icon. Next.js renders this JSX to PNG
// at build time and serves it at /icon for any platform that asks
// for an icon (browsers, Android home screen, etc).
//
// 512×512 base — Android's largest expected size. The browser scales
// down for the favicon slot. Apple uses a separate apple-icon.tsx
// so iOS gets a square without the rounded corners doubled.

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// The brand mark: a dark surface with the yellow "A" wordmark glyph
// in Unbounded-ish weight. Edge runtime doesn't have the full font
// loaded so we use system-stack which renders close enough at this
// size — distinct, on-brand, recognisable on a busy home screen.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 900,
          fontSize: 360,
          color: "#FFD300",
          letterSpacing: "-0.04em",
        }}
      >
        A
      </div>
    ),
    size,
  );
}
