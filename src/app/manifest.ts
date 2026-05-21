import type { MetadataRoute } from "next";

// Web app manifest. Next.js serves this at /manifest.webmanifest.
//
// Scope:
//   - Saved-to-home-screen on iOS + Android.
//   - Standalone display so the address bar / browser chrome is hidden
//     when launched from the home screen.
//   - NO offline mode (no service worker), NO push notifications.
//     Re-add either when there's a use case for it.
//
// Icons are generated from `src/app/icon.tsx` (any size) and
// `src/app/apple-icon.tsx` (180×180, Apple touch icon). Next.js
// emits PNG files at build time from the JSX → ImageResponse pipeline.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alert Network",
    short_name: "Alert Network",
    description:
      "Social account monitoring and observability for sponsorship teams.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    categories: ["productivity", "business"],
  };
}
