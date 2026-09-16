import { z } from "zod";
import { BitgetError } from "./errors";

// Fixed trusted Bitget surface. No user- or model-supplied hosts, ever.
export const BITGET_BASE = "https://api.bitget.com";
const V3 = "/api/v3/market";
const REALITY_V3 = "/api/v3/reality/market";

export type Category = "SPOT" | "USDT-FUTURES";
export type Interval = "1m" | "5m" | "15m" | "1H" | "4H" | "1D";

export function instrumentsUrl(category: Category): string {
  return `${BITGET_BASE}${V3}/instruments?category=${category}`;
}
export function stockInfoUrl(): string {
  return `${BITGET_BASE}${REALITY_V3}/stock-info`;
}
export function tickerUrl(category: Category, symbol: string): string {
  return `${BITGET_BASE}${V3}/tickers?category=${category}&symbol=${encodeURIComponent(symbol)}`;
}
export function candlesUrl(category: Category, symbol: string, interval: Interval, limit: number): string {
  return `${BITGET_BASE}${V3}/candles?category=${category}&symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
}
export function orderbookUrl(category: "SPOT", symbol: string, limit: number): string {
  return `${BITGET_BASE}${V3}/orderbook?category=${category}&symbol=${encodeURIComponent(symbol)}&limit=${limit}`;
}
export function openInterestUrl(symbol: string): string {
  return `${BITGET_BASE}${V3}/open-interest?category=USDT-FUTURES&symbol=${encodeURIComponent(symbol)}`;
}

// ---- Upstream response shapes (validated before use) ----
const ApiEnvelope = z.object({ code: z.string(), msg: z.string(), requestTime: z.number().optional(), data: z.unknown() });

export const SpotInstrument = z.object({
  symbol: z.string(), category: z.string(), status: z.string(),
  isReality: z.string().optional(), pricePrecision: z.string().optional(),
  minOrderQty: z.string().optional(), baseCoin: z.string().optional(),
  quoteCoin: z.string().optional(), isRwa: z.string().optional(),
  symbolType: z.string().optional(),
});
export type SpotInstrument = z.infer<typeof SpotInstrument>;

export const FutInstrument = z.object({
  symbol: z.string(), category: z.string(), symbolType: z.string().optional(),
  isRwa: z.string().optional(), makerFeeRate: z.string().optional(), takerFeeRate: z.string().optional(),
  status: z.string().optional(), baseCoin: z.string().optional(), quoteCoin: z.string().optional(),
});
export type FutInstrument = z.infer<typeof FutInstrument>;

export const RealityStockInfo = z.object({
  symbol: z.string(),
  code: z.string(),
  // Live stock-info returns name:null for listed Reality symbols (proven
  // 2026-09-16 for RAAPL/RMETA/RNVDA); company identity falls back to the
  // CLINCH directory or a neutral ticker label, never to invented support.
  name: z.string().nullish(),
  tradingPeriod: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
  weekendTradable: z.string().nullish(),
});
export type RealityStockInfo = z.infer<typeof RealityStockInfo>;

export const SpotTickerRow = z.object({
  category: z.string(), symbol: z.string(), ts: z.string(),
  lastPrice: z.string(), openPrice24h: z.string(), highPrice24h: z.string(), lowPrice24h: z.string(),
  ask1Price: z.string(), bid1Price: z.string(), bid1Size: z.string(), ask1Size: z.string(),
  price24hPcnt: z.string(), volume24h: z.string(), turnover24h: z.string(),
});
export type SpotTickerRow = z.infer<typeof SpotTickerRow>;

export const FutTickerRow = SpotTickerRow.extend({
  indexPrice: z.string().optional(), markPrice: z.string().optional(),
  fundingRate: z.string().optional(), openInterest: z.string().optional(),
});
export type FutTickerRow = z.infer<typeof FutTickerRow>;

export const CandleRow = z.tuple([z.string(), z.string(), z.string(), z.string(), z.string(), z.string(), z.string()]);
export type CandleRow = z.infer<typeof CandleRow>;

export const DepthBook = z.object({
  a: z.array(z.tuple([z.coerce.number(), z.coerce.number()])),
  b: z.array(z.tuple([z.coerce.number(), z.coerce.number()])),
  ts: z.string(),
});
export type DepthBook = z.infer<typeof DepthBook>;

export function parseEnvelope(raw: unknown, endpointFamily: string): unknown {
  const env = ApiEnvelope.safeParse(raw);
  if (!env.success) {
    throw new BitgetError("MALFORMED_RESPONSE", endpointFamily, "Response envelope failed validation");
  }
  return env.data.data;
}
