import { z } from "zod";
import type { Freshness, Provenance, ResearchFamily } from "../domain/types";
import { BitgetError } from "./bitget/errors";
import type { FetchImpl } from "./bitget/client";
import {
  getTicker, getCandles, getOrderbook, getPerpPositioning,
  type Candle, type DepthSnapshot, type PriceSnapshot, type PerpPositioning,
} from "./bitget/index";
import type { Interval } from "./bitget/endpoints";

// Structured research result. Facts are deterministic calculations; never prose.
export const ResearchStatus = z.enum(["ok", "no-data", "unsupported", "error"]);
export type ResearchStatus = z.infer<typeof ResearchStatus>;
export interface ResearchResult {
  family: ResearchFamily;
  status: ResearchStatus;
  facts: Record<string, number | string | boolean | null>;
  evidence: { freshness: Freshness; provenance: Provenance }[];
  error?: { code: string; message: string };
}

// Provisional qualitative bands (P10/P12/P16 calibrate against live data).
// Labeled provisional; numeric facts always preserved alongside bands.
export const BANDS = {
  SPREAD_WIDE_BPS: 10,
  DISLOCATION_WIDE_BPS: 15,
  MOVE_LARGE_PCT: 2,
  FUNDING_ELEVATED: 0.0005,
  FUNDING_EXTREME: 0.001,
} as const;

export type SpotNeed = "ticker" | "candles" | "depth";
export type PerpNeed = "ticker" | "candles";

function bpsSpread(bid: number, ask: number, mid: number): number {
  if (!(mid > 0)) return Number.NaN;
  return ((ask - bid) / mid) * 10_000;
}

export async function investigateSpot(
  symbol: string,
  need: SpotNeed[],
  interval: Interval = "15m",
  fetchImpl?: FetchImpl,
): Promise<ResearchResult> {
  const evidence: ResearchResult["evidence"] = [];
  const facts: ResearchResult["facts"] = {};
  const want = new Set(need);
  try {
    if (want.has("ticker") || want.has("depth") || want.size === 0) {
      const t = await getTicker("SPOT", symbol, fetchImpl);
      evidence.push({ freshness: t.freshness, provenance: t.provenance });
      const p: PriceSnapshot = t.value;
      const mid = (p.bid + p.ask) / 2;
      const spreadBps = bpsSpread(p.bid, p.ask, mid);
      facts.last = p.last;
      facts.change24hPcnt = p.changePcnt24h;
      facts.spreadBps = Number.isFinite(spreadBps) ? Math.round(spreadBps * 100) / 100 : null;
      facts.spreadWide = Number.isFinite(spreadBps) ? spreadBps >= BANDS.SPREAD_WIDE_BPS : null;
      facts.bidSize = p.bidSize;
      facts.askSize = p.askSize;
    }
    if (want.has("candles")) {
      const c = await getCandles("SPOT", symbol, interval, 20, fetchImpl);
      evidence.push({ freshness: c.freshness, provenance: c.provenance });
      const cs: Candle[] = c.value;
      const first = cs[0];
      const lastC = cs[cs.length - 1];
      const movePct = ((lastC.c - first.o) / first.o) * 100;
      facts.windowMovePcnt = Math.round(movePct * 100) / 100;
      facts.windowCandles = cs.length;
      facts.interval = interval;
      const ranges = cs.map((k) => (k.h - k.l) / k.o);
      facts.avgRangePct = Math.round((ranges.reduce((a, b) => a + b, 0) / ranges.length) * 10000) / 100;
      facts.supportLevel = Math.min(...cs.map((k) => k.l));
      facts.resistanceLevel = Math.max(...cs.map((k) => k.h));
      facts.lastVolume = cs[cs.length - 1].vol;
    }
    if (want.has("depth")) {
      const d = await getOrderbook(symbol, 10, fetchImpl);
      evidence.push({ freshness: d.freshness, provenance: d.provenance });
      const b: DepthSnapshot = d.value;
      const bidN = b.bids.slice(0, 5).reduce((a: number, l) => a + l.size, 0);
      const askN = b.asks.slice(0, 5).reduce((a: number, l) => a + l.size, 0);
      facts.topBidSize = b.bids[0]?.size ?? null;
      facts.topAskSize = b.asks[0]?.size ?? null;
      facts.depthImbalance = bidN + askN > 0 ? Math.round(((bidN - askN) / (bidN + askN)) * 100) / 100 : null;
    }
    return { family: "spot-structure", status: "ok", facts, evidence };
  } catch (e) {
    if (e instanceof BitgetError && (e.code === "NO_DATA" || e.code === "UNSUPPORTED" || e.code === "INVALID_INPUT")) {
      return { family: "spot-structure", status: e.code === "INVALID_INPUT" ? "error" : "no-data", facts, evidence, error: { code: e.code, message: e.message } };
    }
    const code = e instanceof BitgetError ? e.code : "UPSTREAM_FAILURE";
    return { family: "spot-structure", status: "error", facts, evidence, error: { code, message: e instanceof Error ? e.message : String(e) } };
  }
}

export async function investigatePositioning(
  perpSymbol: string,
  need: PerpNeed[],
  fetchImpl?: FetchImpl,
): Promise<ResearchResult> {
  const evidence: ResearchResult["evidence"] = [];
  const facts: ResearchResult["facts"] = {};
  const want = new Set(need);
  try {
    if (want.has("ticker") || want.size === 0) {
      const p = await getPerpPositioning(perpSymbol, fetchImpl);
      evidence.push({ freshness: p.freshness, provenance: p.provenance });
      const v: PerpPositioning = p.value;
      facts.fundingRate = v.fundingRate;
      facts.fundingElevated = v.fundingRate >= BANDS.FUNDING_ELEVATED;
      facts.fundingExtreme = v.fundingRate >= BANDS.FUNDING_EXTREME;
      facts.openInterest = v.openInterest;
      const dislocBps = ((v.markPrice - v.indexPrice) / v.indexPrice) * 10_000;
      facts.markIndexDislocationBps = Math.round(dislocBps * 100) / 100;
      facts.dislocationWide = dislocBps >= BANDS.DISLOCATION_WIDE_BPS;
      facts.markPrice = v.markPrice;
      facts.indexPrice = v.indexPrice;
    }
    if (want.has("candles")) {
      const c = await getCandles("USDT-FUTURES", perpSymbol, "1H", 10, fetchImpl);
      evidence.push({ freshness: c.freshness, provenance: c.provenance });
      const cs = c.value;
      facts.perpMovePcnt = Math.round(((cs[cs.length - 1].c - cs[0].o) / cs[0].o) * 10000) / 100;
      facts.perpCandles = cs.length;
    }
    return { family: "perp-positioning", status: "ok", facts, evidence };
  } catch (e) {
    if (e instanceof BitgetError && (e.code === "NO_DATA" || e.code === "UNSUPPORTED" || e.code === "INVALID_INPUT")) {
      return { family: "perp-positioning", status: e.code === "INVALID_INPUT" ? "error" : "no-data", facts, evidence, error: { code: e.code, message: e.message } };
    }
    const code = e instanceof BitgetError ? e.code : "UPSTREAM_FAILURE";
    return { family: "perp-positioning", status: "error", facts, evidence, error: { code, message: e instanceof Error ? e.message : String(e) } };
  }
}

// Explicit registry: exactly two v1 families. Unknown family never executes.
const REGISTRY = { "spot-structure": true, "perp-positioning": true } as const;
export function assertSupportedFamily(family: string): asserts family is ResearchFamily {
  if (!(family in REGISTRY)) {
    throw new BitgetError("UNSUPPORTED", "research-registry", `Research family not registered: ${family}`);
  }
}
