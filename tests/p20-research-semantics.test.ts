import { describe, expect, it } from "vitest";
import { compileSemantics } from "../domain/semantics";
import { decide, initialState } from "../domain/kernel";
import { factsToRaw } from "../research/orchestrator";
import { assetIdentity, assembleBrief, capabilityData, driveLoop, parseIntentFlow } from "../server/flow";
import { stockFromRealityTicker } from "../lib/stocks";
import { deriveDecisionImplication } from "../server/interpretation";
import { unsupportedEvidenceReason } from "../domain/intent";

const ownerDilemma = "NVIDIA context: It has been drifting lower tonight and I am considering a small entry. Should I wait?";

describe("P20 owner research semantics", () => {
  it("keeps explicit wait-before-entry language as a wait decision", async () => {
    const intent = await parseIntentFlow(ownerDilemma, null);
    expect(intent.asset).toBe("NVIDIA");
    expect(intent.action).toBe("wait");
    expect(intent.decisionQuestion).toContain("Should I wait?");
  });

  it("normalizes bounded entry and exit language even when a model returns an unclear action", async () => {
    const model = {
      name: "test-qwen",
      parseIntent: async () => ({
        ok: true as const,
        value: {
          asset: "NVDA", resolvedSymbol: null, action: "unclear" as const,
          timeframeContext: "no timeframe stated", decisionQuestion: "Should I buy NVDA now?",
          clarificationNeeded: true, clarificationQuestion: "Please clarify",
        },
      }),
      polishBrief: async () => ({ ok: false as const, error: "unused" }),
    };
    const intent = await parseIntentFlow("Should I buy NVDA now?", model);
    expect(intent).toMatchObject({ asset: "NVDA", action: "enter-now", clarificationNeeded: false });
  });

  it("keeps the owner wording in one bounded semantic class", async () => {
    const cases = [
      ["NVIDIA (NVDA) context: Should I buy NVDA now?", "enter-now"],
      ["NVIDIA (NVDA) context: Should I enter now or wait?", "enter-now"],
      ["NVIDIA (NVDA) context: Is this a reasonable entry?", "enter-now"],
      ["NVIDIA (NVDA) context: Should I sell NVDA now?", "exit-now"],
    ] as const;
    for (const [text, action] of cases) {
      const intent = await parseIntentFlow(text, null);
      expect(intent.asset).toBe("NVDA");
      expect(intent.action).toBe(action);
      expect(intent.clarificationNeeded).toBe(false);
    }
    const ambiguous = await parseIntentFlow("NVIDIA (NVDA) context: What do you think about NVDA?", null);
    expect(ambiguous.action).toBe("unclear");
    expect(ambiguous.clarificationNeeded).toBe(true);
    expect(unsupportedEvidenceReason("NVIDIA (NVDA) context: What happened after the earnings announcement?")).toMatch(/no supported news or catalyst source/i);
  });

  it("opens direct entry timing on spot capability without requiring a special move", () => {
    const raw = factsToRaw({
      action: "enter-now", read: "undecided", asset: "NVDA", context: "",
      facts: {}, data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
      resolved: [], known: [],
    });
    const compiled = compileSemantics(raw);
    const output = decide(
      { id: "direct-entry", action: "enter-now", candidates: compiled.candidates },
      initialState("undecided", { "spot-structure": "fresh", "perp-positioning": "fresh" }),
    );
    expect(compiled.candidates.some((candidate) => candidate.topic === "structure-direction")).toBe(true);
    expect(output.action).toBe("RESEARCH");
    expect(output.family).toBe("spot-structure");
  });

  it("uses perp positioning selectively when it is the only capable family", () => {
    const raw = factsToRaw({
      action: "wait", read: "undecided", asset: "NVDA", context: "",
      facts: { perp: { fundingRate: 0.0001 } },
      data: { "spot-structure": "missing", "perp-positioning": "fresh" },
      resolved: [], known: [],
    });
    const compiled = compileSemantics(raw);
    const output = decide(
      { id: "perp-only-entry", action: "wait", candidates: compiled.candidates },
      initialState("undecided", { "spot-structure": "missing", "perp-positioning": "fresh" }),
    );
    expect(output.action).toBe("RESEARCH");
    expect(output.family).toBe("perp-positioning");
    expect(output.hinge).toMatch(/crowd-timing/);
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
    expect(result.stopReason).toMatch(/No available research family can answer/i);
    expect(result.stopReason).not.toMatch(/NO-CAPABLE-FAMILY|flippable|compiler/i);
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
    expect(brief.changeTriggers[0]).toMatch(/supported market-structure|stabilizing|downside/i);
    expect(brief.changeTriggers[0]).not.toContain("Should I wait");
    expect(brief.decisionImplication.summary).toMatch(/does not answer/i);
    expect(brief.read).toBe("Cannot resolve");
  });

  it("derives a decision implication from observed evidence and the selected Hinge", () => {
    const brief = assembleBrief({
      intent: {
        asset: "NVDA",
        resolvedSymbol: "RNVDAUSDT",
        action: "wait",
        timeframeContext: "overnight",
        decisionQuestion: "Should I wait before entering NVIDIA?",
        clarificationNeeded: false,
        clarificationQuestion: null,
      },
      read: "enter-now",
      hingeHistory: [{
        hinge: "q-structure",
        topic: "structure-direction",
        question: "Is this drift exhausted or a new leg down?",
        verdict: "exhaustion, support holding [exhaustion] :: read now enter-now",
      }],
      skips: [],
      uncertainty: [],
      terminal: "stopped",
      terminalReasonCode: "NO_REMAINING_VALUE",
      facts: {
        spot: {
          windowMovePcnt: -1.33,
          spreadBps: 2.36,
          spreadWide: false,
          supportLevel: 208.93,
          resistanceLevel: 215.27,
        },
      },
    }, "RNVDAUSDT");
    expect(brief.read).toBe("Leaning in");
    expect(brief.decisionImplication.summary).toMatch(/supports the contemplated entry/i);
    expect(brief.decisionImplication.cautionEvidence.join(" ")).toMatch(/still lower/i);
    expect(brief.decisionImplication.supportiveEvidence.join(" ")).toMatch(/tight at 2.4/i);
    expect(brief.decisionImplication.changeTriggers.join(" ")).toMatch(/208.93/);
    expect(JSON.stringify(brief.decisionImplication)).not.toMatch(/change24hPcnt|spreadBps|windowCandles|bidSize|askSize/);
  });

  it("never leaves a terminal stopped brief at Still evaluating", () => {
    const brief = assembleBrief({
      intent: null,
      read: "undecided",
      hingeHistory: [],
      skips: [],
      uncertainty: [],
      terminal: "stopped",
      terminalReasonCode: "NO_REMAINING_VALUE",
    }, null);
    expect(brief.read).toBe("Cannot resolve");
    expect(brief.decisionImplication.summary).toMatch(/does not answer/i);
  });

  it("keeps unresolved interpretation honest when no normalized evidence exists", () => {
    const implication = deriveDecisionImplication({
      intent: null,
      read: "cannot-resolve",
      terminal: "unresolved",
      hingeHistory: [{ topic: "structure-direction", question: "Is the move stabilizing?" }],
      facts: {},
      uncertainty: ["The market check was unavailable."],
    });
    expect(implication.supportiveEvidence).toEqual([]);
    expect(implication.cautionEvidence.join(" ")).toMatch(/did not produce/i);
    expect(implication.changeTriggers.join(" ")).toMatch(/stabilizing/i);
    expect(implication.summary).toMatch(/does not answer/i);
  });

  it("returns a precise unresolved terminal for an unsupported news capability", async () => {
    const emitted: { type: string; data: unknown }[] = [];
    const result = await driveLoop("unsupported-news", {
      asset: "NVDA", spotSymbol: "RNVDAUSDT", perpSymbol: null, action: "unclear",
      read: "undecided", resolvedTopics: [], facts: {},
      data: { "spot-structure": "fresh", "perp-positioning": "missing" },
      context: "", known: [],
      unsupportedReason: "CLINCH can establish live market context for NVDA, but it has no supported news or catalyst source to answer that question.",
    }, {
      store: {} as never,
      onEvent: (event) => emitted.push(event),
      persistStep: async () => {},
    });
    expect(result.terminal).toBe("unresolved");
    expect(result.terminalReasonCode).toBe("NO_ANSWERABLE_HINGE");
    expect(result.stopReason).toMatch(/no supported news or catalyst source/i);
    expect(emitted.some((event) => event.type === "research")).toBe(false);
  });
});
