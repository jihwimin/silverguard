export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  try {
    // path may be full URL (e.g. silverguard://localhost/guardian-alerts?text=...)
    const url = new URL(path, "silverguard://");
    const pathname = url.pathname || "";
    const search = url.search || "";
    const fullPath = (pathname.startsWith("/") ? pathname : "/" + pathname) + search;

    // Phishing notification deep link -> diagnosis tab (with tabs visible)
    if (fullPath.startsWith("/(tabs)/diagnosis") || fullPath.startsWith("/guardian-alerts")) {
      const search = fullPath.includes("?") ? fullPath.slice(fullPath.indexOf("?")) : "";
      return "/(tabs)/diagnosis" + search;
    }
  } catch {
    if (path?.includes("diagnosis") || path?.includes("guardian-alerts")) {
      const match = path.match(/(?:guardian-alerts|diagnosis)(\?.*)?/);
      return "/(tabs)/diagnosis" + (match?.[1] || "");
    }
  }
  if (initial) {
    return "/";
  }
  return path || "/";
}
