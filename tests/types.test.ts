import { describe, expect, it } from "vitest";
import {
  ContemplatedAction, CurrentRead, DilemmaInput, IntentContract, NoData,
  NegativeEvidence, Freshness, Provenance, ResearchFamily, IdempotencyKey,
} from "../domain/types";

describe("domain schema foundation", () => {
  it("accepts a normal dilemma and rejects empty/oversized text", () => {
    expect(DilemmaInput.safeParse({ dilemma: "rNVDA is dipping, buy?" }).success).toBe(true);
    expect(DilemmaInput.safeParse({ dilemma: "x" }).success).toBe(false);
    expect(DilemmaInput.safeParse({ dilemma: "y".repeat(2001) }).success).toBe(false);
  });
  it("bounds contemplated actions (no invented execution actions)", () => {
    expect(ContemplatedAction.safeParse("enter-now").success).toBe(true);
    expect(ContemplatedAction.safeParse("buy-at-market").success).toBe(false);
    expect(CurrentRead.safeParse("holding-off").success).toBe(true);
  });
  it("extracts lowercase rToken mentions and dip-buy intent", async () => {
    const { extractIntent } = await import("../domain/intent");
    const r = extractIntent("rNVDA fell hard after the close. I am thinking of buying the dip. Real opportunity or wait?");
    expect(r.assetMention).toBe("RNVDA");
    expect(r.action).toBe("enter-now");
    expect(r.clarificationNeeded).toBe(false);
    const plain = extractIntent("What do you think about markets?");
    expect(plain.assetMention).toBeNull();
    expect(plain.action).toBe("unclear");
    expect(plain.clarificationNeeded).toBe(true);
  });
  it("restricts research families to the two proven ones", () => {
    expect(ResearchFamily.safeParse("spot-structure").success).toBe(true);
    expect(ResearchFamily.safeParse("perp-positioning").success).toBe(true);
    expect(ResearchFamily.safeParse("news-briefing").success).toBe(false);
  });
  it("keeps no-data and negative evidence as distinct types", () => {
    const missing = NoData.parse({ kind: "no-data", reason: "orderbook unavailable" });
    const negative = NegativeEvidence.parse({ kind: "negative", detail: "book healthy, no imbalance" });
    expect(missing.kind).not.toBe(negative.kind);
  });
  it("requires freshness and provenance metadata shapes", () => {
    expect(
      Freshness.safeParse({ source: "bitget-reality", symbol: "RNVDAUSDT", observedAt: "2026-09-12T00:00:00Z", sourceTimestamp: null, fetchedAt: "2026-09-12T00:00:01Z", ageMs: null, status: "missing" }).success,
    ).toBe(true);
    expect(
      Provenance.safeParse({ endpointFamily: "v3-ticker", symbol: "RNVDAUSDT", evidenceType: "ticker", sourceTimestamp: "2026-09-12T00:00:00Z", fetchedAt: "2026-09-12T00:00:01Z" }).success,
    ).toBe(true);
  });
  it("validates idempotency keys and the intent contract", () => {
    expect(IdempotencyKey.safeParse("abcDEF123-_4567890").success).toBe(true);
    expect(IdempotencyKey.safeParse("short").success).toBe(false);
    expect(
      IntentContract.safeParse({ asset: "RNVDA", resolvedSymbol: "RNVDAUSDT", action: "enter-now", timeframeContext: "off-hours", decisionQuestion: "buy the dip?", clarificationNeeded: false, clarificationQuestion: null }).success,
    ).toBe(true);
  });
});
