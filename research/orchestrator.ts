import { decide, applyOutcome, type Candidate, type KernelState, type KernelOutput } from "../domain/kernel";
import { compileSemantics, type RawFacts } from "../domain/semantics";
import { investigateSpot, investigatePositioning, type ResearchResult } from "./index";
import type { FetchImpl } from "./bitget/client";
import { BANDS } from "../config/thresholds";

// Provisional conjunction for thin-book classification (P16 calibrates per
// instrument; conservative by design: needs BOTH tiny top sizes AND wide spread).
const TOP_SIZE_THIN = 1.0;

// ---- Fact mapping: normalized research facts -> compiler raw state ----
export interface MarketFacts {
  spot?: { movePct24h?: number | null; spreadBps?: number | null; spreadWide?: boolean | null;
    topBidSize?: number | null; topAskSize?: number | null; depthImbalance?: number | null;
    windowMovePcnt?: number | null; supportLevel?: number | null; resistanceLevel?: number | null;
    lastVolume?: number | null; last?: number | null };
  perp?: { fundingRate?: number | null; openInterest?: number | null;
    markIndexDislocationBps?: number | null; perpMovePcnt?: number | null };
}
export function factsToRaw(base: {
  action: string; read: string; asset: string; context: string;
  facts: MarketFacts; data: Record<string, string>; resolved: string[]; known: string[];
}): RawFacts {
  const f = base.facts;
  const drift: RawFacts["spot"] = { move: "flat", spread: "normal", book: "healthy", drift: "flat", support: "unknown" };
  const sp = f.spot;
  if (sp) {
    if (sp.windowMovePcnt !== undefined && sp.windowMovePcnt !== null) {
      drift.move = Math.abs(sp.windowMovePcnt) >= 1.5 ? (sp.windowMovePcnt > 0 ? "sharp-up-20min" : "drift-down") : "flat";
      drift.drift = (sp.windowMovePcnt ?? 0) <= -1.5 ? "down-quiet" : "flat";
    }
    if (sp.spreadWide === true) drift.spread = "wide";
    const tinyTop = (sp.topBidSize ?? 99) < TOP_SIZE_THIN && (sp.topAskSize ?? 99) < TOP_SIZE_THIN;
    if (tinyTop && drift.spread === "wide") drift.book = "thin";
    if (sp.supportLevel !== undefined && sp.supportLevel !== null && sp.last !== undefined && sp.last !== null) {
      // Provisional proximity band (P16 calibrates); only routes to template applicability.
      drift.support = sp.last <= sp.supportLevel * 1.005 ? "testing" : "holding";
    }
  }
  const pos: RawFacts["positioning"] = { funding: "normal", oi: "ordinary", dislocation: "none" };
  const pp = f.perp;
  if (pp) {
    if (pp.fundingRate !== undefined && pp.fundingRate !== null) {
      pos.funding = pp.fundingRate >= BANDS.FUNDING_EXTREME ? "extreme" : pp.fundingRate >= BANDS.FUNDING_ELEVATED ? "elevated" : "normal";
    }
    if (pp.markIndexDislocationBps !== undefined && pp.markIndexDislocationBps !== null &&
        Math.abs(pp.markIndexDislocationBps) >= BANDS.DISLOCATION_WIDE_BPS) pos.dislocation = "wide";
  }
  return {
    action: base.action, read: base.read, spot: drift, positioning: pos,

    data: base.data, resolved: base.resolved,
  };
}

// Topic -> minimal executor need (selective fetching only).
export function needForTopic(topic: string | undefined): { family: "spot-structure" | "perp-positioning"; spot: ("ticker" | "candles" | "depth")[]; perp: ("ticker" | "candles")[] } | null {
  switch (topic) {
    case "move-reality": return { family: "spot-structure", spot: ["ticker", "candles", "depth"], perp: [] };
    case "structure-direction": return { family: "spot-structure", spot: ["ticker", "candles"], perp: [] };
    case "crowd-timing": return { family: "perp-positioning", spot: [], perp: ["ticker"] };
    case "dislocation": return { family: "perp-positioning", spot: ["ticker"], perp: ["ticker"] };
    default: return null;
  }
}

// Deterministic finding classification: hinge topic + facts -> branch outcome or null.
// Conservative: returns null when evidence does not clearly match a branch.
export function classifyFinding(topic: string | undefined, facts: MarketFacts): string | null {
  const sp = facts.spot ?? {};
  const pp = facts.perp ?? {};
  if (topic === "move-reality") {
    if (sp.spreadWide === true) return "thin print, no follow-through [thin-artifact]";
    if (sp.spreadWide === false) return "real move on rebuilding depth [genuine-move]";
    return null;
  }
  if (topic === "structure-direction") {
    if (sp.supportLevel !== undefined && sp.last !== undefined && sp.supportLevel !== null && sp.last !== null) {
      if (sp.windowMovePcnt !== undefined && sp.windowMovePcnt !== null && sp.windowMovePcnt <= -1 &&
          sp.last < sp.supportLevel * 1.002) return "breakdown on expanding volume [breakdown]";
      return "exhaustion, support holding [exhaustion]";
    }
    return null;
  }
  if (topic === "crowd-timing") {
    if (pp.fundingRate === undefined || pp.fundingRate === null) return null;
    return pp.fundingRate >= BANDS.FUNDING_EXTREME
      ? "extreme crowding [crowded]"
      : "normal positioning [calm]";
  }
  if (topic === "dislocation") {
    if (pp.markIndexDislocationBps === undefined || pp.markIndexDislocationBps === null) return null;
    return Math.abs(pp.markIndexDislocationBps) >= BANDS.DISLOCATION_WIDE_BPS
      ? "persistent, hedgeable gap [persistent]"
      : "mirage, quotes normalize [mirage]";
  }
  return null;
}

// Baseline establishment (P6 lifecycle): the minimal context bundle that grounds
// the first compile: spot ticker + short candles + top depth, plus perp ticker.
// Hinge-selected research stays selective afterwards; baseline is context, not research.
export async function establishBaseline(
  spotSymbol: string,
  perpSymbol: string | null,
  fetchImpl?: FetchImpl,
): Promise<{ facts: MarketFacts; evidence: { freshness: unknown; provenance: unknown }[]; problems: string[] }> {
  const facts: MarketFacts = {};
  const evidence: { freshness: unknown; provenance: unknown }[] = [];
  const problems: string[] = [];
  const t = await investigateSpot(spotSymbol, ["ticker", "candles", "depth"], "1H", fetchImpl);
  mergeFacts(facts, "spot-structure", t.facts);
  if (t.evidence.length) evidence.push(...t.evidence);
  if (t.status !== "ok") problems.push(`spot baseline ${t.status}: ${t.error?.code ?? "unknown"}`);
  if (perpSymbol) {
    const p = await investigatePositioning(perpSymbol, ["ticker"], fetchImpl);
    mergeFacts(facts, "perp-positioning", p.facts);
    if (p.evidence.length) evidence.push(...p.evidence);
    if (p.status === "no-data") problems.push(`perp baseline unavailable (treated as missing, never as evidence)`);
    else if (p.status !== "ok") problems.push(`perp baseline ${p.status}: ${p.error?.code ?? "unknown"}`);
  }
  return { facts, evidence, problems };
}
export interface LoopIO {
  fetchImpl?: FetchImpl;
  persistStep(kind: string, family: string | null, summary: unknown, provenance: unknown): Promise<void>;
  emit(event: { type: string; data: unknown }): void;
}

export interface LoopState {
  read: string;
  resolvedTopics: string[];
  facts: MarketFacts;
  skips: { check: string; reason: string }[];
  uncertainty: string[];
  hingeHistory: { hinge: string; verdict: string }[];
  stopReason: string | null;
}

// One orchestrator step: compile -> kernel -> optional single research -> state update.
// Returns the kernel output; caller persists session + loops (cap enforced by caller).
export async function orchestratorStep(
  input: { asset: string; spotSymbol: string; perpSymbol: string | null; action: string;
    read: string; resolvedTopics: string[]; facts: MarketFacts;
    data: Record<string, string>; context: string; known: string[] },
  io: LoopIO,
): Promise<{ output: KernelOutput; state: LoopState; research?: ResearchResult }> {
  const raw: RawFacts = factsToRaw({ ...input, resolved: input.resolvedTopics });
  const pkg = compileSemantics(raw);
  const state: KernelState = {
    step: 1, read: input.read,
    resolved: pkg.candidates.filter((c) => c.resolved).map((c) => c.id),
    mooted: {}, data: { ...input.data },
  };
  // map pre-resolved pseudo-ids back to topics for kernel skip reasons
  const scen = { id: "live", action: input.action, candidates: pkg.candidates };
  const output = decide(scen, state);
  const st: LoopState = {
    read: state.read, resolvedTopics: [...input.resolvedTopics],
    facts: input.facts, skips: [], uncertainty: [], hingeHistory: [], stopReason: null,
  };
  for (const s of output.skips) st.skips.push({ check: s.family, reason: s.reason });
  if (output.action === "RESEARCH" && output.hinge) {
    const q = pkg.candidates.find((c) => c.id === output.hinge)!;
    const topic = q.topic;
    const need = needForTopic(topic);
    if (!need) {
      st.uncertainty.push(`No executor mapping for hinge topic; awaiting capability proof.`);
      return { output, state: st };
    }
    let research: ResearchResult;
    if (need.family === "spot-structure") {
      research = await investigateSpot(input.spotSymbol, need.spot.length ? need.spot : ["ticker"], "15m", io.fetchImpl);
    } else {
      if (!input.perpSymbol) {
        st.uncertainty.push("Positioning hinge selected but no corresponding perp instrument exists.");
        return { output, state: st };
      }
      research = await investigatePositioning(input.perpSymbol, need.perp.length ? need.perp : ["ticker"], io.fetchImpl);
    }
    await io.persistStep("research", need.family, { hinge: output.hinge, facts: research.facts, status: research.status },
      research.evidence.map((e) => e.provenance));
    if (research.status !== "ok") {
      st.uncertainty.push(`${need.family} returned ${research.status}; treated as unavailable, never as evidence.`);
      return { output, state: st, research };
    }
    mergeFacts(st.facts, need.family, research.facts);
    const outcome = classifyFinding(topic, st.facts);
    if (outcome) {
      const before = st.read;
      const next = applyBranchEffect(topic, outcome, st.read, input.action);
      st.read = next;
      st.hingeHistory.push({ hinge: output.hinge, verdict: `${outcome} :: ${before} -> ${next}` });
    } else {
      st.uncertainty.push(`Finding on ${topic ?? "unknown"} did not clearly match a branch; read unchanged.`);
      st.hingeHistory.push({ hinge: output.hinge, verdict: "inconclusive; read unchanged" });
    }
    return { output, state: st, research };
  }
  if (output.action === "STOP") st.stopReason = output.why;
  if (output.action === "CANNOT_RESOLVE") st.uncertainty.push(output.why);
  return { output, state: st };
}

function mergeFacts(into: MarketFacts, family: string, facts: Record<string, number | string | boolean | null>) {
  const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  if (family === "spot-structure") {
    into.spot = into.spot ?? {};
    if (typeof facts.last === "number") into.spot.last = facts.last;
    if (typeof facts.change24hPcnt === "number") into.spot.movePct24h = facts.change24hPcnt;
    if (typeof facts.spreadBps === "number") into.spot.spreadBps = facts.spreadBps;
    if (typeof facts.spreadWide === "boolean") into.spot.spreadWide = facts.spreadWide;
    if (facts.topBidSize !== undefined) into.spot.topBidSize = n(facts.topBidSize);
    if (facts.topAskSize !== undefined) into.spot.topAskSize = n(facts.topAskSize);
    if (typeof facts.windowMovePcnt === "number") into.spot.windowMovePcnt = facts.windowMovePcnt;
    if (typeof facts.supportLevel === "number") into.spot.supportLevel = facts.supportLevel;
    if (typeof facts.resistanceLevel === "number") into.spot.resistanceLevel = facts.resistanceLevel;
    if (typeof facts.lastVolume === "number") into.spot.lastVolume = facts.lastVolume;
  } else {
    into.perp = into.perp ?? {};
    if (typeof facts.fundingRate === "number") into.perp.fundingRate = facts.fundingRate;
    if (typeof facts.openInterest === "number") into.perp.openInterest = facts.openInterest;
    if (typeof facts.markIndexDislocationBps === "number") into.perp.markIndexDislocationBps = facts.markIndexDislocationBps;
    if (typeof facts.perpMovePcnt === "number") into.perp.perpMovePcnt = facts.perpMovePcnt;
  }
}

// Branch outcome -> read transition (mirrors semantic effect tables; terminal absorbs).
function applyBranchEffect(topic: string | undefined, outcome: string, read: string, action: string): string {
  if (read === "stand-aside") return "stand-aside";
  if (outcome.includes("[thin-artifact]") || outcome.includes("[mirage")) return action === "enter-now" ? "wait" : read === "undecided" ? "wait" : read;
  if (outcome.includes("[breakdown]")) return action === "exit-now" ? "exit-now" : "stand-aside";
  if (outcome.includes("[genuine-move]") || outcome.includes("[exhaustion]")) return action === "enter-now" ? "enter-now" : read;
  if (outcome.includes("[crowded]")) return action === "exit-now" ? "exit-now" : "wait";
  if (outcome.includes("[calm]") || outcome.includes("[persistent]")) return action === "enter-now" ? "enter-now" : read;
  void topic;
  return read;
}
