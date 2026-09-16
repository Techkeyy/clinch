import { describe, expect, it } from "vitest";
import { FEATURED_BRAND_ASSET_DECISIONS, OFFICIAL_ASSET_FALLBACK_KEYS } from "@/lib/brand-assets";

describe("featured company asset provenance", () => {
  it("records every requested featured issuer exactly once", () => {
    expect(FEATURED_BRAND_ASSET_DECISIONS.map((decision) => decision.logoKey)).toEqual([
      "nvidia", "apple", "tesla", "amazon", "microsoft", "google", "meta", "amd",
    ]);
    expect(new Set(FEATURED_BRAND_ASSET_DECISIONS.map((decision) => decision.logoKey)).size).toBe(8);
  });

  it("uses neutral fallbacks when official permission is not established", () => {
    expect(OFFICIAL_ASSET_FALLBACK_KEYS.size).toBe(8);
    for (const decision of FEATURED_BRAND_ASSET_DECISIONS) {
      expect(decision.localOutcome).toBe("neutral-fallback");
      expect(decision.officialSourceUrl).toMatch(/^https:\/\/.+/);
      expect(decision.assetFilename).not.toMatch(/bundled|local file/i);
      expect(decision.redistributionReferenceUse).toMatch(/not|do not/i);
    }
  });
});
