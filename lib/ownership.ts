import { randomUUID, randomBytes, createHmac, timingSafeEqual } from "node:crypto";

// P7 ownership helpers (pure functions; HTTP/cookie wiring lands in P13).
export function newSessionId(): string {
  return randomUUID();
}
export function newOwnerSecret(): string {
  return randomBytes(32).toString("base64url");
}
export function newIdempotencyKey(): string {
  return randomBytes(24).toString("base64url");
}
function pepper(): string {
  const p = process.env.SESSION_PEPPER;
  if (!p) throw new Error("SESSION_PEPPER is not configured");
  return p;
}
/** Session-bound HMAC verifier. Exact serialization: label + sessionId + secret. */
export function ownerVerifier(sessionId: string, ownerSecret: string): string {
  return createHmac("sha256", pepper())
    .update(`session-owner:v1:${sessionId}:${ownerSecret}`, "utf8")
    .digest("hex");
}
export function verifyOwner(sessionId: string, ownerSecret: string, expectedHex: string): boolean {
  const a = Buffer.from(ownerVerifier(sessionId, ownerSecret), "hex");
  const b = Buffer.from(expectedHex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
/** Pseudonymous abuse-counter keys. Never authorization, never logged, never returned. */
export function ownerRateKey(ownerSecret: string): string {
  return createHmac("sha256", pepper()).update(`owner-rate:v1:${ownerSecret}`, "utf8").digest("hex");
}
export function networkRateKey(trustedIp: string): string {
  return createHmac("sha256", pepper()).update(`ip-rate:v1:${trustedIp}`, "utf8").digest("hex");
}
