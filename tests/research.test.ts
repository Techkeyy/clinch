import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { investigateSpot, investigatePositioning, assertSupportedFamily } from "../research/index";
import { BitgetError } from "../research/bitget/errors";

const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8"));

function trackingMock(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const fetchImpl = (async (url: string) => {
    calls.push(url);
    for (const [key, body] of Object.entries(routes)) {
      if (url.includes(key)) return { status: 200, json: async () => body };
    }
    return { status: 200, json: async () => ({ code: "40404", msg: "Request URL NOT FOUND" }) };
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}
const TICKER = { code: "00000", msg: "ok", data: [JSON.parse(readFileSync(new URL("./fixtures/ticker-rnvda.json", import.meta.url), "utf8"))] };

describe("spot-structure executor", () => {
  it("fetches ONLY requested evidence (ticker-only never calls candles/orderbook)", async () => {
    const { fetchImpl, calls } = trackingMock({ "/tickers?": TICKER });
    const r = await investigateSpot("RNVDAUSDT", ["ticker"], "15m", fetchImpl);
    expect(r.status).toBe("ok");
    expect(typeof r.facts.last).toBe("number");
    expect(typeof r.facts.spreadBps).toBe("number");
    expect(calls.some((u) => u.includes("/candles?"))).toBe(false);
    expect(calls.some((u) => u.includes("/orderbook?"))).toBe(false);
  });
  it("computes deterministic candle structure facts", async () => {
    const candles = { code: "00000", msg: "ok", data: JSON.parse(readFileSync(new URL("./fixtures/candles-1h.json", import.meta.url), "utf8")).data.map((c: string[]) => c) };
    const { fetchImpl } = trackingMock({ "/candles?": candles });
    const r = await investigateSpot("RNVDAUSDT", ["candles"], "1H", fetchImpl);
    expect(r.status).toBe("ok");
    expect(typeof r.facts.windowMovePcnt).toBe("number");
    expect(typeof r.facts.supportLevel).toBe("number");
    expect(typeof r.facts.resistanceLevel).toBe("number");
  });
  it("returns no-data (never invented facts) when the book is empty", async () => {
    const { fetchImpl } = trackingMock({ "/tickers?": TICKER, "/orderbook?": { code: "00000", msg: "ok", data: { a: [], b: [], ts: "1" } } });
    const r = await investigateSpot("RNVDAUSDT", ["ticker", "depth"], "15m", fetchImpl);
    expect(r.status).toBe("no-data");
    expect(r.facts.depthImbalance).toBeUndefined();
  });
});

describe("perp-positioning executor", () => {
  it("reads funding/OI/mark/index without touching spot endpoints", async () => {
    const perp = { code: "00000", msg: "ok", data: [JSON.parse(readFileSync(new URL("./fixtures/perp-nvda.json", import.meta.url), "utf8"))] };
    const { fetchImpl, calls } = trackingMock({ "USDT-FUTURES&symbol=NVDAUSDT": perp, "/tickers?category=USDT-FUTURES": perp });
    const r = await investigatePositioning("NVDAUSDT", ["ticker"], fetchImpl);
    expect(r.status).toBe("ok");
    expect(typeof r.facts.fundingRate).toBe("number");
    expect(typeof r.facts.openInterest).toBe("number");
    expect(typeof r.facts.markIndexDislocationBps).toBe("number");
    expect(calls.some((u) => u.includes("category=SPOT"))).toBe(false);
  });
});

describe("research registry", () => {
  it("rejects unregistered families instead of executing them", () => {
    expect(() => assertSupportedFamily("unsupported-family")).toThrowError(BitgetError);
    expect(() => assertSupportedFamily("unsupported-family")).toThrowError(/not registered/);
    expect(() => assertSupportedFamily("spot-structure")).not.toThrow();
  });
});
