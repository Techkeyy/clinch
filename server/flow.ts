import { decide, type Candidate, type KernelState } from "../domain/kernel";
import { compileSemantics, type RawFacts } from "../domain/semantics";
import { extractIntent, toIntentContract } from "../domain/intent";
import type { IntentContract } from "../domain/types";
import { LOGIC_VERSION, RESEARCH_LOOP_CAP } from "../config/thresholds";
import { discoverSpot, discoverFutures } from "../research/bitget/index";
import type { FetchImpl } from "../research/bitget/client";
import { findStockByMention, researchableRealityStocks } from "../lib/stocks";
import { investigateSpot, investigatePositioning } from "../research/index";
import { needForTopic, classifyFinding, factsToRaw, type MarketFacts } from "../research/orchestrator";
import { renderStructuredBrief, HUMAN_DEC_LINE, type BriefSections } from "../brief/index";
import { TOPIC_WHY, TOPIC_CHANGES, summarizeSpotFinding, summarizePerpFinding, userStopReason } from "./ux-text";
import type { ModelProvider } from "../model/provider";
import type { SessionStore } from "../persistence/store";

export interface FlowEvent { type: string; data: unknown }
export interface FlowDeps {
  store: SessionStore;
  fetchImpl?: FetchImpl;
  model?: ModelProvider | null;
  maxIterations?: number;
  onEvent: (e: FlowEvent) => void;
  persistStep: (kind: string, family: string | null, summary: unknown, provenance: unknown) => Promise<void>;
}
export interface LoopInput {
  asset: string; spotSymbol: string; perpSymbol: string | null; action: string;
  read: string; resolvedTopics: string[]; facts: MarketFacts;
  data: Record<string, string>; context: string; known: string[];
  baselineProblems?: string[];
  skips?: { check: string; reason: string; kind?: string }[];
  uncertainty?: string[];
  hingeHistory?: { hinge: string; topic?: string | null; verdict: string }[];
  stopReason?: string | null;
}
export interface LoopState {
  read: string; resolvedTopics: string[]; facts: MarketFacts;
  skips: { check: string; reason: string; kind: string }[]; uncertainty: string[];
  hingeHistory: { hinge: string; topic?: string | null; verdict: string }[]; stopReason: string | null;
}
export interface FlowState {
  intent: IntentContract | null;
  read: string;
  resolvedTopics: string[];
  facts: MarketFacts;
  skips: { check: string; reason: string; kind: string }[];
  uncertainty: string[];
  hingeHistory: { hinge: string; topic?: string | null; verdict: string }[];
  stopReason: string | null;
  briefStatus: "none" | "ready";
  spotSymbol: string | null;
  perpSymbol: string | null;
  context: string;
  known: string[];
  clarificationRound: number;
  data: Record<string, string>;
}
export const READ_LABEL: Record<string, string> = {
  "enter-now": "Leaning in", wait: "Holding off", "stand-aside": "Standing aside",
  undecided: "Undecided", "cannot-resolve": "Cannot resolve",
};

function topicsOf(cands: Candidate[], ids: string[]): string[] {
  return ids.map((id) => cands.find((c) => c.id === id)?.topic).filter((t): t is string => !!t);
}

export async function parseIntentFlow(dilemma: string, model?: ModelProvider | null): Promise<IntentContract> {
  if (model) {
    try {
      const r = await model.parseIntent(dilemma);
      if (r.ok) return r.value;
    } catch { /* fall through to deterministic extractor */ }
  }
  return toIntentContract(extractIntent(dilemma));
}

/** Resolve a user asset mention to a canonical Reality spot symbol via live discovery. */
export async function resolveAsset(mention: string | null, fetchImpl?: FetchImpl): Promise<{ spot: string | null; perp: string | null; ticker: string | null; companyName: string | null; universe: number }> {
  if (!mention) return { spot: null, perp: null, ticker: null, companyName: null, universe: 0 };
  const spot = await discoverSpot(fetchImpl);
  let fut = [] as Awaited<ReturnType<typeof discoverFutures>>;
  try {
    fut = await discoverFutures(fetchImpl);
  } catch {
    // The spot research path remains truthful if optional futures discovery is unavailable.
  }
  const stocks = researchableRealityStocks(spot, fut);
  const hit = findStockByMention(mention, stocks);
  return {
    spot: hit?.realityTicker ?? null,
    perp: hit?.perpTicker ?? null,
    ticker: hit?.ticker ?? null,
    companyName: hit?.companyName ?? null,
    universe: stocks.length,
  };
}

export interface BriefInput {
  intent: IntentContract | null; read: string;
  hingeHistory: { hinge: string; topic?: string | null; verdict: string }[];
  skips: { check: string; reason: string; kind?: string }[]; uncertainty: string[];
}
export function assembleBrief(state: BriefInput, spotSymbol: string | null): BriefSections {
  const clean = (s: string) => s.split("::")[0].replace(/\s*\[[a-z-]+\]/gi, " ").replace(/\s{2,}/g, " ").trim().replace(/[.]+$/, "") + ".";
  const actionWords = (a: string | undefined) =>
    a === "enter-now" ? "entering" : a === "exit-now" ? "exiting" : a === "wait" ? "waiting" : a === "stand-aside" ? "standing aside" : "acting";
  const findings = state.hingeHistory.map((h) => clean(h.verdict));
  return {
    decision: `Considering ${actionWords(state.intent?.action)} on ${state.intent?.asset ?? spotSymbol ?? "unknown asset"}`,
    read: READ_LABEL[state.read] ?? state.read,
    why: state.hingeHistory.length ? clean(state.hingeHistory[state.hingeHistory.length - 1].verdict) : "No research completed.",
    findings,
    completed: state.hingeHistory.map((h) => h.hinge),
    skipped: state.skips.filter((s) => s.kind !== "resolved").map((s) => ({ check: s.check, reason: s.reason })),
    openQuestions: state.uncertainty,
    changeTriggers: state.read === "wait" || state.read === "holding-off"
      ? ["Sustained stabilization with healthy liquidity", "Positioning normalizing while structure holds"]
      : state.read === "stand-aside"
        ? ["Structural repair with expanding healthy volume", "Calm positioning confirmed over time"]
        : ["New relevant evidence from live market structure or positioning"],
    freshness: `Observed during this session; re-check for current data.`,
    sources: ["Bitget Reality market data", "Bitget stock-perp positioning"],
    disclaimer: `${HUMAN_DEC_LINE} Research support only, not financial advice.`,
  };
}

/** Drive one bounded research loop over an authorized session state. Emits events, persists steps. */
export async function driveLoop(
  sessionId: string,
  input: LoopInput,
  deps: FlowDeps,
): Promise<LoopState> {
  const { maxIterations = RESEARCH_LOOP_CAP } = deps;
  void deps.store;
  const emit = deps.onEvent;
  const acc: LoopState = {
    read: input.read, resolvedTopics: [...input.resolvedTopics],
    facts: JSON.parse(JSON.stringify(input.facts ?? {})) as MarketFacts,
    skips: (input.skips ?? []).map((s) => ({ check: s.check, reason: s.reason, kind: s.kind ?? "cannot-matter" })),
    uncertainty: [...(input.uncertainty ?? [])],
    hingeHistory: (input.hingeHistory ?? []).map((h) => ({ ...h })),
    stopReason: input.stopReason ?? null,
  };
  let iters = 0;
  const seenSkips = new Set<string>();
  const emitSkips = (list: { check: string; reason: string }[]) => {
    for (const s of list) {
      const key = `${s.check}::${s.reason}`;
      if (!seenSkips.has(key)) {
        seenSkips.add(key);
        emit({ type: "skip", data: { check: s.check, reason: s.reason } });
      }
    }
  };
  for (;;) {
    if (iters >= maxIterations) {
      acc.stopReason = "Iteration cap reached; stopping explicitly incomplete rather than fabricating completion.";
      acc.uncertainty.push(acc.stopReason);
      break;
    }
    const raw: RawFacts = factsToRaw({
      action: input.action, read: acc.read, asset: input.asset,
      context: input.context, facts: acc.facts as MarketFacts,
      data: { ...input.data }, resolved: [...acc.resolvedTopics], known: input.known,
    });
    // Seed raw spot/positioning enums from normalized facts (same mapping as factsToRaw).
    const pkg = compileSemantics(raw);
    const kstate: KernelState = {
      step: iters + 1, read: acc.read,
      resolved: pkg.candidates.filter((c) => c.resolved).map((c) => c.id),
      mooted: {}, data: { ...input.data },
    };
    const scen = { id: "live", action: input.action, candidates: pkg.candidates };
    const out = decide(scen, kstate);
    for (const s of out.skips) {
      if (!acc.skips.some((x) => x.check === s.family)) acc.skips.push({ check: s.family, reason: s.reason, kind: s.kind });
    }
    emitSkips(acc.skips.filter((s) => s.kind !== "resolved"));
    if (out.action === "RESEARCH" && out.hinge) {
      const q = pkg.candidates.find((c) => c.id === out.hinge)!;
      emit({ type: "hinge", data: { hinge: q.id, question: q.q, why: TOPIC_WHY[q.topic ?? ""] ?? out.why, changes: TOPIC_CHANGES[q.topic ?? ""] ?? null, family: out.family } });
      await deps.persistStep("hinge", out.family, { hinge: q.id, question: q.q, why: out.why }, null);
      const need = needForTopic(q.topic);
      if (!need || (need.family === "perp-positioning" && !input.perpSymbol)) {
        acc.uncertainty.push("Selected hinge has no executable research mapping or instrument.");
        break;
      }
      emit({ type: "research", data: { hinge: q.id, family: need.family } });
      const research = need.family === "spot-structure"
        ? await investigateSpot(input.spotSymbol, need.spot.length ? need.spot : ["ticker"], "1H", deps.fetchImpl)
        : await investigatePositioning(input.perpSymbol ?? "", need.perp.length ? need.perp : ["ticker"], deps.fetchImpl);
      await deps.persistStep("research", need.family,
        { hinge: q.id, status: research.status, facts: research.facts },
        research.evidence.map((e) => e.provenance));
      if (research.status !== "ok") {
        acc.uncertainty.push(`${need.family} returned ${research.status}; treated as unavailable, never as evidence.`);
        acc.resolvedTopics.push(q.topic ?? q.id);
        iters++;
        continue;
      }
      mergeFlowFacts(acc.facts, need.family, research.facts);
      const summary = need.family === "spot-structure"
        ? summarizeSpotFinding(input.spotSymbol, research.facts)
        : summarizePerpFinding(input.perpSymbol ?? input.spotSymbol, research.facts);
      const observed = research.evidence[0] as unknown as { freshness?: { observedAt?: string }; provenance?: { endpointFamily?: string; symbol?: string } } | undefined;
      emit({ type: "finding", data: { hinge: q.id, family: need.family, summary,
        observedAt: observed?.freshness?.observedAt ?? null,
        source: observed?.provenance ? `${observed.provenance.endpointFamily ?? "bitget"} ${observed.provenance.symbol ?? ""}`.trim() : "Bitget market data",
        facts: research.facts } });
      const outcome = classifyFinding(q.topic, acc.facts);
      if (outcome) {
        const br = q.branches.find((b) => b.outcome === outcome)!;
        acc.resolvedTopics.push(q.topic ?? q.id);
        for (const m of br.moots || []) {
          const mq = pkg.candidates.find((c) => c.id === m);
          if (mq?.topic && !acc.resolvedTopics.includes(mq.topic)) acc.resolvedTopics.push(mq.topic);
        }
        if (br.action !== "undecided") acc.read = br.action;
        acc.hingeHistory.push({ hinge: q.id, topic: q.topic ?? null, verdict: `${outcome} :: read now ${acc.read}` });
      } else {
        acc.uncertainty.push(`Finding on ${q.topic ?? "unknown"} did not clearly match a branch; read unchanged.`);
        acc.hingeHistory.push({ hinge: q.id, topic: q.topic ?? null, verdict: "inconclusive; read unchanged" });
        acc.resolvedTopics.push(q.topic ?? q.id);
      }
      iters++;
      continue;
    }
    if (out.action === "STOP") {
      acc.stopReason = userStopReason(out.why, true);
      await deps.persistStep("stop", null, { reason: out.why }, null);
      emit({ type: "stop", data: { reason: acc.stopReason } });
      break;
    }
    if (out.action === "CANNOT_RESOLVE") {
      acc.uncertainty.push(out.why);
      acc.read = "cannot-resolve";
      emit({ type: "stop", data: { reason: out.why, cannotResolve: true } });
      break;
    }
    if (out.action === "CLARIFY") {
      emit({ type: "clarify", data: { question: "What are you deciding? Tell me the asset and whether you are considering entering, exiting, or waiting." } });
      break;
    }
    break;
  }
  return acc;
}

function mergeFlowFacts(into: FlowState["facts"], family: string, facts: Record<string, number | string | boolean | null>) {
  const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  if (family === "spot-structure") {
    into.spot = into.spot ?? {};
    for (const k of ["last", "change24hPcnt", "spreadBps", "topBidSize", "topAskSize", "windowMovePcnt", "supportLevel", "resistanceLevel", "lastVolume"] as const) {
      const v = facts[k];
      if (typeof v === "number") (into.spot as Record<string, number | null>)[k] = v;
    }
    if (typeof facts.spreadWide === "boolean") into.spot.spreadWide = facts.spreadWide;
    void n;
  } else {
    into.perp = into.perp ?? {};
    for (const k of ["fundingRate", "openInterest", "markIndexDislocationBps", "perpMovePcnt"] as const) {
      const v = facts[k];
      if (typeof v === "number") (into.perp as Record<string, number | null>)[k] = v;
    }
  }
}

export function topicsOfIds(candidates: { id: string; topic?: string }[], ids: string[]): string[] {
  return ids.map((id) => candidates.find((c) => c.id === id)?.topic).filter((t): t is string => !!t);
}
