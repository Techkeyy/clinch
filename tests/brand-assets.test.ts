import { describe, expect, it } from "vitest";
import { FEATURED_BRAND_ASSET_DECISIONS, FEATURED_BRAND_MARK_KEYS } from "@/lib/brand-assets";

describe("featured company asset provenance", () => {
  it("records every requested featured issuer exactly once", () => {
    expect(FEATURED_BRAND_ASSET_DECISIONS.map((decision) => decision.logoKey)).toEqual([
      "nvidia", "apple", "tesla", "amazon", "microsoft", "google", "meta", "amd",
    ]);
    expect(new Set(FEATURED_BRAND_ASSET_DECISIONS.map((decision) => decision.logoKey)).size).toBe(8);
  });

  it("records package-backed marks and honest attribution for every featured issuer", () => {
    expect(FEATURED_BRAND_MARK_KEYS.size).toBe(8);
    for (const decision of FEATURED_BRAND_ASSET_DECISIONS) {
      expect(decision.localOutcome).toBe("package-backed");
      expect(["Simple Icons", "Font Awesome Free Brands"]).toContain(decision.packageName);
      expect(decision.packageSourceUrl).toMatch(/^https:\/\/.+/);
      expect(decision.assetFilename).toMatch(/si[A-Z]|fa[A-Z]/);
      expect(decision.upstreamBrandOwner.length).toBeGreaterThan(0);
      expect(decision.packageLicense.length).toBeGreaterThan(0);
      expect(decision.redistributionReferenceUse).toMatch(/package|license|trademark/i);
      expect(decision.usageCondition).toMatch(/reference|affiliation|endorsement/i);
    }
  });
});
