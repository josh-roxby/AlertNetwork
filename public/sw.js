// Minimal service worker.
//
// Purpose: satisfy Chrome's PWA installability criteria. Chrome
// desktop and Chrome on Android will not fire `beforeinstallprompt`
// (and the URL-bar install button stays hidden) unless the page is
// controlled by a service worker that has at least one fetch
// handler. This file exists to satisfy that requirement — nothing
// more.
//
// We deliberately do NOT cache anything. Alert Network reads live
// Supabase data on every navigation; serving stale chart data from
// the SW would be worse than the install prompt being absent.
// If we ever want true offline support, this is the file that grows.

self.addEventListener("install", () => {
  // Activate immediately on first install so the page becomes
  // controlled without needing a reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Take control of any open clients on activation.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through. Required for Chrome's install criteria — without
  // a `fetch` listener the SW doesn't count toward installability.
  event.respondWith(fetch(event.request));
});
