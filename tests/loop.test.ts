import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { factsToRaw, needForTopic, classifyFinding, orchestratorStep } from "../research/orchestrator";

const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8"));
const TICKER = { code: "00000", msg: "ok", data: [fx("ticker-rnvda.json")] };
const WIDE_TICKER = {
  code: "00000", msg: "ok",
  data: [{ category: "SPOT", symbol: "RNVDAUSDT", ts: "1789167781492", lastPrice: "218.24", openPrice24h: "218.44", highPrice24h: "220.01", lowPrice24h: "218.05", ask1Price: "218.60", bid1Price: "218.00", bid1Size: "0.5", ask1Size: "0.4", price24hPcnt: "-0.00091", volume24h: "100.0", turnover24h: "21824.0" }],
};
const mockFetchFor = (routes: Record<string, unknown>) =>
  (async (url: string) => {
    for (const [key, body] of Object.entries(routes)) {
      if (url.includes(key)) return { status: 200, json: async () => body };
    }
    return { status: 200, json: async () => ({ code: "40404", msg: "Request URL NOT FOUND" }) };
  }) as unknown as typeof fetch;

describe("fact mapping and topic needs", () => {
  it("maps thin wide-spread spot to move-reality preconditions", () => {
    const raw = factsToRaw({
      action: "enter-now", read: "undecided", asset: "RNVDAUSDT", context: "off-hours",
      facts: { spot: { spreadWide: true, topBidSize: 0.5, topAskSize: 0.4, windowMovePcnt: 2.1 } },
      data: { "spot-structure": "fresh", "perp-positioning": "fresh" }, resolved: [], known: [],
    });
    expect(raw.spot.book).toBe("thin");
    expect(raw.spot.spread).toBe("wide");
  });
  it("maps extreme funding to elevated positioning facts", () => {
    const raw = factsToRaw({
      action: "enter-now", read: "undecided", asset: "RNVDAUSDT", context: "",
      facts: { perp: { fundingRate: 0.0012 } },
      data: { "spot-structure": "fresh", "perp-positioning": "fresh" }, resolved: [], known: [],
    });
    expect(raw.positioning.funding).toBe("extreme");
  });
  it("assigns minimal executor needs per topic", () => {
    expect(needForTopic("move-reality")?.family).toBe("spot-structure");
    expect(needForTopic("move-reality")?.spot).toContain("depth");
    expect(needForTopic("crowd-timing")?.family).toBe("perp-positioning");
    expect(needForTopic("nope")).toBeNull();
  });
  it("classifies findings conservatively (null when unclear)", () => {
    expect(classifyFinding("move-reality", { spot: { spreadWide: true } })).toMatch(/thin-artifact/);
    expect(classifyFinding("move-reality", {})).toBeNull();
    expect(classifyFinding("crowd-timing", { perp: { fundingRate: 0.0012 } })).toMatch(/crowded/);
    expect(classifyFinding("unknown-topic", {})).toBeNull();
  });
});

describe("model tiering and transport failures", () => {
  it("falls back to deterministic intent when the model path fails", async () => {
    const { parseIntentFlow } = await import("../server/flow");
    const failing = { name: "broken", parseIntent: async () => { throw new Error("down"); }, polishBrief: async () => ({ ok: false as const, error: "down" }) };
    const intent = await parseIntentFlow("rNVDA is dipping, should I buy?", failing);
    expect(intent.asset).toBe("RNVDA");
    expect(intent.action).toBe("enter-now");
  });
  it("maps transport timeouts to UPSTREAM_FAILURE, never to evidence", async () => {
    const hanging = ((url: string, init?: { signal?: AbortSignal }) => new Promise((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })) as unknown as typeof fetch;
    const { bitgetGet } = await import("../research/bitget/client");
    await expect(bitgetGet("https://api.bitget.com/api/v3/market/tickers?category=SPOT&symbol=RNVDAUSDT", "v3-ticker", 50, hanging)).rejects.toMatchObject({ code: "UPSTREAM_FAILURE" });
  });
  it("keeps the timeout active while a Bitget response body is consumed", async () => {
    const bodyHanging = (async (_url: string, init?: { signal?: AbortSignal }) => ({
      status: 200,
      json: () => new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    })) as unknown as typeof fetch;
    const { bitgetGet } = await import("../research/bitget/client");
    await expect(bitgetGet("https://api.bitget.com/api/v3/market/tickers?category=SPOT&symbol=RNVDAUSDT", "v3-ticker", 20, bodyHanging)).rejects.toMatchObject({ code: "UPSTREAM_FAILURE" });
  });
});
describe("orchestrator step with mocked Bitget", () => {
  it("researches a breakdown hinge and updates the read, with honest skips", async () => {
    const candles = { code: "00000", msg: "ok", data: [
      ["1789135200000", "221.62", "222.00", "219.30", "219.47", "17293322.0", "3819018733.0"],
      ["1789138800000", "219.43", "220.57", "219.36", "219.68", "9599350.0", "2111323326.0"],
      ["1789142400000", "219.68", "219.97", "218.65", "219.10", "7384733.0", "1619322972.0"],
      ["1789146000000", "219.11", "219.43", "218.40", "218.60", "5887266.0", "1290531655.0"],
      ["1789149600000", "218.60", "218.70", "218.10", "218.20", "6610618.0", "1451144945.0"],
    ] };
    const depth = { code: "00000", msg: "ok", data: { a: [["218.60", 0.4]], b: [["218.00", 0.5]], ts: "1789167781492" } };
    const fetchImpl = mockFetchFor({ "/tickers?": WIDE_TICKER, "/candles?": candles, "/orderbook?": depth });
    const persisted: unknown[] = [];
    const emitted: unknown[] = [];
    const { establishBaseline } = await import("../research/orchestrator");
    // Production order: baseline first (ticker + perp ticker), then hinge loop.
    const perp = { code: "00000", msg: "ok", data: [fx("perp-nvda.json")] };
    const fetchAll = mockFetchFor({ "/tickers?category=SPOT": WIDE_TICKER, "/tickers?category=USDT-FUTURES": perp, "/candles?": candles, "/orderbook?": depth });
    const base = await establishBaseline("RNVDAUSDT", "NVDAUSDT", fetchAll);
    expect(base.problems).toEqual([]);
    expect(base.facts.spot?.spreadWide).toBe(true);
    const { output, state } = await orchestratorStep(
      { asset: "RNVDA", spotSymbol: "RNVDAUSDT", perpSymbol: "NVDAUSDT", action: "enter-now",
        read: "undecided", resolvedTopics: [], facts: base.facts,
        data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
        context: "off-hours", known: [] },
      { fetchImpl,
        persistStep: async (kind, family, summary, provenance) => { persisted.push({ kind, family, summary, provenance }); },
        emit: (e) => { emitted.push(e); } },
    );
    expect(output.action).toBe("RESEARCH");
    expect(output.family).toBe("spot-structure");
    expect(persisted.length).toBeGreaterThan(0);
    expect(state.read).toBe("stand-aside");
    expect(state.hingeHistory.length).toBe(1);
    expect(state.skips.some((s) => s.check === "perp-positioning")).toBe(true);
  });
  it("refuses positioning research without a mapped perp instrument", async () => {
    const fetchImpl = mockFetchFor({});
    const { state, output } = await orchestratorStep(
      { asset: "RXYZ", spotSymbol: "RXYZUSDT", perpSymbol: null, action: "enter-now",
        read: "undecided", resolvedTopics: ["move-reality", "structure-direction"],
        facts: { perp: { fundingRate: 0.0015 } },
        data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
        context: "", known: [] },
      { fetchImpl,
        persistStep: async () => {},
        emit: () => {} },
    );
    expect(output.action).toBe("RESEARCH");
    expect(output.family).toBe("perp-positioning");
    expect(state.uncertainty.some((u) => u.includes("no corresponding perp"))).toBe(true);
  });
});
