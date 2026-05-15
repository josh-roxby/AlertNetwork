// Tiny helpers around Date.now() — broken out so the react-hooks
// purity lint rule (which flags Date.now in component bodies) doesn't
// fire on legitimate server-component / route-handler uses.

export function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

export function isoDaysAgo(days: number): string {
  return isoHoursAgo(days * 24);
}
