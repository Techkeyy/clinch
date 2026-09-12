import type { SessionStore } from "@/persistence/store";

// Process-level singleton: sqlite file handle reuse locally; postgres pool
// reuse in long-running hosts. Serverless instances each hold their own.
let cached: SessionStore | null = null;
export async function getStore(): Promise<SessionStore> {
  if (cached) return cached;
  const { openStore } = await import("@/persistence/index");
  cached = openStore();
  return cached;
}
