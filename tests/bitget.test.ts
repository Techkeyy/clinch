import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  SpotTickerRow, FutTickerRow, CandleRow, DepthBook, SpotInstrument, FutInstrument,
} from "../research/bitget/endpoints";
import { classifyUpstream, BitgetError } from "../research/bitget/errors";
import { mapSpotToPerp, getTicker } from "../research/bitget/index";

const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8"));

describe("bitget response validation", () => {
  it("accepts the proven RNVDAUSDT ticker shape", () => {
    const row = SpotTickerRow.parse(fx("ticker-rnvda.json"));
    expect(row.symbol).toBe("RNVDAUSDT");
    expect(Number(row.lastPrice)).toBeGreaterThan(0);
  });
  it("accepts 7-column candle rows", () => {
    const rows = fx("candles-1h.json").data.map((c: unknown) => CandleRow.parse(c));
    expect(rows.length).toBe(3);
  });
  it("accepts trimmed depth books", () => {
    const book = DepthBook.parse(fx("depth-rnvda.json"));
    expect(book.a.length).toBe(3);
    expect(book.b.length).toBe(3);
  });
  it("accepts the RWA-perp ticker with funding/OI/mark/index", () => {
    const row = FutTickerRow.parse(fx("perp-nvda.json"));
    expect(row.symbol).toBe("NVDAUSDT");
    expect(row.fundingRate).toBeDefined();
    expect(row.openInterest).toBeDefined();
  });
  it("rejects malformed rows instead of passing them downstream", () => {
    expect(() => SpotTickerRow.parse({ symbol: "X" })).toThrow();
    expect(() => CandleRow.parse(["1", "2"])).toThrow();
  });
});

describe("failure taxonomy mapping", () => {
  it("maps unknown symbol/category to INVALID_INPUT", () => {
    expect(classifyUpstream("v3-ticker", "40034", "Parameter ZZZZUSDT does not exist").code).toBe("INVALID_INPUT");
  });
  it("maps bad interval to INVALID_INPUT", () => {
    expect(classifyUpstream("v3-candles", "40020", "Parameter 2H error").code).toBe("INVALID_INPUT");
  });
  it("maps unlisted perp pair to UNSUPPORTED", () => {
    expect(classifyUpstream("v3-x", "25100", "Trading pair RNVDAUSDT does not exist").code).toBe("UNSUPPORTED");
  });
  it("maps unknown routes to UNSUPPORTED", () => {
    expect(classifyUpstream("v3-x", "40404", "Request URL NOT FOUND").code).toBe("UNSUPPORTED");
  });
  it("BitgetError carries code, family, and message", () => {
    const e = new BitgetError("NO_DATA", "v3-ticker", "empty");
    expect(e.code).toBe("NO_DATA");
    expect(e.endpointFamily).toBe("v3-ticker");
  });
});

const mockFetch = (body: unknown, status = 200) =>
  (async () => ({ status, json: async () => body })) as unknown as typeof fetch;

describe("adapter wiring with mock transport (no network)", () => {
  it("unwraps envelopes and normalizes a ticker with provenance", async () => {
    const row = fx("ticker-rnvda.json");
    const t = await getTicker("SPOT", "RNVDAUSDT", mockFetch({ code: "00000", msg: "ok", data: [row] }));
    expect(t.value.symbol).toBe("RNVDAUSDT");
    expect(t.value.last).toBeGreaterThan(0);
    expect(t.provenance.endpointFamily).toBe("v3-ticker");
    expect(t.freshness.status).toBe("fresh");
  });
  it("discovers and filters Reality symbols through the full path", async () => {
    const rows = [
      { symbol: "RNVDAUSDT", category: "SPOT", status: "online", isReality: "yes" },
      { symbol: "BTCUSDT", category: "SPOT", status: "online", isReality: "no" },
    ];
    const { discoverSpot: d, realitySymbols } = await import("../research/bitget/index");
    const found = await d(mockFetch({ code: "00000", msg: "ok", data: rows }));
    expect(realitySymbols(found)).toEqual(["RNVDAUSDT"]);
  });
  it("converts exchange error codes to typed failures", async () => {
    await expect(
      getTicker("SPOT", "ZZZZUSDT", mockFetch({ code: "40034", msg: "Parameter ZZZZUSDT does not exist" })),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
  it("reports empty books as NO_DATA, never as evidence", async () => {
    const { getOrderbook } = await import("../research/bitget/index");
    await expect(
      getOrderbook("RNVDAUSDT", 5, mockFetch({ code: "00000", msg: "ok", data: { a: [], b: [], ts: "1789167781492" } })),
    ).rejects.toMatchObject({ code: "NO_DATA" });
  });
});

describe("symbol mapping safety", () => {
  const spot = [
    { symbol: "RNVDAUSDT", baseCoin: "rNVDA", category: "SPOT", status: "online", isReality: "yes" },
    { symbol: "BTCUSDT", category: "SPOT", status: "online", isReality: "no" },
  ].map((r) => SpotInstrument.parse(r));
  const fut = [
    { symbol: "NVDAUSDT", baseCoin: "NVDA", category: "USDT-FUTURES", symbolType: "stock", isRwa: "YES", status: "online" },
  ].map((r) => FutInstrument.parse(r));
  it("maps only when both discovered instruments exist and qualify", () => {
    expect(mapSpotToPerp("RNVDAUSDT", spot, fut)).toBe("NVDAUSDT");
  });
  it("refuses non-Reality spot and missing perp legs", () => {
    expect(mapSpotToPerp("BTCUSDT", spot, fut)).toBeNull();
    expect(mapSpotToPerp("RNVDAUSDT", spot, [])).toBeNull();
    expect(mapSpotToPerp("RZZZUSDT", spot, fut)).toBeNull();
  });
});
