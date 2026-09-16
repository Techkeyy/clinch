import { describe, expect, it } from "vitest";
import { decisionWatchEligibility } from "@/lib/watch-ui";

describe("Decision Watch result eligibility", () => {
  it("marks an already favorable result as target-reached and ineligible", () => {
    expect(decisionWatchEligibility("Slightly favorable")).toBe("target-reached");
  });

  it("keeps a wait result eligible for monitoring", () => {
    expect(decisionWatchEligibility("Better to wait")).toBe("eligible");
  });

  it("keeps an unresolved result eligible for monitoring", () => {
    expect(decisionWatchEligibility("Not enough evidence yet")).toBe("eligible");
  });
});
