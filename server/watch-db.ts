import type { WatchStore } from "@/persistence/watch";
import { openWatchStore } from "@/persistence/watch";

let cached: WatchStore | null = null;

export async function getWatchStore(): Promise<WatchStore> {
  if (cached) return cached;
  cached = openWatchStore(process.env.DATABASE_URL);
  return cached;
}
