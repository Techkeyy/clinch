import { describe, expect, it } from "vitest";
import { compileSemantics } from "../domain/semantics";
import { decide, initialState } from "../domain/kernel";
import { factsToRaw } from "../research/orchestrator";
import { assetIdentity, assembleBrief, capabilityData, driveLoop, parseIntentFlow } from "../server/flow";
import { stockFromRealityTicker } from "../lib/stocks";

const ownerDilemma = "NVIDIA context: It has been drifting lower tonight and I am considering a small entry. Should I wait?";

describe("P20 owner research semantics", () => {
  it("keeps explicit wait-before-entry language as a wait decision", async () => {
    const intent = await parseIntentFlow(ownerDilemma, null);
    expect(intent.asset).toBe("NVIDIA");
    expect(intent.action).toBe("wait");
    expect(intent.decisionQuestion).toContain("Should I wait?");
  });

  it("maps NVIDIA to normal, Reality, and optional RWA perp identity", () => {
    const stock = stockFromRealityTicker("RNVDAUSDT", "NVDAUSDT");
    expect(stock).toMatchObject({
      companyName: "NVIDIA",
      ticker: "NVDA",
      realityTicker: "RNVDAUSDT",
      perpTicker: "NVDAUSDT",
    });
    expect(stock?.markKind).toBe("verified");
  });

  it("selects a capable spot hinge for the owner wait scenario", () => {
    const raw = factsToRaw({
      action: "wait",
      read: "undecided",
      asset: "NVDA",
      context: "overnight",
      facts: {
        spot: { spreadWide: true, topBidSize: 0.5, topAskSize: 0.4, windowMovePcnt: -2.1 },
        perp: { fundingRate: 0.0004 },
      },
      data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
      resolved: [],
      known: [],
    });
    const compiled = compileSemantics(raw);
    const output = decide(
      { id: "owner-nvda-wait", action: "wait", candidates: compiled.candidates },
      initialState("undecided", { "spot-structure": "fresh", "perp-positioning": "fresh" }),
    );
    expect(output.action).toBe("RESEARCH");
    expect(output.family).toBe("spot-structure");
    expect(output.hinge).toMatch(/move-reality|structure-direction/);
    expect(output.why).not.toContain("NO-CAPABLE-FAMILY");
    expect(output.why).not.toContain("no-capable-family");
  });

  it("derives capability from resolved instruments instead of optimistic flags", () => {
    expect(capabilityData("RNVDAUSDT", "NVDAUSDT")).toEqual({
      "spot-structure": "fresh",
      "perp-positioning": "fresh",
    });
    expect(capabilityData("RXYZUSDT", null)).toEqual({
      "spot-structure": "fresh",
      "perp-positioning": "missing",
    });
    expect(assetIdentity({
      spot: "RNVDAUSDT", perp: "NVDAUSDT", ticker: "NVDA", companyName: "NVIDIA", universe: 1173,
    })).toEqual({
      companyName: "NVIDIA", normalTicker: "NVDA", realityTicker: "RNVDAUSDT", perpSymbol: "NVDAUSDT", universe: 1173,
    });
  });

  it("returns an explicit unresolved terminal for a true no-capable-family case", async () => {
    const emitted: { type: string; data: unknown }[] = [];
    const persisted: unknown[] = [];
    const result = await driveLoop("no-capable", {
      asset: "RXYZ",
      spotSymbol: "RXYZUSDT",
      perpSymbol: null,
      action: "wait",
      read: "undecided",
      resolvedTopics: [],
      facts: {},
      data: { "spot-structure": "missing", "perp-positioning": "missing" },
      context: "",
      known: [],
    }, {
      store: {} as never,
      onEvent: (event) => emitted.push(event),
      persistStep: async (...args) => { persisted.push(args); },
    });
    expect(result.terminal).toBe("unresolved");
    expect(result.terminalReasonCode).toBe("NO_CAPABLE_FAMILY");
    expect(result.stopReason).toMatch(/supported research paths can answer/);
    expect(result.stopReason).not.toMatch(/NO-CAPABLE-FAMILY|flippable|compiler|family/i);
    expect(emitted.find((event) => event.type === "stop")).toMatchObject({
      data: { cannotResolve: true, terminal: "unresolved", reasonCode: "NO_CAPABLE_FAMILY" },
    });
    expect(persisted.length).toBeGreaterThan(0);
  });

  it("keeps deliberate STOP distinct from unresolved", async () => {
    const result = await driveLoop("stopped", {
      asset: "NVDA",
      spotSymbol: "RNVDAUSDT",
      perpSymbol: "NVDAUSDT",
      action: "enter-now",
      read: "enter-now",
      resolvedTopics: ["structure-direction"],
      facts: {},
      data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
      context: "",
      known: [],
      hingeHistory: [{
        hinge: "q-a-structure-direction",
        topic: "structure-direction",
        question: "Is this drift exhausted or a new leg down?",
        verdict: "exhaustion, support holding [exhaustion] :: read now enter-now",
      }],
    }, {
      store: {} as never,
      onEvent: () => {},
      persistStep: async () => {},
    });
    expect(result.terminal).toBe("stopped");
    expect(result.terminalReasonCode).toBe("NO_REMAINING_VALUE");
    expect(result.stopReason).toContain("answered the relevant research question");
  });

  it("assembles a useful unresolved brief without internal kernel language", () => {
    const brief = assembleBrief({
      intent: {
        asset: "NVDA",
        resolvedSymbol: "RNVDAUSDT",
        action: "wait",
        timeframeContext: "overnight",
        decisionQuestion: ownerDilemma,
        clarificationNeeded: false,
        clarificationQuestion: null,
      },
      read: "cannot-resolve",
      hingeHistory: [],
      skips: [],
      uncertainty: ["The required supported path is unavailable."],
      terminal: "unresolved",
      terminalReasonCode: "NO_CAPABLE_FAMILY",
    }, "RNVDAUSDT");
    const text = JSON.stringify(brief);
    expect(brief.decision).toBe("Considering whether to wait before entering NVDA.");
    expect(brief.read).toBe("Cannot resolve");
    expect(brief.completed).toEqual([]);
    expect(brief.why).not.toContain("No research completed");
    expect(text).not.toMatch(/NO-CAPABLE-FAMILY|no-capable-family|flippable|compiler|family eligibility/i);
    expect(brief.changeTriggers[0]).toMatch(/supported research path/i);
  });
});
