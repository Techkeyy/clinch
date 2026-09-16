import { sameOrigin } from "@/server/stream";
import { BitgetError } from "@/research/bitget/errors";
import { getResearchableStockCatalog } from "@/research/bitget/catalog";
import { verifyResearchableStockCatalog } from "@/lib/stocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  try {
    const snapshot = await getResearchableStockCatalog();
    const stocks = snapshot.stocks;
    const validation = verifyResearchableStockCatalog(stocks);
    const publicStocks = stocks.map(({ companyName, ticker, realityTicker, perpTicker, logoKey, markKind, researchFamilies, capabilities, sourceSymbol, validatedAt, tradingPeriod, weekendTradable }) => ({
      companyName, ticker, realityTicker, perpTicker, researchFamilies, capabilities,
      sourceSymbol, validatedAt, tradingPeriod, weekendTradable, logoKey, markKind,
    }));
    const cataloguedMarkCount = publicStocks.filter((stock) => stock.markKind === "catalogued").length;
    const fallbackMarkCount = publicStocks.length - cataloguedMarkCount;
    return Response.json({
      stocks: publicStocks,
      count: publicStocks.length,
      cataloguedMarkCount,
      fallbackMarkCount,
      catalogValidation: validation,
      stale: snapshot.stale,
      source: "Bitget SPOT instruments joined to Reality stock-info; CLINCH spot research capability",
      generatedAt: snapshot.generatedAt,
    }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300", "X-CLINCH-Catalog": snapshot.stale ? "stale" : "fresh" },
    });
  } catch (error) {
    const reason = error instanceof BitgetError ? error.code : "PROVIDER_ENDPOINT_FAILURE";
    return Response.json({ stocks: [], count: 0, error: "STOCK_DISCOVERY_UNAVAILABLE", reason }, { status: 503 });
  }
}
