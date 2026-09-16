import { describe, expect, it } from "vitest";
import { compileSemantics } from "../domain/semantics";
import { decide, initialState } from "../domain/kernel";
import { classifyFinding, factsToRaw } from "../research/orchestrator";
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
    expect(stock?.markKind).toBe("catalogued");
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

  it("distinguishes an answerable Hinge with inconclusive completed research", async () => {
    const emitted: { type: string; data: unknown }[] = [];
    const persisted: { kind: string; family: string | null; summary: unknown }[] = [];
    const ticker = {
      code: "00000", msg: "ok",
      data: [{
        category: "SPOT", symbol: "RNVDAUSDT", ts: "1789167738062",
        lastPrice: "219.50", openPrice24h: "218.439", highPrice24h: "220.01",
        lowPrice24h: "218.05", ask1Price: "219.50", bid1Price: "219.48",
        bid1Size: "481", ask1Size: "50", price24hPcnt: "-0.00091",
        volume24h: "50132984.0882", turnover24h: "10970250216.8368",
      }],
    };
    const candles = {
      code: "00000", msg: "success",
      data: [
        ["1789135200000", "221.62", "222", "219.3", "219.47", "17293322.898607", "3819018733.558667538"],
        ["1789138800000", "219.4299", "220.575", "219.3616", "219.685", "9599350.251405", "2111323326.7473678796"],
        ["1789142400000", "219.68", "219.9699", "218.65", "219.105", "7384733.661676", "1619322972.0067763984"],
      ],
    };
    const fetchImpl = (async (url: string) => {
      if (url.includes("/tickers?")) return { status: 200, json: async () => ticker };
      if (url.includes("/candles?")) return { status: 200, json: async () => candles };
      return { status: 200, json: async () => ({ code: "40404", msg: "Request URL NOT FOUND" }) };
    }) as unknown as typeof fetch;
    const result = await driveLoop("inconclusive", {
      asset: "NVDA", spotSymbol: "RNVDAUSDT", perpSymbol: "NVDAUSDT",
      action: "wait", read: "undecided", resolvedTopics: [],
      facts: {
        spot: { last: 355.85, windowMovePcnt: -1.04, spreadBps: 2.81, spreadWide: false, supportLevel: 354.05, resistanceLevel: 362.39 },
      },
      data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
      context: "overnight", known: [],
    }, {
      store: {} as never,
      fetchImpl,
      onEvent: (event) => emitted.push(event),
      persistStep: async (kind, family, summary) => { persisted.push({ kind, family, summary }); },
    });
    expect(result.terminal).toBe("unresolved");
    expect(result.terminalReasonCode).toBe("INCONCLUSIVE_EVIDENCE");
    expect(result.hingeHistory).toHaveLength(1);
    expect(result.hingeHistory[0]?.topic).toBe("structure-direction");
    expect(persisted.some((step) => step.kind === "research" && step.family === "spot-structure")).toBe(true);
    expect(emitted.some((event) => event.type === "research")).toBe(true);
    expect(result.skips.find((skip) => skip.check === "perp-positioning")?.reason).toMatch(/unlikely to answer whether the recent price drop had stabilized/i);
    expect(result.stopReason).toMatch(/not provide enough directional evidence/i);
    const brief = assembleBrief({
      intent: {
        asset: "NVDA", resolvedSymbol: "RNVDAUSDT", action: "wait",
        timeframeContext: "overnight", decisionQuestion: "Should I wait before entering NVDA?",
        clarificationNeeded: false, clarificationQuestion: null,
      },
      read: result.read,
      hingeHistory: result.hingeHistory,
      skips: result.skips,
      uncertainty: result.uncertainty,
      terminal: result.terminal!,
      terminalReasonCode: result.terminalReasonCode!,
      facts: result.facts,
    }, "RNVDAUSDT");
    expect(brief.terminalReasonCode).toBe("INCONCLUSIVE_EVIDENCE");
    expect(brief.completed).toHaveLength(1);
    expect(brief.skipped[0]?.reason).toMatch(/unlikely to answer whether the recent price drop had stabilized/i);
    expect(brief.why).toMatch(/not provide enough directional evidence/i);
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
    expect(brief.read).toBe("Not enough evidence yet");
    expect(brief.completed).toEqual([]);
    expect(brief.why).not.toContain("No research completed");
    expect(text).not.toMatch(/NO-CAPABLE-FAMILY|no-capable-family|flippable|compiler|family eligibility/i);
    expect(brief.changeTriggers[0]).toMatch(/supported market-structure|stabilizing|downside/i);
    expect(brief.changeTriggers[0]).not.toContain("Should I wait");
    expect(brief.decisionImplication.summary).toMatch(/does not answer/i);
    expect(brief.read).toBe("Not enough evidence yet");
  });

  it("derives a directionally supported implication from observed evidence and the selected Hinge", () => {
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
          windowMovePcnt: 0.17,
          spreadBps: 2.36,
          spreadWide: false,
          supportLevel: 208.93,
          resistanceLevel: 215.27,
        },
      },
    }, "RNVDAUSDT");
    expect(brief.read).toBe("Slightly favorable");
    expect(brief.decisionImplication.summary).toMatch(/supports the contemplated entry/i);
    expect(brief.decisionImplication.supportiveEvidence.join(" ")).toMatch(/higher by 0.17/i);
    expect(brief.decisionImplication.contextEvidence.join(" ")).toMatch(/close together|ranging/i);
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
    expect(brief.read).toBe("Not enough evidence yet");
    expect(brief.decisionImplication.summary).toMatch(/does not answer/i);
  });

  it("keeps baseline-only positioning out of a one-family stopped interpretation", () => {
    const brief = assembleBrief({
      intent: {
        asset: "NVDA", resolvedSymbol: "RNVDAUSDT", action: "enter-now",
        timeframeContext: "now", decisionQuestion: "Should I buy NVDA now?",
        clarificationNeeded: false, clarificationQuestion: null,
      },
      read: "enter-now",
      hingeHistory: [{
        hinge: "q-structure", topic: "structure-direction",
        question: "Is this drift exhausted or a new leg down?",
        verdict: "exhaustion, support holding [exhaustion] :: read now enter-now",
      }],
      skips: [{
        check: "perp-positioning",
        reason: "The selected Hinge did not require this family to establish the current read.",
        kind: "resolved",
      }],
      uncertainty: [],
      terminal: "stopped",
      terminalReasonCode: "NO_REMAINING_VALUE",
      facts: {
        spot: {
          last: 212.74, movePct24h: 0.0032, windowMovePcnt: 0.17, spreadBps: 4.7, spreadWide: false,
          supportLevel: 210.29, resistanceLevel: 212.96,
        },
        perp: { fundingRate: 0.0001, openInterest: 123456, markIndexDislocationBps: 18 },
      },
    }, "RNVDAUSDT");
    const interpretation = [
      ...brief.decisionImplication.supportiveEvidence,
      ...brief.decisionImplication.cautionEvidence,
      ...brief.decisionImplication.contextEvidence,
      ...brief.decisionImplication.changeTriggers,
    ].join(" ");
    expect(interpretation).not.toMatch(/funding|open interest|perp|dislocation|index/i);
    expect(interpretation).toMatch(/0\.17|close together|ranging/i);
    expect(brief.findings.join(" ")).not.toMatch(/exhaustion|support holding/i);
    expect(brief.why).toMatch(/0\.17|210\.29|212\.96|4\.7/);
    expect(brief.why).not.toMatch(/exhaustion|support holding/i);
    expect(brief.decisionImplication.changeTriggers.join(" ")).toMatch(/support/i);
    expect(brief.decisionImplication.changeTriggers.join(" ")).not.toMatch(/funding|open interest|perp|dislocation/i);
    expect(brief.decisionImplication.unresolvedPoint).toMatch(/remaining|stabilization|support/i);
    expect(brief.decisionImplication.unresolvedPoint).not.toMatch(/Is this drift exhausted/i);
    expect(brief.skipped.some((skip) => skip.check === "perp-positioning")).toBe(true);
    expect(brief.futureRechecks.join(" ")).toMatch(/funding|positioning|dislocation/i);
  });

  it("includes a positioning family only after that family completes", () => {
    const brief = assembleBrief({
      intent: {
        asset: "NVDA", resolvedSymbol: "RNVDAUSDT", action: "enter-now",
        timeframeContext: "now", decisionQuestion: "Should I buy NVDA now?",
        clarificationNeeded: false, clarificationQuestion: null,
      },
      read: "enter-now",
      hingeHistory: [
        { hinge: "q-structure", topic: "structure-direction", question: "Is structure holding?", verdict: "spot branch" },
        { hinge: "q-crowd", topic: "crowd-timing", question: "Is positioning crowded?", verdict: "perp branch" },
      ],
      skips: [], uncertainty: [], terminal: "stopped", terminalReasonCode: "NO_REMAINING_VALUE",
      facts: {
        spot: { last: 212.74, windowMovePcnt: 0.17, spreadBps: 4.7, spreadWide: false, supportLevel: 210.29, resistanceLevel: 212.96 },
        perp: { fundingRate: 0.0012, openInterest: 123456, markIndexDislocationBps: 18 },
      },
    }, "RNVDAUSDT");
    expect(brief.findings.join(" ")).toMatch(/recent window|funding/i);
    expect(brief.decisionImplication.cautionEvidence.join(" ")).toMatch(/crowded|positioning/i);
    expect(brief.decisionImplication.changeTriggers.join(" ")).toMatch(/funding|positioning|gap|dislocation/i);
    expect(brief.futureRechecks).toEqual([]);
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

  it("does not turn a lower move plus normal spread and a visible range into a favorable read", () => {
    const facts = {
      spot: { last: 355.85, windowMovePcnt: -1.04, spreadBps: 2.81, spreadWide: false, supportLevel: 354.05, resistanceLevel: 362.39 },
    };
    expect(classifyFinding("structure-direction", facts)).toBeNull();
    const implication = deriveDecisionImplication({
      intent: null, read: "undecided", terminal: "unresolved",
      hingeHistory: [{ topic: "structure-direction", question: "Has the recent drop started stabilizing?" }],
      facts, uncertainty: ["The selected market check did not resolve the decision question."],
    });
    expect(implication.supportiveEvidence).toEqual([]);
    expect(implication.cautionEvidence.join(" ")).toMatch(/lower/i);
    expect(implication.contextEvidence.join(" ")).toMatch(/close together|ranging/i);
  });

  it("allows a genuine positive structural signal to remain favorable", () => {
    const facts = { spot: { last: 212.74, windowMovePcnt: 0.17, spreadWide: false, supportLevel: 210.29, resistanceLevel: 212.96 } };
    expect(classifyFinding("structure-direction", facts)).toContain("[exhaustion]");
    const implication = deriveDecisionImplication({
      intent: { asset: "NVDA", resolvedSymbol: "RNVDAUSDT", action: "enter-now", timeframeContext: "now", decisionQuestion: "Should I enter NVDA now?", clarificationNeeded: false, clarificationQuestion: null },
      read: "enter-now", terminal: "stopped",
      hingeHistory: [{ topic: "structure-direction", question: "Has the recent move started stabilizing?" }],
      facts, uncertainty: [],
    });
    expect(implication.supportiveEvidence.join(" ")).toMatch(/higher by 0.17/i);
  });

  it("keeps mixed directional and crowd evidence cautious", () => {
    const implication = deriveDecisionImplication({
      intent: null, read: "wait", terminal: "stopped",
      hingeHistory: [{ topic: "structure-direction" }, { topic: "crowd-timing" }],
      facts: {
        spot: { windowMovePcnt: 0.17, spreadWide: false, supportLevel: 210, resistanceLevel: 213 },
        perp: { fundingRate: 0.0012 },
      },
      uncertainty: [],
    });
    expect(implication.supportiveEvidence.join(" ")).toMatch(/higher/i);
    expect(implication.cautionEvidence.join(" ")).toMatch(/crowded/i);
  });

  it("preserves Better to wait and Not enough evidence yet as distinct non-favorable reads", () => {
    const waiting = assembleBrief({
      intent: null, read: "wait", hingeHistory: [], skips: [], uncertainty: [],
      terminal: "stopped", terminalReasonCode: "NO_REMAINING_VALUE",
    }, null);
    const unresolved = assembleBrief({
      intent: null, read: "cannot-resolve", hingeHistory: [], skips: [],
      uncertainty: ["No supported path was available."], terminal: "unresolved", terminalReasonCode: "NO_CAPABLE_FAMILY",
    }, null);
    expect(waiting.read).toBe("Better to wait");
    expect(unresolved.read).toBe("Not enough evidence yet");
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
