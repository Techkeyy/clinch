// Clerk cookie-suffix desync guard: the session-cookie suffix is
// base64url(SHA-1(publishableKey)) computed VERBATIM, while key parsing
// tolerates pasted trailing whitespace. An untrimmed server key therefore
// desyncs middleware cookie selection from the browser with no errors.
// Uses synthetic keys only; never production values.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCookieSuffix } from "@clerk/shared/keys";

const SYNTHETIC_PK = "pk_live_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk";

beforeEach(() => {
  vi.resetModules();
});

describe("clerk cookie suffix derivation", () => {
  it("produces an 8-char suffix for a well-formed key", async () => {
    const suffix = await getCookieSuffix(SYNTHETIC_PK, globalThis.crypto.subtle);
    expect(suffix).toMatch(/^[A-Za-z0-9_-]{8}$/);
  });

  it("changes the suffix when invisible trailing characters are present", async () => {
    const clean = await getCookieSuffix(SYNTHETIC_PK, globalThis.crypto.subtle);
    const dirty = await getCookieSuffix(`${SYNTHETIC_PK}\n`, globalThis.crypto.subtle);
    expect(dirty).not.toBe(clean);
  });

  it("trimming restores the browser suffix", async () => {
    const clean = await getCookieSuffix(SYNTHETIC_PK, globalThis.crypto.subtle);
    const healed = await getCookieSuffix(`${SYNTHETIC_PK}\n`.trim(), globalThis.crypto.subtle);
    expect(healed).toBe(clean);
  });
});

describe("proxy middleware options", () => {
  it("passes a trimmed publishable key so server suffix matches the browser", async () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = `${SYNTHETIC_PK}\n`;
    process.env.CLERK_SECRET_KEY = "sk_live_synthetic-test-value";
    const proxy = await import("@/proxy");
    expect(proxy.clerkMiddlewareOptions.publishableKey).toBe(SYNTHETIC_PK);
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.CLERK_SECRET_KEY;
  });
});
