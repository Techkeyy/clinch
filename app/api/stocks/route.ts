import { sameOrigin } from "@/server/stream";
import { discoverFutures, discoverSpot } from "@/research/bitget/index";
import { buildResearchableStockCatalog } from "@/lib/stocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  try {
    const spot = await discoverSpot();
    let futures = [] as Awaited<ReturnType<typeof discoverFutures>>;
    try {
      futures = await discoverFutures();
    } catch {
      // Spot structure is still a real CLINCH research capability. Positioning
      // stays absent when the optional futures instrument discovery is down.
    }
    const stocks = buildResearchableStockCatalog(spot, futures);
    const publicStocks = stocks.map(({ companyName, ticker, realityTicker, perpTicker, logoKey, markKind, researchFamilies }) => ({ companyName, ticker, realityTicker, perpTicker, researchFamilies, logoKey, markKind }));
    const cataloguedMarkCount = publicStocks.filter((stock) => stock.markKind === "catalogued").length;
    const fallbackMarkCount = publicStocks.length - cataloguedMarkCount;
    return Response.json({
      stocks: publicStocks,
      count: publicStocks.length,
      cataloguedMarkCount,
      fallbackMarkCount,
      source: "Bitget Reality instruments plus CLINCH spot research capability",
      generatedAt: new Date().toISOString(),
    }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json({ stocks: [], count: 0, error: "STOCK_DISCOVERY_UNAVAILABLE" }, { status: 503 });
  }
}
