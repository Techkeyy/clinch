import { describe, expect, it } from "vitest";
import { resolveAccountControlState } from "@/lib/account-control";
import { clerkMiddlewareOptions, config } from "@/proxy";

describe("account control auth states", () => {
  it("shows the signed-out control once Clerk is loaded", () => {
    expect(resolveAccountControlState({ enabled: true, isLoaded: true, isSignedIn: false, timedOut: false })).toBe("signed-out");
  });

  it("shows the account control for an authenticated user", () => {
    expect(resolveAccountControlState({ enabled: true, isLoaded: true, isSignedIn: true, timedOut: false })).toBe("signed-in");
  });

  it("keeps loading separate from signed-out while Clerk initializes", () => {
    expect(resolveAccountControlState({ enabled: true, isLoaded: false, isSignedIn: undefined, timedOut: false })).toBe("loading");
  });

  it("surfaces a retry state when Clerk cannot initialize", () => {
    expect(resolveAccountControlState({ enabled: true, isLoaded: false, isSignedIn: undefined, timedOut: true })).toBe("unavailable");
  });

  it("keeps guest mode disabled when Clerk is not configured", () => {
    expect(resolveAccountControlState({ enabled: false, isLoaded: false, isSignedIn: undefined, timedOut: false })).toBe("disabled");
  });
});

describe("Clerk production proxy configuration", () => {
  it("uses the production authorized party and built-in proxy", () => {
    expect(clerkMiddlewareOptions.authorizedParties).toEqual(["https://clinch-nine.vercel.app"]);
    expect(clerkMiddlewareOptions.frontendApiProxy).toEqual({ enabled: true });
  });

  it("matches the Clerk proxy route and existing application/API routes", () => {
    expect(config.matcher).toContain("/__clerk/(.*)");
    expect(config.matcher).toContain("/(api|trpc)(.*)");
  });
});
