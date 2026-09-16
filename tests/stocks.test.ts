import { describe, expect, it } from "vitest";
import { buildResearchableStockCatalog, CATALOGUED_LOGO_KEYS, FEATURED_STOCK_TICKERS, featuredSupportedStocks, findStockByMention, researchableRealityStocks, resolveResearchableStock, stockFromRealityTicker, stockMatchesQuery } from "@/lib/stocks";
import { resolveCataloguedMark } from "@/components/stock-identity";
import { FutInstrument, RealityStockInfo, SpotInstrument } from "@/research/bitget/endpoints";

const spot = [
  { symbol: "RNVDAUSDT", baseCoin: "rNVDA", category: "SPOT", status: "online", isReality: "yes" },
  { symbol: "RTSLAUSDT", baseCoin: "rTSLA", category: "SPOT", status: "online", isReality: "yes" },
  { symbol: "RZZZUSDT", baseCoin: "rZZZ", category: "SPOT", status: "online", isReality: "yes" },
  { symbol: "RAAPLUSDT", baseCoin: "rAAPL", category: "SPOT", status: "offline", isReality: "yes" },
].map((row) => SpotInstrument.parse(row));
const stockInfo = [
  { symbol: "RNVDAUSDT", code: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "RTSLAUSDT", code: "TSLA", name: "Tesla, Inc." },
  { symbol: "RZZZUSDT", code: "ZZZ", name: "ZZZ Holdings" },
  { symbol: "RAAPLUSDT", code: "AAPL", name: "Apple Inc." },
].map((row) => RealityStockInfo.parse(row));
const futures = [{ symbol: "NVDAUSDT", baseCoin: "NVDA", category: "USDT-FUTURES", symbolType: "stock", isRwa: "YES", status: "online" }].map((row) => FutInstrument.parse(row));

describe("CLINCH stock identity and dynamic universe", () => {
  it("derives only online Reality instruments and maps optional perp capability", () => {
    const stocks = researchableRealityStocks(spot, futures, stockInfo);
    expect(stocks.map((stock) => stock.realityTicker)).toEqual(["RNVDAUSDT", "RTSLAUSDT", "RZZZUSDT"]);
    expect(stocks.find((stock) => stock.ticker === "NVDA")?.perpTicker).toBe("NVDAUSDT");
  });

  it("accepts company name, ordinary ticker, and rToken aliases", () => {
    const stocks = researchableRealityStocks(spot, futures, stockInfo);
    expect(findStockByMention("NVIDIA", stocks)?.ticker).toBe("NVDA");
    expect(findStockByMention("nvda", stocks)?.realityTicker).toBe("RNVDAUSDT");
    expect(findStockByMention("rNVDA", stocks)?.companyName).toBe("NVIDIA Corporation");
    expect(stockMatchesQuery(stocks.find((stock) => stock.ticker === "NVDA")!, "company or ticker")).toBe(false);
    expect(stockMatchesQuery(stocks.find((stock) => stock.ticker === "NVDA")!, "nvidia")).toBe(true);
    expect(stockMatchesQuery(stocks.find((stock) => stock.ticker === "TSLA")!, "tesla")).toBe(true);
    expect(stockMatchesQuery(stockFromRealityTicker("RESUSDT")!, "tesla")).toBe(false);
  });

  it("uses a truthful monogram for an unknown but valid Reality issuer", () => {
    const stock = stockFromRealityTicker("RZZZUSDT");
    expect(stock).toMatchObject({ ticker: "ZZZ", companyName: "Stock ZZZ", logoKey: "monogram", markKind: "fallback", perpTicker: null });
  });

  it("gives every featured issuer a local recognizable package-backed mark", () => {
    for (const ticker of FEATURED_STOCK_TICKERS) {
      const stock = stockFromRealityTicker("R" + ticker + "USDT");
      expect(stock).toMatchObject({ ticker, markKind: "catalogued" });
      expect(resolveCataloguedMark(stock!.logoKey)?.path.length).toBeGreaterThan(0);
    }
    expect(CATALOGUED_LOGO_KEYS.has("nvidia")).toBe(true);
    expect(CATALOGUED_LOGO_KEYS.has("amazon")).toBe(true);
    expect(stockFromRealityTicker("RAVGOUSDT")).toMatchObject({ logoKey: "broadcom", markKind: "catalogued" });
    expect(stockFromRealityTicker("RORCLUSDT")).toMatchObject({ logoKey: "monogram", markKind: "fallback" });
  });

  it("derives featured cards from the live supported universe", () => {
    const stocks = researchableRealityStocks([
      ...spot,
      { symbol: "RAMZNUSDT", category: "SPOT", status: "online", isReality: "yes" },
      { symbol: "RMSFTUSDT", category: "SPOT", status: "online", isReality: "yes" },
    ].map((row) => SpotInstrument.parse(row)), futures, [
      ...stockInfo,
      { symbol: "RAMZNUSDT", code: "AMZN", name: "Amazon" },
      { symbol: "RMSFTUSDT", code: "MSFT", name: "Microsoft" },
    ].map((row) => RealityStockInfo.parse(row)));
    expect(featuredSupportedStocks(stocks).map((stock) => stock.ticker)).toEqual(["NVDA", "TSLA", "AMZN", "MSFT"]);
  });

  it("resolves Apple company, ticker, and rToken aliases to one live Reality identity", () => {
    const appleSpot = [{ symbol: "RAAPLUSDT", baseCoin: "rAAPL", category: "SPOT", status: "online", isReality: "yes" }].map((row) => SpotInstrument.parse(row));
    const appleInfo = [{ symbol: "RAAPLUSDT", code: "AAPL", name: "Apple Inc." }].map((row) => RealityStockInfo.parse(row));
    const catalog = buildResearchableStockCatalog(appleSpot, [], appleInfo);
    const byCompany = resolveResearchableStock("Apple", appleSpot, [], undefined, undefined, appleInfo);
    const byTicker = resolveResearchableStock("AAPL", appleSpot, [], undefined, undefined, appleInfo);
    const byToken = resolveResearchableStock("rAAPL", appleSpot, [], undefined, undefined, appleInfo);
    expect(catalog).toHaveLength(1);
    expect([byCompany, byTicker, byToken].map((stock) => stock?.realityTicker)).toEqual(["RAAPLUSDT", "RAAPLUSDT", "RAAPLUSDT"]);
    expect(new Set([byCompany?.ticker, byTicker?.ticker, byToken?.ticker])).toEqual(new Set(["AAPL"]));
  });

  it("keeps every advertised featured ticker tied to a researchable Reality row", () => {
    const featuredSpot = FEATURED_STOCK_TICKERS.map((ticker) => ({
      symbol: `R${ticker}USDT`, category: "SPOT", status: "online", isReality: "yes",
    })).map((row) => SpotInstrument.parse(row));
    const catalog = buildResearchableStockCatalog(featuredSpot, [], FEATURED_STOCK_TICKERS.map((ticker) => RealityStockInfo.parse({
      symbol: "R" + ticker + "USDT", code: ticker, name: ticker,
    })));
    expect(featuredSupportedStocks(catalog).map((stock) => stock.ticker)).toEqual([...FEATURED_STOCK_TICKERS]);
    expect(catalog.every((stock) => stock.researchFamilies.includes("spot-structure"))).toBe(true);
  });

  it("keeps selected-stock identity on the same canonical mark resolver", () => {
    const selected = stockFromRealityTicker("RNVDAUSDT");
    const sameLogoKey = selected && resolveCataloguedMark(selected.logoKey);
    expect(sameLogoKey?.path).toBe(resolveCataloguedMark("nvidia")?.path);
  });

  it("rejects malformed non-Reality symbols instead of inventing support", () => {
    expect(stockFromRealityTicker("NVDAUSDT")).toBeNull();
    expect(stockFromRealityTicker("RNVDA")).toBeNull();
  });
});
