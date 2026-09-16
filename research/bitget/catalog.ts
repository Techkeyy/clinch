import type { FetchImpl } from "./client";
import { BitgetError } from "./errors";
import { discoverFutures, discoverRealityStockInfo, discoverSpot } from "./index";
import {
  buildResearchableStockCatalog,
  resolveResearchableStockResult,
  type CatalogResolution,
  type DiscoveredStock,
} from "@/lib/stocks";
import type { FutInstrument, RealityStockInfo, SpotInstrument } from "./endpoints";

const FRESH_TTL_MS = 60_000;
const STALE_TTL_MS = 300_000;

export interface ResearchableCatalogSnapshot {
  stocks: DiscoveredStock[];
  generatedAt: string;
  stale: boolean;
}

interface CatalogCache {
  stocks: DiscoveredStock[];
  generatedAt: string;
  expiresAt: number;
  staleUntil: number;
  spot: SpotInstrument[];
  futures: FutInstrument[];
  stockInfo: RealityStockInfo[];
}

let cache: CatalogCache | null = null;
let inFlight: Promise<ResearchableCatalogSnapshot> | null = null;

async function fetchCatalog(fetchImpl?: FetchImpl): Promise<ResearchableCatalogSnapshot> {
  const [spot, stockInfo] = await Promise.all([
    discoverSpot(fetchImpl),
    discoverRealityStockInfo(fetchImpl),
  ]);
  let futures = [] as Awaited<ReturnType<typeof discoverFutures>>;
  try {
    futures = await discoverFutures(fetchImpl);
  } catch {
    // Perpetual positioning is optional. Spot structure remains researchable.
  }
  const generatedAt = new Date().toISOString();
  const stocks = buildResearchableStockCatalog(spot, futures, stockInfo, generatedAt);
  if (spot.some((row) => row.isReality?.toLowerCase() === "yes" && row.status.toLowerCase() === "online") && !stocks.length) {
    throw new BitgetError("MALFORMED_RESPONSE", "v3-stock-catalog", "Bitget returned Reality instruments without a joinable stock-info catalog");
  }
  cache = {
    stocks,
    generatedAt,
    expiresAt: Date.now() + FRESH_TTL_MS,
    staleUntil: Date.now() + STALE_TTL_MS,
    spot,
    futures,
    stockInfo,
  };
  return { stocks, generatedAt, stale: false };
}

export async function resolveResearchableAsset(
  mention: string | null | undefined,
  requestedTicker?: string | null,
  requestedRealityTicker?: string | null,
  fetchImpl?: FetchImpl,
): Promise<{ resolution: CatalogResolution; snapshot: ResearchableCatalogSnapshot }> {
  const snapshot = await getResearchableStockCatalog(fetchImpl);
  if (!cache) {
    return {
      snapshot,
      resolution: { stock: null, failure: "INTERNAL_RESOLVER_BUG" },
    };
  }
  return {
    snapshot,
    resolution: resolveResearchableStockResult(
      mention,
      cache.spot,
      cache.futures,
      cache.stockInfo,
      requestedTicker,
      requestedRealityTicker,
    ),
  };
}

export async function getResearchableStockCatalog(fetchImpl?: FetchImpl): Promise<ResearchableCatalogSnapshot> {
  const now = Date.now();
  if (cache && now < cache.expiresAt) {
    return { stocks: cache.stocks, generatedAt: cache.generatedAt, stale: false };
  }
  if (!inFlight) {
    inFlight = fetchCatalog(fetchImpl).finally(() => {
      inFlight = null;
    });
  }
  try {
    return await inFlight;
  } catch (error) {
    if (cache && now < cache.staleUntil) {
      return { stocks: cache.stocks, generatedAt: cache.generatedAt, stale: true };
    }
    throw error;
  }
}

/** Test-only reset; production never calls this. */
export function resetResearchableStockCatalogCache(): void {
  cache = null;
  inFlight = null;
}
