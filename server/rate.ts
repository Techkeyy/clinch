import { headers } from "next/headers";
import { ownerRateKey, networkRateKey } from "@/lib/ownership";
import type { SessionStore } from "@/persistence/store";

// Abuse control (P7): owner bucket 10 starts/hour; coarse network bucket
// 60/hour. Pseudonymous HMAC keys only; raw IPs never persisted.
// Trusted-source note: dev/local reads x-forwarded-for first entry; P18 must
// prove the platform-trusted source header for production.
export async function trustedNetworkSource(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return first && first.length > 0 && first.length < 64 ? first : "unknown-local";
}
export async function checkStartLimits(store: SessionStore, ownerSecret: string | null, ip: string): Promise<{ ok: true } | { ok: false; code: string }> {
  if (ownerSecret) {
    const r = await store.rateHit(`owner:${ownerRateKey(ownerSecret)}`, 3_600_000, 10);
    if (!r.allowed) return { ok: false, code: "RATE_LIMITED" };
  }
  const n = await store.rateHit(`net:${networkRateKey(ip)}`, 3_600_000, 60);
  if (!n.allowed) return { ok: false, code: "RATE_LIMITED" };
  return { ok: true };
}
