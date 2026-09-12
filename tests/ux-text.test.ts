import { describe, expect, it } from "vitest";
import { TOPIC_WHY, TOPIC_CHANGES, summarizeSpotFinding, summarizePerpFinding, cleanVerdict, userStopReason } from "../server/ux-text";

const LONG_DASH = /[\u2013\u2014]/;
const JARGON = /flippable|answerable by|Hinge #|Agent Step|relevance score|Low relevance/;

describe("user-facing presentation text", () => {
  it("contains no long dashes and no kernel jargon", () => {
    const texts = [...Object.values(TOPIC_WHY), ...Object.values(TOPIC_CHANGES),
      summarizeSpotFinding("RNVDAUSDT", { last: 218.24, change24hPcnt: -0.00086, spreadBps: 1.37, spreadWide: false }),
      summarizePerpFinding("NVDAUSDT", { fundingRate: 0.0012, openInterest: 70316, markIndexDislocationBps: 2.1 }),
      cleanVerdict("exhaustion, support holding [exhaustion] :: read now enter-now"),
      userStopReason("anything", true)];
    for (const t of texts) {
      expect(t, t).not.toMatch(LONG_DASH);
      expect(t, t).not.toMatch(JARGON);
    }
  });
  it("strips machine verdict tails", () => {
    expect(cleanVerdict("thin print [thin-artifact] :: read now wait")).toBe("thin print.");
  });
  it("summarizes both families in plain money language", () => {
    const s = summarizeSpotFinding("RNVDAUSDT", { last: 218.24, change24hPcnt: -0.00086, spreadBps: 1.37, spreadWide: false });
    expect(s).toMatch(/RNVDAUSDT trades 218\.24/);
    const p = summarizePerpFinding("NVDAUSDT", { fundingRate: 0.0012, openInterest: 70316, markIndexDislocationBps: 2.1 });
    expect(p).toMatch(/elevated/);
  });
});
