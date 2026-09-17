import { cookies } from "next/headers";
import { newOwnerSecret, ownerVerifier, verifyOwner } from "@/lib/ownership";
import type { SessionRow } from "@/persistence/store";

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

/** Clerk is optional during the guest-first rollout; never invent credentials. */
export function clerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export async function currentAccountUserId(): Promise<string | null> {
  return (await readAccountContext()).userId;
}

/** Same identity read with a safe diagnostic (never a secret, never a token). */
export async function readAccountContext(): Promise<{ userId: string | null; clerkError: string | null }> {
  if (!clerkConfigured()) return { userId: null, clerkError: "clerk-not-configured" };
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const result = await auth();
    return { userId: result.userId ?? null, clerkError: null };
  } catch (error) {
    return { userId: null, clerkError: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200) };
  }
}

/** Account rows require Clerk identity; guest rows remain cookie-verifier owned. */
export function canAccessSession(row: Pick<SessionRow, "accountUserId" | "ownerVerifier" | "id">, guestSecret: string | null, accountUserId: string | null): boolean {
  if (row.accountUserId) return accountUserId === row.accountUserId;
  return ownsSession(row.ownerVerifier, row.id, guestSecret);
}
