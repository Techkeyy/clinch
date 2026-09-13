// Browser-local recent-session index (IDs only, max 10). Each ID is
// re-verified by ownership on fetch; expired/deleted/foreign entries vanish.
const KEY = "clinch-recent-v1";
export function trackRecent(id: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    localStorage.setItem(KEY, JSON.stringify([id, ...list.filter((x) => x !== id)].slice(0, 10)));
  } catch { /* private mode: history simply unavailable */ }
}
export function untrackRecent(id: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    localStorage.setItem(KEY, JSON.stringify(list.filter((x) => x !== id)));
  } catch { /* ignore */ }
}
export function readRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}
