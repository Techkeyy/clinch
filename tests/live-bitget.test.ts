// LIVE Bitget proof (opt-in). Run: $env:LIVE_BITGET="1"; npx vitest run tests/live-bitget.test.ts
// Dev-only DNS workaround: this host's default resolver filters *.bitget.com,
// and Node ignores per-process dns.setServers here. Tests therefore route ONLY
// api.bitget.com through undici with a pinned anycast IP observed 2026-09-11
// (104.18.14.166), keeping SNI + full TLS verification intact. Process-local,
// test-only, never product code; production uses normal DNS per P6/P18.
import dns from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
import { describe, expect, it } from "vitest";

const LIVE = process.env.LIVE_BITGET === "1";
const PINNED_IP = "104.18.14.166";

const agent = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      if (hostname === "api.bitget.com") {
        callback(null, [{ address: PINNED_IP, family: 4 }]);
        return;
      }
      dns.lookup(hostname, options, callback);
    },
  },
});
const liveFetch = ((url: unknown, init?: unknown) =>
  undiciFetch(url as string, { ...(init as object), dispatcher: agent })) as unknown as typeof fetch;

describe.skipIf(!LIVE)("live Bitget data layer", () => {
  it("discovers Reality instruments including RNVDAUSDT", async () => {
    const mod = await import("../research/bitget/index");
    const spot = await mod.discoverSpot(liveFetch);
    const reality = mod.realitySymbols(spot);
    expect(spot.length).toBeGreaterThan(1000);
    expect(reality.length).toBeGreaterThan(500);
    expect(reality).toContain("RNVDAUSDT");
    expect(reality).toContain("RAAPLUSDT");
  }, 60000);

  it("reads live RNVDAUSDT ticker/candles/orderbook with provenance", async () => {
    const mod = await import("../research/bitget/index");
    const t = await mod.getTicker("SPOT", "RNVDAUSDT", liveFetch);
    expect(t.value.last).toBeGreaterThan(0);
    expect(t.provenance.symbol).toBe("RNVDAUSDT");
    expect(t.freshness.status).toBe("fresh");
    const c = await mod.getCandles("SPOT", "RNVDAUSDT", "1H", 5, liveFetch);
    expect(c.value.length).toBeGreaterThan(0);
    const d = await mod.getOrderbook("RNVDAUSDT", 5, liveFetch);
    expect(d.value.asks.length).toBeGreaterThan(0);
    expect(d.value.bids.length).toBeGreaterThan(0);
  }, 90000);

  it("reads live RWA-perp positioning for NVDAUSDT", async () => {
    const mod = await import("../research/bitget/index");
    const fut = await mod.discoverFutures(liveFetch);
    const spot = await mod.discoverSpot(liveFetch);
    const perp = mod.mapSpotToPerp("RNVDAUSDT", spot, fut);
    expect(perp).toBe("NVDAUSDT");
    const p = await mod.getPerpPositioning("NVDAUSDT", liveFetch);
    expect(Number.isFinite(p.value.fundingRate)).toBe(true);
    expect(p.value.openInterest).toBeGreaterThan(0);
  }, 90000);

  it("rejects unknown symbols with typed INVALID_INPUT", async () => {
    const mod = await import("../research/bitget/index");
    await expect(mod.getTicker("SPOT", "ZZZZUSDT", liveFetch)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  }, 60000);
});
