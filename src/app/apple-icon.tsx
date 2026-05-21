import { ImageResponse } from "next/og";

// Apple touch icon. iOS uses this when the user does Share → Add
// to Home Screen. iOS applies its own rounded mask so we deliver a
// square — don't double up on rounding.
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
        }}
      >
        <BrandSvg fill="#FFFFFF" />
      </div>
    ),
    size,
  );
}

// Inline copy — see icon.tsx for why we can't import BrandMark
// directly into the edge ImageResponse runtime.
function BrandSvg({ fill }: { fill: string }) {
  return (
    <svg
      width="76%"
      height="76%"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 18 L22 34"
        stroke={fill}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path
        d="M22 66 L50 82 L78 66"
        stroke={fill}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 18 L78 34 L78 66"
        stroke={fill}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0.1 6"
      />
      <path
        d="M22 34 L22 66"
        stroke={fill}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="0.1 6"
      />
      <rect x={36} y={62} width={8} height={20} fill={fill} />
      <rect x={46} y={44} width={8} height={38} fill={fill} />
      <rect x={56} y={52} width={8} height={30} fill={fill} />
      <circle cx={50} cy={18} r={5} stroke={fill} strokeWidth={2.5} fill="none" />
      <circle cx={78} cy={34} r={5} stroke={fill} strokeWidth={2.5} fill="none" />
      <circle cx={78} cy={66} r={5} stroke={fill} strokeWidth={2.5} fill="none" />
      <circle cx={50} cy={82} r={5} stroke={fill} strokeWidth={2.5} fill="none" />
      <circle cx={22} cy={66} r={5} stroke={fill} strokeWidth={2.5} fill="none" />
      <circle cx={22} cy={34} r={5} stroke={fill} strokeWidth={2.5} fill="none" />
    </svg>
  );
}
