import { ImageResponse } from "next/og";

// Apple touch icon. iOS uses this when the user does
// Share → Add to Home Screen. iOS applies its own rounded mask so
// we deliver a square — don't double up on rounding.
//
// 180×180 is iOS's canonical size; Android uses /icon (the larger
// 512×512 variant) instead so both home screens get a sharp render.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 128,
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
