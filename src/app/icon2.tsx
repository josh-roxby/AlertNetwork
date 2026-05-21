import { ImageResponse } from "next/og";

// Auto-generated app icon at 512×512 — the larger PWA install
// variant. The 192 lives in icon.tsx. See that file for the why and
// the geometry source-of-truth.

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon2() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <BrandSvg fill="#0A0A0A" />
      </div>
    ),
    size,
  );
}

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
