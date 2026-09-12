import { z } from "zod";
import type { Freshness, Provenance } from "../../domain/types";
import { BitgetError } from "./errors";
import { bitgetGet, type FetchImpl } from "./client";
import {
  CandleRow, DepthBook, FutInstrument, FutTickerRow, SpotInstrument, SpotTickerRow,
  candlesUrl, instrumentsUrl, orderbookUrl, tickerUrl, openInterestUrl,
  parseEnvelope, type Category, type Interval,
} from "./endpoints";

// ---- Bounded normalized evidence (never raw exchange dumps downstream) ----
export const PriceSnapshot = z.object({
  symbol: z.string(), last: z.number(), open24h: z.number(), high24h: z.number(), low24h: z.number(),
  bid: z.number(), ask: z.number(), bidSize: z.number(), askSize: z.number(),
  changePcnt24h: z.number(), volume24h: z.number(), turnover24h: z.number(),
});
export type PriceSnapshot = z.infer<typeof PriceSnapshot>;

export const Candle = z.object({ ts: z.number(), o: z.number(), h: z.number(), l: z.number(), c: z.number(), vol: z.number(), turnover: z.number() });
export type Candle = z.infer<typeof Candle>;

export const DepthLevel = z.object({ price: z.number(), size: z.number() });
export const DepthSnapshot = z.object({ asks: z.array(DepthLevel), bids: z.array(DepthLevel) });
export type DepthSnapshot = z.infer<typeof DepthSnapshot>;

export const PerpPositioning = z.object({
  symbol: z.string(), fundingRate: z.number(), openInterest: z.number(),
  markPrice: z.number(), indexPrice: z.number(), lastPrice: z.number(),
});
export type PerpPositioning = z.infer<typeof PerpPositioning>;

export interface Evidenced<T> { value: T; freshness: Freshness; provenance: Provenance; }

function stamp(symbol: string, endpointFamily: string, evidenceType: string, sourceTs: string | null): { freshness: Freshness; provenance: Provenance } {
  const fetchedAt = new Date().toISOString();
  const sourceTimestamp = sourceTs && /^\d+$/.test(sourceTs) ? new Date(Number(sourceTs)).toISOString() : null;
  const ageMs = sourceTimestamp ? Math.max(0, Date.now() - Date.parse(sourceTimestamp)) : null;
  return {
    freshness: { source: "bitget", symbol, observedAt: fetchedAt, sourceTimestamp, fetchedAt, ageMs, status: sourceTimestamp ? "fresh" : "missing" },
    provenance: { endpointFamily, symbol, evidenceType, sourceTimestamp, fetchedAt },
  };
}
const num = (v: string, what: string, family: string): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BitgetError("MALFORMED_RESPONSE", family, `Non-numeric ${what}: ${v}`);
  return n;
};

export async function discoverSpot(fetchImpl?: FetchImpl): Promise<SpotInstrument[]> {
  const raw = await bitgetGet<unknown>(instrumentsUrl("SPOT"), "v3-instruments", 12000, fetchImpl ?? fetch);
  const env = parseEnvelope({ code: "00000", msg: "ok", data: raw }, "v3-instruments");
  const rows = z.array(SpotInstrument).safeParse(env);
  if (!rows.success) throw new BitgetError("MALFORMED_RESPONSE", "v3-instruments", "Instrument rows failed validation");
  return rows.data;
}
export function realitySymbols(instruments: SpotInstrument[]): string[] {
  return instruments.filter((r) => r.isReality === "yes" && r.status === "online").map((r) => r.symbol);
}

export async function discoverFutures(fetchImpl?: FetchImpl): Promise<FutInstrument[]> {
  const raw = await bitgetGet<unknown>(instrumentsUrl("USDT-FUTURES"), "v3-instruments-fut", 12000, fetchImpl ?? fetch);
  const env = parseEnvelope({ code: "00000", msg: "ok", data: raw }, "v3-instruments-fut");
  const rows = z.array(FutInstrument).safeParse(env);
  if (!rows.success) throw new BitgetError("MALFORMED_RESPONSE", "v3-instruments-fut", "Instrument rows failed validation");
  return rows.data;
}
/** Map spot Reality symbol to its stock perp ONLY when both instruments exist. Never R-strip blindly. */
export function mapSpotToPerp(spotSymbol: string, spot: SpotInstrument[], fut: FutInstrument[]): string | null {
  const s = spot.find((r) => r.symbol === spotSymbol && r.isReality === "yes");
  if (!s) return null;
  const base = s.symbol.replace(/USDT$/, "");
  const core = base.startsWith("R") ? base.slice(1) : base;
  const match = fut.find((r) => r.symbol === `${core}USDT` && String(r.isRwa).toUpperCase() === "YES");
  return match ? match.symbol : null;
}

export async function getTicker(category: Category, symbol: string, fetchImpl?: FetchImpl): Promise<Evidenced<PriceSnapshot>> {
  const raw = await bitgetGet<unknown>(tickerUrl(category, symbol), "v3-ticker", 12000, fetchImpl ?? fetch);
  const env = parseEnvelope({ code: "00000", msg: "ok", data: raw }, "v3-ticker");
  const rows = z.array(category === "SPOT" ? SpotTickerRow : FutTickerRow).safeParse(env);
  if (!rows.success || rows.data.length === 0) throw new BitgetError("NO_DATA", "v3-ticker", `No ticker rows for ${symbol}`);
  const r = rows.data[0] as z.infer<typeof SpotTickerRow>;
  const value: PriceSnapshot = {
    symbol: r.symbol, last: num(r.lastPrice, "last", "v3-ticker"), open24h: num(r.openPrice24h, "open", "v3-ticker"),
    high24h: num(r.highPrice24h, "high", "v3-ticker"), low24h: num(r.lowPrice24h, "low", "v3-ticker"),
    bid: num(r.bid1Price, "bid", "v3-ticker"), ask: num(r.ask1Price, "ask", "v3-ticker"),
    bidSize: num(r.bid1Size, "bidSize", "v3-ticker"), askSize: num(r.ask1Size, "askSize", "v3-ticker"),
    changePcnt24h: num(r.price24hPcnt, "change", "v3-ticker"), volume24h: num(r.volume24h, "volume", "v3-ticker"),
    turnover24h: num(r.turnover24h, "turnover", "v3-ticker"),
  };
  return { value, ...stamp(symbol, "v3-ticker", "ticker", r.ts) };
}

export async function getCandles(category: Category, symbol: string, interval: Interval, limit: number, fetchImpl?: FetchImpl): Promise<Evidenced<Candle[]>> {
  const raw = await bitgetGet<unknown>(candlesUrl(category, symbol, interval, limit), "v3-candles", 12000, fetchImpl ?? fetch);
  const env = parseEnvelope({ code: "00000", msg: "ok", data: raw }, "v3-candles");
  const rows = z.array(CandleRow).safeParse(env);
  if (!rows.success) throw new BitgetError("MALFORMED_RESPONSE", "v3-candles", `Bad candles for ${symbol}`);
  if (rows.data.length === 0) throw new BitgetError("NO_DATA", "v3-candles", `No candles for ${symbol}`);
  const value: Candle[] = rows.data.map((c) => ({
    ts: Number(c[0]), o: num(c[1], "o", "v3-candles"), h: num(c[2], "h", "v3-candles"),
    l: num(c[3], "l", "v3-candles"), c: num(c[4], "c", "v3-candles"),
    vol: num(c[5], "vol", "v3-candles"), turnover: num(c[6], "turnover", "v3-candles"),
  }));
  const latest = String(rows.data[rows.data.length - 1][0]);
  return { value, ...stamp(symbol, "v3-candles", `candles-${interval}`, latest) };
}

export async function getOrderbook(symbol: string, limit: number, fetchImpl?: FetchImpl): Promise<Evidenced<DepthSnapshot>> {
  const raw = await bitgetGet<unknown>(orderbookUrl("SPOT", symbol, limit), "v3-orderbook", 12000, fetchImpl ?? fetch);
  const env = parseEnvelope({ code: "00000", msg: "ok", data: raw }, "v3-orderbook");
  const book = DepthBook.safeParse(env);
  if (!book.success) throw new BitgetError("MALFORMED_RESPONSE", "v3-orderbook", `Bad book for ${symbol}`);
  if (book.data.a.length === 0 || book.data.b.length === 0) throw new BitgetError("NO_DATA", "v3-orderbook", `Empty book for ${symbol}`);
  const value: DepthSnapshot = {
    asks: book.data.a.map(([price, size]) => ({ price: Number(price), size })),
    bids: book.data.b.map(([price, size]) => ({ price: Number(price), size })),
  };
  return { value, ...stamp(symbol, "v3-orderbook", "orderbook", book.data.ts) };
}

export async function getPerpPositioning(symbol: string, fetchImpl?: FetchImpl): Promise<Evidenced<PerpPositioning>> {
  const raw = await bitgetGet<unknown>(tickerUrl("USDT-FUTURES", symbol), "v3-perp-ticker", 12000, fetchImpl ?? fetch);
  const env = parseEnvelope({ code: "00000", msg: "ok", data: raw }, "v3-perp-ticker");
  const rows = z.array(FutTickerRow).safeParse(env);
  if (!rows.success || rows.data.length === 0) throw new BitgetError("NO_DATA", "v3-perp-ticker", `No perp ticker for ${symbol}`);
  const r = rows.data[0];
  if (r.fundingRate === undefined || r.openInterest === undefined || r.markPrice === undefined || r.indexPrice === undefined) {
    throw new BitgetError("NO_DATA", "v3-perp-ticker", `Perp positioning fields absent for ${symbol}`);
  }
  const value: PerpPositioning = {
    symbol: r.symbol, fundingRate: num(r.fundingRate, "funding", "v3-perp-ticker"),
    openInterest: num(r.openInterest, "oi", "v3-perp-ticker"), markPrice: num(r.markPrice, "mark", "v3-perp-ticker"),
    indexPrice: num(r.indexPrice, "index", "v3-perp-ticker"), lastPrice: num(r.lastPrice, "last", "v3-perp-ticker"),
  };
  return { value, ...stamp(symbol, "v3-perp-ticker", "perp-positioning", r.ts) };
}

export async function getOpenInterest(symbol: string, fetchImpl?: FetchImpl): Promise<Evidenced<{ symbol: string; openInterest: number }>> {
  const raw = await bitgetGet<unknown>(openInterestUrl(symbol), "v3-open-interest", 12000, fetchImpl ?? fetch);
  const env = parseEnvelope({ code: "00000", msg: "ok", data: raw }, "v3-open-interest");
  const parsed = z.object({ list: z.array(z.object({ symbol: z.string(), openInterest: z.string() })), ts: z.string() }).safeParse(env);
  if (!parsed.success || parsed.data.list.length === 0) throw new BitgetError("NO_DATA", "v3-open-interest", `No OI for ${symbol}`);
  const row = parsed.data.list[0];
  return { value: { symbol: row.symbol, openInterest: num(row.openInterest, "oi", "v3-open-interest") }, ...stamp(symbol, "v3-open-interest", "open-interest", parsed.data.ts) };
}
