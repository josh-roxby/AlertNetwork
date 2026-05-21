import { ImageResponse } from "next/og";

// Auto-generated app icon. Next.js renders this JSX to PNG at build
// time and serves it at /icon. Used as the favicon and as the
// Android home-screen icon when installed via the PWA manifest.
//
// 512×512 base — Android's largest expected size. Browser scales
// down for the favicon slot. The vector geometry is the same shape
// as the inline BrandMark component but inlined here because
// ImageResponse renders a fresh tree; we can't import the React
// component (uses useId which isn't supported by edge ImageResponse).

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

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
        }}
      >
        <BrandSvg fill="#FFFFFF" />
      </div>
    ),
    size,
  );
}

// Inline copy of the BrandMark vector — ImageResponse runs on the
// edge runtime which doesn't support React hooks (useId), so we
// can't reuse the component here directly. Keep this in sync with
// src/components/brand-mark.tsx if the artwork changes.
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
