import { getResearchableStockCatalog } from "@/research/bitget/catalog";
import { getCandles, getTicker } from "@/research/bitget";
import { resolveStockFromCatalog, verifyResearchableStockCatalog } from "@/lib/stocks";

const concurrency = 4;

async function mapBounded<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let cursor = 0;
  async function consume() {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      out[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => consume()));
  return out;
}

try {
  const snapshot = await getResearchableStockCatalog();
  const invariant = verifyResearchableStockCatalog(snapshot.stocks);
  const probes = await mapBounded(snapshot.stocks, async (stock) => {
    const [ticker, candles] = await Promise.allSettled([
      getTicker("SPOT", stock.realityTicker),
      getCandles("SPOT", stock.realityTicker, "1H", 20),
    ]);
    const ok = ticker.status === "fulfilled" && candles.status === "fulfilled";
    const byTicker = resolveStockFromCatalog(stock.ticker, snapshot.stocks)?.realityTicker === stock.realityTicker;
    const bySymbol = resolveStockFromCatalog(stock.realityTicker, snapshot.stocks)?.realityTicker === stock.realityTicker;
    const bySelection = resolveStockFromCatalog(stock.realityTicker, snapshot.stocks, stock.ticker, stock.realityTicker)?.realityTicker === stock.realityTicker;
    const identityOk = stock.ticker.length > 0 && stock.companyName.trim().length > 0 && stock.sourceSymbol === stock.realityTicker;
    const resolverOk = byTicker && bySymbol && bySelection;
    return {
      ticker: stock.ticker,
      company: stock.companyName,
      realityTicker: stock.realityTicker,
      exactSymbol: stock.sourceSymbol === stock.realityTicker,
      spotCapability: stock.capabilities["spot-structure"],
      perpCapability: stock.capabilities["perp-positioning"],
      perpTicker: stock.perpTicker,
      researchFamilies: stock.researchFamilies,
      identityOk,
      resolverByTicker: byTicker,
      resolverBySymbol: bySymbol,
      resolverBySelection: bySelection,
      resolver: resolverOk && Boolean(invariant.researchableAssets.includes(stock.realityTicker)),
      smoke: ok && resolverOk && identityOk ? "ok" : "failed",
      failure: !identityOk ? "IDENTITY_CONTRACT_FAILED" : !resolverOk ? "RESOLVER_ROUND_TRIP_FAILED" : !ok ? "SPOT_RESEARCH_PROBE_FAILED" : null,
    };
  });
  const broken = invariant.broken + probes.filter((probe) => probe.smoke !== "ok").length;
  console.log(JSON.stringify({
    generatedAt: snapshot.generatedAt,
    stale: snapshot.stale,
    totalVisible: invariant.visibleAssets.length,
    totalResearchable: invariant.researchableAssets.length,
    visibleAssets: invariant.visibleAssets,
    researchableAssets: invariant.researchableAssets,
    VISIBLE_ASSETS_EQUALS_RESEARCHABLE_ASSETS: invariant.visibleAssets.join("|") === invariant.researchableAssets.join("|"),
    broken,
    failures: [...invariant.failures, ...probes.filter((probe) => probe.smoke !== "ok")],
    featured: probes.filter((probe) => ["NVDA", "AAPL", "TSLA", "AMZN", "MSFT", "GOOGL", "META", "AMD"].includes(probe.ticker)),
  }));
  process.exitCode = broken === 0 ? 0 : 1;
} catch (error) {
  console.log(JSON.stringify({
    visibleAssets: [],
    researchableAssets: [],
    VISIBLE_ASSETS_EQUALS_RESEARCHABLE_ASSETS: false,
    broken: 1,
    error: error instanceof Error ? error.name : "PROVIDER_ENDPOINT_FAILURE",
  }));
  process.exitCode = 1;
}
