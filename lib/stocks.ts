import type { FutInstrument, SpotInstrument } from "@/research/bitget/endpoints";

export interface StockIdentityData {
  companyName: string;
  ticker: string;
  logoKey: string;
  markKind: StockMarkKind;
  realityTicker?: string;
  perpTicker?: string | null;
}

export type StockMarkKind = "catalogued" | "fallback";

export interface DiscoveredStock extends StockIdentityData {
  realityTicker: string;
  perpTicker: string | null;
  researchFamilies: ResearchFamily[];
}

export type ResearchFamily = "spot-structure" | "perp-positioning";

interface StockDirectoryEntry {
  companyName: string;
  logoKey: string;
  aliases?: string[];
}

export const CATALOGUED_LOGO_KEYS = new Set([
  "nvidia",
  "apple",
  "tesla",
  "amazon",
  "microsoft",
  "google",
  "meta",
  "amd",
  "broadcom",
  "coinbase",
  "intel",
  "netflix",
  "palantir",
  "qualcomm",
  "shopify",
  "visa",
]);

export function stockMarkKind(logoKey: string): StockMarkKind {
  return CATALOGUED_LOGO_KEYS.has(logoKey) ? "catalogued" : "fallback";
}

export const FEATURED_STOCK_TICKERS = ["NVDA", "AAPL", "TSLA", "AMZN", "MSFT", "GOOGL", "META", "AMD"] as const;

export function featuredSupportedStocks<T extends StockIdentityData>(stocks: T[]): T[] {
  const byTicker = new Map(stocks.map((stock) => [stock.ticker, stock]));
  return FEATURED_STOCK_TICKERS.map((ticker) => byTicker.get(ticker)).filter((stock): stock is T => Boolean(stock));
}

// Bitget's instruments endpoint gives CLINCH the live symbol universe, while
// this small directory supplies human names and stable local marks for the
// most recognizable U.S. issuers. Unknown issuers remain truthful with a
// neutral monogram instead of an invented logo or a broken remote image.
const DIRECTORY: Record<string, StockDirectoryEntry> = {
  AAPL: { companyName: "Apple", logoKey: "apple", aliases: ["apple inc", "apple"] },
  AMD: { companyName: "AMD", logoKey: "amd", aliases: ["advanced micro devices", "advanced micro device"] },
  AMZN: { companyName: "Amazon", logoKey: "amazon", aliases: ["amazon.com", "amazon"] },
  AVGO: { companyName: "Broadcom", logoKey: "broadcom", aliases: ["broadcom inc", "broadcom"] },
  COIN: { companyName: "Coinbase", logoKey: "coinbase", aliases: ["coinbase global", "coinbase"] },
  GOOGL: { companyName: "Alphabet", logoKey: "google", aliases: ["alphabet", "google", "google class a"] },
  GOOG: { companyName: "Alphabet", logoKey: "google", aliases: ["alphabet", "google", "google class c"] },
  INTC: { companyName: "Intel", logoKey: "intel", aliases: ["intel corporation", "intel"] },
  META: { companyName: "Meta Platforms", logoKey: "meta", aliases: ["meta", "facebook"] },
  MSFT: { companyName: "Microsoft", logoKey: "microsoft", aliases: ["microsoft corporation", "microsoft"] },
  NFLX: { companyName: "Netflix", logoKey: "netflix", aliases: ["netflix"] },
  NVDA: { companyName: "NVIDIA", logoKey: "nvidia", aliases: ["nvidia corporation", "nvidia"] },
  ORCL: { companyName: "Oracle", logoKey: "monogram", aliases: ["oracle corporation", "oracle"] },
  PLTR: { companyName: "Palantir", logoKey: "palantir", aliases: ["palantir technologies", "palantir"] },
  QCOM: { companyName: "Qualcomm", logoKey: "qualcomm", aliases: ["qualcomm"] },
  QQQ: { companyName: "Invesco QQQ", logoKey: "monogram", aliases: ["invesco qqq", "qqq"] },
  SHOP: { companyName: "Shopify", logoKey: "shopify", aliases: ["shopify"] },
  SPY: { companyName: "SPDR S&P 500 ETF", logoKey: "monogram", aliases: ["spdr", "s&p 500", "spy"] },
  TSLA: { companyName: "Tesla", logoKey: "tesla", aliases: ["tesla inc", "tesla"] },
  V: { companyName: "Visa", logoKey: "visa", aliases: ["visa inc", "visa"] },
  WMT: { companyName: "Walmart", logoKey: "monogram", aliases: ["walmart"] },
};

function clean(value: string): string {
  return value.trim().toUpperCase().replace(/^\$/, "").replace(/[._\-/]/g, "");
}

function cleanWords(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function tickerFromRealitySymbol(realityTicker: string): string | null {
  const match = clean(realityTicker).match(/^R([A-Z0-9]{1,12})USDT$/);
  return match?.[1] ?? null;
}

export function stockFromRealityTicker(realityTicker: string, perpTicker: string | null = null): DiscoveredStock | null {
  const reality = clean(realityTicker);
  const ticker = tickerFromRealitySymbol(reality);
  if (!ticker) return null;
  const known = DIRECTORY[ticker];
  const logoKey = known?.logoKey ?? "monogram";
  return {
    companyName: known?.companyName ?? `Stock ${ticker}`,
    ticker,
    realityTicker: reality,
    logoKey,
    markKind: stockMarkKind(logoKey),
    perpTicker,
    researchFamilies: ["spot-structure"],
  };
}

/** Build a truthful display identity from a validated normal ticker. */
export function stockFromTicker(ticker: string): StockIdentityData | null {
  const cleaned = clean(ticker);
  const normal = tickerFromRealitySymbol(cleaned) ?? cleaned.replace(/USDT$/, "");
  if (!/^[A-Z][A-Z0-9]{0,11}$/.test(normal)) return null;
  const known = DIRECTORY[normal];
  const logoKey = known?.logoKey ?? "monogram";
  return {
    companyName: known?.companyName ?? "Stock " + normal,
    ticker: normal,
    logoKey,
    markKind: stockMarkKind(logoKey),
  };
}

/**
 * The one canonical live capability catalog used by discovery and research.
 * A row is advertised only when the current Bitget spot instrument is online
 * and marked as Reality. Optional positioning is attached only when the live
 * futures listing is also an RWA instrument.
 */
export function buildResearchableStockCatalog(spot: SpotInstrument[], fut: FutInstrument[]): DiscoveredStock[] {
  const perps = new Set(fut.filter((row) => String(row.isRwa).toUpperCase() === "YES").map((row) => row.symbol));
  return spot
    .filter((row) => row.isReality === "yes" && row.status === "online")
    .map((row) => {
      const ticker = tickerFromRealitySymbol(row.symbol);
      const perp = ticker && perps.has(`${ticker}USDT`) ? `${ticker}USDT` : null;
      const stock = stockFromRealityTicker(row.symbol, perp);
      return stock ? { ...stock, researchFamilies: perp ? ["spot-structure", "perp-positioning"] : ["spot-structure"] } : null;
    })
    .filter((stock): stock is DiscoveredStock => stock !== null)
    .sort((a, b) => a.companyName.localeCompare(b.companyName) || a.ticker.localeCompare(b.ticker));
}

export function researchableRealityStocks(spot: SpotInstrument[], fut: FutInstrument[]): DiscoveredStock[] {
  return buildResearchableStockCatalog(spot, fut);
}

/** Resolve aliases against the same live catalog that powers the stock browser. */
export function resolveResearchableStock(
  mention: string | null | undefined,
  spot: SpotInstrument[],
  fut: FutInstrument[],
  requestedTicker?: string | null,
  requestedRealityTicker?: string | null,
): DiscoveredStock | null {
  const catalog = buildResearchableStockCatalog(spot, fut);
  const requestedReality = requestedRealityTicker ? clean(requestedRealityTicker) : "";
  const requestedNormal = requestedTicker ? clean(requestedTicker).replace(/^R/, "").replace(/USDT$/, "") : "";
  const requested = catalog.find((stock) =>
    (requestedReality && stock.realityTicker === requestedReality) ||
    (requestedNormal && stock.ticker === requestedNormal),
  );
  return requested ?? findStockByMention(mention, catalog);
}

function identityTerms(stock: StockIdentityData): string[] {
  const known = DIRECTORY[stock.ticker];
  return [
    stock.companyName,
    stock.ticker,
    ...("realityTicker" in stock && typeof stock.realityTicker === "string" ? [stock.realityTicker] : []),
    `R${stock.ticker}`,
    ...(known?.aliases ?? []),
  ].map(cleanWords).filter(Boolean);
}

function termsOverlap(term: string, query: string): boolean {
  if (term.includes(query)) return true;
  return term.length >= 4 && query.length >= 4 && query.includes(term);
}

export function stockMatchesQuery(stock: StockIdentityData, query: string): boolean {
  const q = cleanWords(query);
  if (!q) return true;
  return identityTerms(stock).some((term) => termsOverlap(term, q));
}

export function findStockByMention<T extends StockIdentityData>(mention: string | null | undefined, stocks: T[]): T | null {
  if (!mention) return null;
  const q = cleanWords(mention);
  if (!q) return null;
  const exact = stocks.find((stock) => identityTerms(stock).some((term) => term === q));
  if (exact) return exact;
  return stocks.find((stock) => identityTerms(stock).some((term) => termsOverlap(term, q))) ?? null;
}

export function normalTickerLabel(stock: StockIdentityData): string {
  return stock.ticker;
}

export function realityTickerLabel(stock: StockIdentityData): string {
  return `r${stock.ticker}`;
}

export function stockPrompt(stock: StockIdentityData): string {
  return `I am considering ${stock.companyName} (${normalTickerLabel(stock)}). Should I buy now or wait?`;
}

export function displayStockFromMention(mention: string | null | undefined, stocks: StockIdentityData[]): StockIdentityData | null {
  return findStockByMention(mention, stocks) ?? (mention ? stockFromRealityTicker(mention) ?? stockFromTicker(mention) : null);
}
