import type { MetadataRoute } from "next";

// Web app manifest. Next.js serves this at /manifest.webmanifest.
//
// Scope:
//   - Saved-to-home-screen on iOS + Android.
//   - Standalone display so the address bar / browser chrome is hidden
//     when launched from the home screen.
//   - Service worker is required for Chrome desktop / Android to fire
//     `beforeinstallprompt`. Registered from `<ServiceWorkerRegister>`
//     in src/components/shell.tsx, source at public/sw.js.
//
// Icons:
//   - Both 192×192 and 512×512 are required for Chrome's install
//     criteria. Generated from src/app/icon.tsx (192) and
//     src/app/icon2.tsx (512), served at /icon and /icon2.
//   - Each is exposed twice — once with purpose "any" (favicon /
//     launcher tile) and once "maskable" (Android adaptive icons can
//     mask the corners). Same artwork either way; the 12% padding
//     baked into the icons keeps the logo inside Android's safe zone.

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
    background_color: "#FFFFFF",
    theme_color: "#0A0A0A",
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon2",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
