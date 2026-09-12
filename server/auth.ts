import { cookies } from "next/headers";
import { newOwnerSecret, ownerVerifier, verifyOwner } from "@/lib/ownership";

export const OWNER_COOKIE = "clinch_owner";

export interface OwnerContext { secret: string | null; setCookie: string | null }

/** Read owner secret from the secure cookie, if present and well-formed. */
export async function readOwner(): Promise<OwnerContext> {
  const jar = await cookies();
  const raw = jar.get(OWNER_COOKIE)?.value ?? null;
  if (raw && /^[A-Za-z0-9_-]{43}$/.test(raw)) return { secret: raw, setCookie: null };
  return { secret: null, setCookie: null };
}
/** Mint a fresh owner credential (caller sets it via Set-Cookie header). */
export function mintOwner(): { secret: string; setCookie: string } {
  const secret = newOwnerSecret();
  const attrs = ["Path=/", "Max-Age=2592000", "SameSite=Lax", "HttpOnly"];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return { secret, setCookie: `${OWNER_COOKIE}=${secret}; ${attrs.join("; ")}` };
}
/** Verify browser ownership of a session row carrying ownerVerifier. */
export function ownsSession(sessionOwnerVerifier: string, sessionId: string, secret: string | null): boolean {
  if (!secret) return false;
  try {
    return verifyOwner(sessionId, secret, sessionOwnerVerifier);
  } catch {
    return false;
  }
}
export function verifierFor(sessionId: string, secret: string): string {
  return ownerVerifier(sessionId, secret);
}
