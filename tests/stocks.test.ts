import { describe, expect, it } from "vitest";
import { findStockByMention, researchableRealityStocks, stockFromRealityTicker, stockMatchesQuery } from "@/lib/stocks";
import { FutInstrument, SpotInstrument } from "@/research/bitget/endpoints";

const spot = [
  { symbol: "RNVDAUSDT", category: "SPOT", status: "online", isReality: "yes" },
  { symbol: "RTSLAUSDT", category: "SPOT", status: "online", isReality: "yes" },
  { symbol: "RZZZUSDT", category: "SPOT", status: "online", isReality: "yes" },
  { symbol: "RAAPLUSDT", category: "SPOT", status: "offline", isReality: "yes" },
].map((row) => SpotInstrument.parse(row));
const futures = [{ symbol: "NVDAUSDT", category: "USDT-FUTURES", symbolType: "stock", isRwa: "YES" }].map((row) => FutInstrument.parse(row));

describe("CLINCH stock identity and dynamic universe", () => {
  it("derives only online Reality instruments and maps optional perp capability", () => {
    const stocks = researchableRealityStocks(spot, futures);
    expect(stocks.map((stock) => stock.realityTicker)).toEqual(["RNVDAUSDT", "RZZZUSDT", "RTSLAUSDT"]);
    expect(stocks.find((stock) => stock.ticker === "NVDA")?.perpTicker).toBe("NVDAUSDT");
  });

  it("accepts company name, ordinary ticker, and rToken aliases", () => {
    const stocks = researchableRealityStocks(spot, futures);
    expect(findStockByMention("NVIDIA", stocks)?.ticker).toBe("NVDA");
    expect(findStockByMention("nvda", stocks)?.realityTicker).toBe("RNVDAUSDT");
    expect(findStockByMention("rNVDA", stocks)?.companyName).toBe("NVIDIA");
    expect(stockMatchesQuery(stocks.find((stock) => stock.ticker === "NVDA")!, "company or ticker")).toBe(false);
    expect(stockMatchesQuery(stocks.find((stock) => stock.ticker === "NVDA")!, "nvidia")).toBe(true);
    expect(stockMatchesQuery(stocks.find((stock) => stock.ticker === "TSLA")!, "tesla")).toBe(true);
    expect(stockMatchesQuery(stockFromRealityTicker("RAUSDT")!, "tesla")).toBe(false);
  });

  it("uses a truthful monogram for an unknown but valid Reality issuer", () => {
    const stock = stockFromRealityTicker("RZZZUSDT");
    expect(stock).toMatchObject({ ticker: "ZZZ", companyName: "Stock ZZZ", logoKey: "monogram", markKind: "fallback", perpTicker: null });
  });

  it("classifies package-backed marks separately from the fallback", () => {
    expect(stockFromRealityTicker("RNVDAUSDT")).toMatchObject({ logoKey: "nvidia", markKind: "verified" });
    expect(stockFromRealityTicker("RAMZNUSDT")).toMatchObject({ logoKey: "amazon", markKind: "verified" });
    expect(stockFromRealityTicker("RORCLUSDT")).toMatchObject({ logoKey: "monogram", markKind: "fallback" });
  });

  it("rejects malformed non-Reality symbols instead of inventing support", () => {
    expect(stockFromRealityTicker("NVDAUSDT")).toBeNull();
    expect(stockFromRealityTicker("RNVDA")).toBeNull();
  });
});
