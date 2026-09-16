import { describe, expect, it } from "vitest";
import {
  FEATURED_STOCK_TICKERS,
  buildResearchableStockCatalog,
  featuredSupportedStocks,
  resolveResearchableStockResult,
  resolveStockFromCatalog,
  verifyResearchableStockCatalog,
} from "@/lib/stocks";
import { FutInstrument, RealityStockInfo, SpotInstrument } from "@/research/bitget/endpoints";
import { getResearchableStockCatalog, resetResearchableStockCatalogCache } from "@/research/bitget/catalog";

function reality(status = "online", isReality = "yes") {
  return SpotInstrument.parse({
    symbol: "rMETAUSDT",
    baseCoin: "rMETA",
    category: "SPOT",
    status,
    isReality,
  });
}

function info() {
  return [RealityStockInfo.parse({
    symbol: "rMETAUSDT",
    code: "META",
    name: "Meta Platforms, Inc.",
    tradingPeriod: ["regular"],
    weekendTradable: "no",
  })];
}

describe("zero unsupported-asset catalog invariant", () => {
  it.each(["META", "Meta", "rMETA"])("resolves explicit and natural %s mentions to the exact Bitget symbol", (mention) => {
    const catalog = buildResearchableStockCatalog([reality()], [], info());
    const result = resolveResearchableStockResult(mention, [reality()], [], info(), "META", "rMETAUSDT");
    expect(result.failure).toBeNull();
    expect(result.stock?.realityTicker).toBe("rMETAUSDT");
    expect(resolveStockFromCatalog(mention, catalog, "META", "rMETAUSDT")?.realityTicker).toBe("rMETAUSDT");
  });

  it("keeps an exact futures row without synthesizing a symbol", () => {
    const perp = FutInstrument.parse({
      symbol: "META-PERP-USD",
      baseCoin: "META",
      category: "USDT-FUTURES",
      symbolType: "stock",
      isRwa: "YES",
      status: "online",
    });
    const catalog = buildResearchableStockCatalog([reality()], [perp], info());
    expect(catalog[0]?.perpTicker).toBe("META-PERP-USD");
    expect(catalog[0]?.researchFamilies).toEqual(["spot-structure", "perp-positioning"]);
  });

  it("filters missing-info and offline rows before they become visible", () => {
    const visible = buildResearchableStockCatalog(
      [reality(), SpotInstrument.parse({ ...reality(), symbol: "rOTHERUSDT", baseCoin: "rOTHER" })],
      [],
      info(),
    );
    expect(visible.map((stock) => stock.realityTicker)).toEqual(["rMETAUSDT"]);
  });

  it("distinguishes offline from unsupported and unknown assets", () => {
    const offline = resolveResearchableStockResult("META", [reality("offline")], [], info());
    expect(offline).toMatchObject({ stock: null, failure: "ASSET_OFFLINE" });

    const unsupported = resolveResearchableStockResult("META", [reality("online", "no")], [], info());
    expect(unsupported).toMatchObject({ stock: null, failure: "UNSUPPORTED_ASSET" });

    const unknown = resolveResearchableStockResult("QWEN", [reality()], [], info());
    expect(unknown).toMatchObject({ stock: null, failure: "UNKNOWN_ASSET" });
  });

  it("proves every visible catalog asset is researchable", () => {
    const catalog = buildResearchableStockCatalog([reality()], [], info());
    const validation = verifyResearchableStockCatalog(catalog);
    expect(validation.visibleAssets).toEqual(["rMETAUSDT"]);
    expect(validation.researchableAssets).toEqual(["rMETAUSDT"]);
    expect(validation.broken).toBe(0);
    expect(validation.failures).toEqual([]);
  });

  it("coalesces fresh catalog reads instead of refetching the live universe", async () => {
    resetResearchableStockCatalogCache();
    let calls = 0;
    const fetchImpl = (async (input: RequestInfo | URL) => {
      calls += 1;
      const url = String(input);
      const body = url.includes("stock-info")
        ? { code: "00000", msg: "ok", data: info() }
        : url.includes("USDT-FUTURES")
          ? { code: "00000", msg: "ok", data: [] }
          : { code: "00000", msg: "ok", data: [reality()] };
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const first = await getResearchableStockCatalog(fetchImpl);
    const second = await getResearchableStockCatalog(async () => {
      throw new Error("fresh cache should avoid this fetch");
    });
    expect(first.stale).toBe(false);
    expect(second.stale).toBe(false);
    expect(calls).toBe(3);
    resetResearchableStockCatalogCache();
  });

  it("resolves every featured ticker through the same canonical catalog", () => {
    const spot = FEATURED_STOCK_TICKERS.map((ticker) => SpotInstrument.parse({
      symbol: `R${ticker}USDT`, baseCoin: `r${ticker}`, category: "SPOT", status: "online", isReality: "yes",
    }));
    const stockInfo = FEATURED_STOCK_TICKERS.map((ticker) => RealityStockInfo.parse({
      symbol: `R${ticker}USDT`, code: ticker, name: `${ticker} Inc.`,
    }));
    const catalog = buildResearchableStockCatalog(spot, [], stockInfo);
    expect(featuredSupportedStocks(catalog).map((stock) => stock.ticker)).toEqual([...FEATURED_STOCK_TICKERS]);
    for (const stock of catalog) {
      expect(resolveStockFromCatalog(stock.ticker, catalog)?.realityTicker).toBe(stock.realityTicker);
      expect(resolveStockFromCatalog(stock.realityTicker, catalog)?.realityTicker).toBe(stock.realityTicker);
      expect(resolveStockFromCatalog(stock.realityTicker, catalog, stock.ticker, stock.realityTicker)?.realityTicker).toBe(stock.realityTicker);
    }
    expect(verifyResearchableStockCatalog(catalog).broken).toBe(0);
  });

  it("keeps explicit selection and natural language on the same canonical identity", () => {
    const catalog = buildResearchableStockCatalog([reality()], [], info());
    const explicit = resolveStockFromCatalog("ignored mention", catalog, "META", "rMETAUSDT");
    const natural = resolveStockFromCatalog("Meta Platforms", catalog);
    expect(explicit?.realityTicker).toBe("rMETAUSDT");
    expect(natural?.realityTicker).toBe("rMETAUSDT");
    expect(explicit?.ticker).toBe(natural?.ticker);
  });

  it("keeps spot researchable when optional perp positioning is absent", () => {
    const catalog = buildResearchableStockCatalog([reality()], [], info());
    expect(catalog[0]?.capabilities["spot-structure"]).toBe(true);
    expect(catalog[0]?.capabilities["perp-positioning"]).toBe(false);
    expect(catalog[0]?.researchFamilies).toEqual(["spot-structure"]);
    expect(verifyResearchableStockCatalog(catalog).broken).toBe(0);
  });

  it("excludes featured tickers missing from the live catalog instead of bypassing capability", () => {
    const catalog = buildResearchableStockCatalog([reality()], [], info());
    const featured = featuredSupportedStocks(catalog);
    expect(featured.map((stock) => stock.ticker)).toEqual(["META"]);
    expect(featured.some((stock) => stock.ticker === "NVDA")).toBe(false);
  });

  it("joins stock-info case-insensitively and preserves the exact tradable symbol", () => {
    const upperSpot = [SpotInstrument.parse({ symbol: "RMETAUSDT", baseCoin: "rMETA", category: "SPOT", status: "online", isReality: "YES" })];
    const lowerInfo = [RealityStockInfo.parse({ symbol: "rmetausdt", code: "meta", name: "Meta Platforms, Inc." })];
    const catalog = buildResearchableStockCatalog(upperSpot, [], lowerInfo);
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.realityTicker).toBe("RMETAUSDT");
    expect(catalog[0]?.ticker).toBe("META");
  });

  it("falls back to directory identity when live stock-info returns a null name", () => {
    const spot = [SpotInstrument.parse({ symbol: "RMETAUSDT", baseCoin: "rMETA", category: "SPOT", status: "online", isReality: "yes" })];
    const nullName = [RealityStockInfo.parse({ symbol: "RMETAUSDT", code: "META", name: null })];
    const catalog = buildResearchableStockCatalog(spot, [], nullName);
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.companyName).toBe("Meta Platforms");
    expect(verifyResearchableStockCatalog(catalog).broken).toBe(0);
  });

  it("keeps R-prefixed tickers distinct instead of collapsing RDY into DY", () => {
    const spot = [
      SpotInstrument.parse({ symbol: "RDYUSDT", baseCoin: "rDY", category: "SPOT", status: "online", isReality: "yes" }),
      SpotInstrument.parse({ symbol: "RRDYUSDT", baseCoin: "rRDY", category: "SPOT", status: "online", isReality: "yes" }),
    ];
    const stockInfo = [
      RealityStockInfo.parse({ symbol: "RDYUSDT", code: "DY", name: "Dycom Industries, Inc." }),
      RealityStockInfo.parse({ symbol: "RRDYUSDT", code: "RDY", name: "Dr. Reddy's Laboratories Limited" }),
    ];
    const catalog = buildResearchableStockCatalog(spot, [], stockInfo);
    expect(catalog.map((stock) => stock.ticker).sort()).toEqual(["DY", "RDY"]);
    expect(resolveStockFromCatalog("RDYUSDT", catalog, "RDY", "RRDYUSDT")?.realityTicker).toBe("RRDYUSDT");
    expect(resolveStockFromCatalog("DYUSDT", catalog, "DY", "RDYUSDT")?.realityTicker).toBe("RDYUSDT");
    expect(verifyResearchableStockCatalog(catalog).broken).toBe(0);
  });

  it("surfaces transient provider failure as a throw, never as an unsupported asset", async () => {
    resetResearchableStockCatalogCache();
    await expect(getResearchableStockCatalog((async () => {
      throw new Error("transient network failure");
    }) as typeof fetch)).rejects.toThrow();
    // Taxonomy proof: the same META mention against known info but no live row
    // is offline/unknown, never collapsed into a generic unsupported verdict
    // for a transient transport failure.
    expect(resolveResearchableStockResult("META", [], [], info()).failure).toBe("ASSET_OFFLINE");
    resetResearchableStockCatalogCache();
  });
});
