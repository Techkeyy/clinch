import { describe, expect, it } from "vitest";
import { assembleBrief, driveLoop, parseIntentFlow } from "../server/flow";
import { createTimingReporter, timedStage } from "../server/timing";

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ code: "00000", msg: "ok", data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const fixtureFetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("/tickers?category=SPOT")) {
    return jsonResponse([{
      category: "SPOT", symbol: "RNVDAUSDT", ts: String(Date.now()),
      lastPrice: "100", openPrice24h: "98", highPrice24h: "102", lowPrice24h: "97",
      ask1Price: "101", bid1Price: "99", bid1Size: "2", ask1Size: "2",
      price24hPcnt: "0.02", volume24h: "1000", turnover24h: "100000",
    }]);
  }
  if (url.includes("/candles?")) {
    const candles = Array.from({ length: 20 }, (_, index) => [
      String(Date.now() - (19 - index) * 60_000), "100", "101", "99", "100", "10", "1000",
    ]);
    return jsonResponse(candles);
  }
  if (url.includes("/orderbook?")) {
    return jsonResponse({ a: [[101, 2]], b: [[99, 2]], ts: String(Date.now()) });
  }
  throw new Error("Unexpected fixture URL: " + url);
}) as typeof fetch;

const completeState = {
  intent: {
    asset: "NVDA", resolvedSymbol: "RNVDAUSDT", action: "enter-now" as const,
    timeframeContext: "today", decisionQuestion: "Should I enter NVDA?",
    clarificationNeeded: false, clarificationQuestion: null,
  },
  read: "enter-now",
  hingeHistory: [{
    hinge: "q-a-structure-direction", topic: "structure-direction",
    question: "Is this drift exhausted or a new leg down?",
    verdict: "exhaustion, support holding [exhaustion] :: read now enter-now",
  }],
  skips: [], uncertainty: [], terminal: "stopped" as const,
  terminalReasonCode: "NO_REMAINING_VALUE" as const,
  facts: { spot: { windowMovePcnt: 0.17, spreadBps: 2.4, spreadWide: false, supportLevel: 99, last: 100 } },
};

describe("P20 production reliability", () => {
  it("emits only non-secret stage timing and records timeout outcomes", async () => {
    const events: unknown[] = [];
    const timing = createTimingReporter((event) => events.push(event));
    await expect(timedStage(timing, "qwen-intent-flow", async () => {
      throw new Error("intent parse timed out");
    })).rejects.toThrow("timed out");
    expect(events).toEqual([
      { stage: "qwen-intent-flow", phase: "start" },
      expect.objectContaining({ stage: "qwen-intent-flow", phase: "end", outcome: "timeout" }),
    ]);
    expect(JSON.stringify(events)).not.toMatch(/api|key|database|cookie|secret|authorization/i);
  });

  it("falls back to a deterministic intent when the mandatory model operation times out", async () => {
    const model = {
      name: "test-timeout",
      parseIntent: async () => ({ ok: false as const, error: "intent parse timed out" }),
      polishBrief: async () => ({ ok: false as const, error: "brief polish timed out" }),
    };
    const intent = await parseIntentFlow("NVIDIA is drifting lower and I am considering a small entry. Should I wait?", model);
    expect(intent.asset).toBe("NVIDIA");
    expect(intent.action).toBe("wait");
  });

  it("renders the completed finding implication before any optional prose polish", () => {
    const slowOrFailedPolish = { polishBrief: async () => { throw new Error("provider unavailable"); } };
    const brief = assembleBrief(completeState, "RNVDAUSDT");
    expect(brief.read).toBe("Slightly favorable");
    expect(brief.decisionImplication.summary).toMatch(/supports the contemplated entry/i);
    expect(brief.decisionImplication.changeTriggers.length).toBeGreaterThan(0);
    expect(slowOrFailedPolish).toBeDefined();
  });

  it("streams Hinge, research, finding, and deliberate STOP in order while persisting one research step", async () => {
    const events: { type: string; data: unknown }[] = [];
    const persisted: { kind: string; family: string | null }[] = [];
    const result = await driveLoop("reliability", {
      asset: "NVDA", spotSymbol: "RNVDAUSDT", perpSymbol: null, action: "wait",
      read: "undecided", resolvedTopics: ["structure-direction"],
      facts: { spot: { windowMovePcnt: 2.1, spreadWide: true, topBidSize: 2, topAskSize: 2 } },
      data: { "spot-structure": "fresh", "perp-positioning": "missing" }, context: "", known: [],
    }, {
      store: {} as never,
      fetchImpl: fixtureFetch,
      onEvent: (event) => events.push(event),
      persistStep: async (kind, family) => { persisted.push({ kind, family }); },
    });
    const types = events.map((event) => event.type);
    expect(result.terminal).toBe("stopped");
    expect(types.indexOf("hinge")).toBeGreaterThanOrEqual(0);
    expect(types.indexOf("research")).toBeGreaterThan(types.indexOf("hinge"));
    expect(types.indexOf("finding")).toBeGreaterThan(types.indexOf("research"));
    expect(types.indexOf("stop")).toBeGreaterThan(types.indexOf("finding"));
    expect(persisted.filter((step) => step.kind === "research")).toHaveLength(1);
  });

  it("preserves a completed deterministic brief when the optional provider fails", () => {
    const brief = assembleBrief(completeState, "RNVDAUSDT");
    expect(brief.findings).toHaveLength(1);
    expect(brief.decisionImplication.supportiveEvidence.join(" ")).toMatch(/higher/i);
    expect(brief.decisionImplication.contextEvidence.join(" ")).toMatch(/close together|ranging/i);
    expect(brief.terminalStatus).toBe("stopped");
  });

  it("keeps unresolved terminal semantics truthful", () => {
    const brief = assembleBrief({
      ...completeState,
      read: "cannot-resolve",
      hingeHistory: [],
      terminal: "unresolved",
      terminalReasonCode: "NO_ANSWERABLE_HINGE",
      uncertainty: ["The required supported path is unavailable."],
    }, "RNVDAUSDT");
    expect(brief.read).toBe("Not enough evidence yet");
    expect(brief.decisionImplication.summary).toMatch(/does not answer/i);
    expect(brief.decisionImplication.changeTriggers.length).toBeGreaterThan(0);
  });
});
