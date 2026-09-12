import { describe, expect, it, beforeEach } from "vitest";
import { COPY } from "../lib/copy";
import { newOwnerSecret, newSessionId, ownerVerifier, verifyOwner, ownerRateKey, networkRateKey } from "../lib/ownership";

const LONG_DASH = /[\u2013\u2014]/;

describe("copy truth rules", () => {
  it("contains no em/en dashes in any user-facing string", () => {
    for (const [k, v] of Object.entries(COPY)) {
      expect(v, k).not.toMatch(LONG_DASH);
    }
  });
  it("never promises execution or certainty", () => {
    const banned = [/\bbuy now\b/i, /\bg guaranteed\b/i, /risk-free/i, /sure win/i, /definitely buy/i, /100% confidence/i];
    for (const [k, v] of Object.entries(COPY)) {
      for (const b of banned) expect(v, `${k} ${b}`).not.toMatch(b);
    }
  });
});

describe("anonymous ownership (P7 HMAC construction)", () => {
  const PEPPER = "test-pepper-000000000000000000000000";
  beforeEach(() => { process.env.SESSION_PEPPER = PEPPER; });
  it("is deterministic and session-bound", () => {
    const sid = newSessionId();
    const secret = newOwnerSecret();
    expect(ownerVerifier(sid, secret)).toBe(ownerVerifier(sid, secret));
    expect(ownerVerifier("other-session-id-00000000000000000000001", secret)).not.toBe(ownerVerifier(sid, secret));
    expect(verifyOwner(sid, secret, ownerVerifier(sid, secret))).toBe(true);
    expect(verifyOwner(sid, "wrong-secret", ownerVerifier(sid, secret))).toBe(false);
  });
  it("rate keys differ from verifiers and never authorize", () => {
    const sid = newSessionId();
    const secret = newOwnerSecret();
    expect(ownerRateKey(secret)).not.toBe(ownerVerifier(sid, secret));
    expect(networkRateKey("203.0.113.9")).not.toBe(networkRateKey("203.0.113.10"));
  });
});
