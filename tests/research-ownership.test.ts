import { describe, expect, it } from "vitest";
import { resolveResearchSurfaceState } from "@/lib/research-ownership";

describe("research ownership surface states", () => {
  it("keeps ownership loading separate from an authenticated state", () => {
    expect(resolveResearchSurfaceState({ isSignedIn: true, ownership: null })).toBe("loading");
  });

  it("identifies guest research for a signed-out visitor", () => {
    expect(resolveResearchSurfaceState({ isSignedIn: false, ownership: "guest" })).toBe("guest-guest");
  });

  it("identifies guest-owned research that can be claimed", () => {
    expect(resolveResearchSurfaceState({ isSignedIn: true, ownership: "guest" })).toBe("signed-in-guest");
  });

  it("identifies account-owned research for the owning account", () => {
    expect(resolveResearchSurfaceState({ isSignedIn: true, ownership: "account" })).toBe("signed-in-account");
  });

  it("does not turn account-owned research into a guest sign-in prompt", () => {
    expect(resolveResearchSurfaceState({ isSignedIn: false, ownership: "account" })).toBe("signed-out-account");
  });
});
