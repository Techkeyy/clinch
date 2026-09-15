import { decide, type Candidate, type KernelState } from "../domain/kernel";
import { compileSemantics, type RawFacts } from "../domain/semantics";
import { extractIntent, normalizeIntent, toIntentContract } from "../domain/intent";
import type { IntentContract } from "../domain/types";
import { LOGIC_VERSION, RESEARCH_LOOP_CAP } from "../config/thresholds";
import { discoverSpot, discoverFutures } from "../research/bitget/index";
import type { FetchImpl } from "../research/bitget/client";
import { findStockByMention, researchableRealityStocks } from "../lib/stocks";
import { investigateSpot, investigatePositioning } from "../research/index";
import { needForTopic, classifyFinding, factsToRaw, type MarketFacts } from "../research/orchestrator";
import { renderStructuredBrief, HUMAN_DEC_LINE, type BriefSections } from "../brief/index";
import {
  TOPIC_WHY, TOPIC_CHANGES, summarizeSpotFinding, summarizePerpFinding,
  terminalReasonCode, userSkipReason, userStopReason, userUnresolvedReason,
  type TerminalKind, type TerminalReasonCode,
} from "./ux-text";
import type { ModelProvider } from "../model/provider";
import type { SessionStore } from "../persistence/store";
import {
  deriveDecisionImplication, factsForCompletedResearch, groundedEvidenceSummary, researchFamilyForTopic,
} from "./interpretation";

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
  hingeHistory?: { hinge: string; topic?: string | null; question?: string | null; verdict: string }[];
  stopReason?: string | null;
  unsupportedReason?: string;
}
export interface AssetIdentity {
  companyName: string | null;
  normalTicker: string | null;
  realityTicker: string | null;
  perpSymbol: string | null;
  universe: number;
}
export interface LoopState {
  read: string; resolvedTopics: string[]; facts: MarketFacts;
  skips: { check: string; reason: string; kind: string }[]; uncertainty: string[];
  hingeHistory: { hinge: string; topic?: string | null; question?: string | null; verdict: string }[]; stopReason: string | null;
  terminal: TerminalKind | null;
  terminalReasonCode: TerminalReasonCode | null;
  terminalInternalReason: string | null;
}
export interface FlowState {
  intent: IntentContract | null;
  assetIdentity: AssetIdentity | null;
  read: string;
  resolvedTopics: string[];
  facts: MarketFacts;
  skips: { check: string; reason: string; kind: string }[];
  uncertainty: string[];
  hingeHistory: { hinge: string; topic?: string | null; question?: string | null; verdict: string }[];
  stopReason: string | null;
  briefStatus: "none" | "ready";
  spotSymbol: string | null;
  perpSymbol: string | null;
  context: string;
  known: string[];
  clarificationRound: number;
  data: Record<string, string>;
  terminal: TerminalKind | null;
  terminalReasonCode: TerminalReasonCode | null;
}
export const READ_LABEL: Record<string, string> = {
  "enter-now": "Leaning in", wait: "Holding off", "stand-aside": "Standing aside",
  "leaning-in": "Leaning in", "holding-off": "Holding off", "standing-aside": "Standing aside",
  undecided: "Cannot resolve", "cannot-resolve": "Cannot resolve",
};

export function finalReadLabel(read: string, terminal: TerminalKind): string {
  const label = READ_LABEL[read];
  return label && label !== "Undecided" ? label : terminal === "unresolved" ? "Cannot resolve" : "Cannot resolve";
}

function topicsOf(cands: Candidate[], ids: string[]): string[] {
  return ids.map((id) => cands.find((c) => c.id === id)?.topic).filter((t): t is string => !!t);
}

export async function parseIntentFlow(dilemma: string, model?: ModelProvider | null): Promise<IntentContract> {
  if (model) {
    try {
      const r = await model.parseIntent(dilemma);
      if (r.ok) return normalizeIntent(dilemma, r.value);
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

export function assetIdentity(resolved: Awaited<ReturnType<typeof resolveAsset>>): AssetIdentity {
  return {
    companyName: resolved.companyName,
    normalTicker: resolved.ticker,
    realityTicker: resolved.spot,
    perpSymbol: resolved.perp,
    universe: resolved.universe,
  };
}

/** Research-family availability follows resolved instruments, not optimistic UI flags. */
export function capabilityData(spotSymbol: string | null, perpSymbol: string | null): Record<string, string> {
  return {
    "spot-structure": spotSymbol ? "fresh" : "missing",
    "perp-positioning": perpSymbol ? "fresh" : "missing",
  };
}

export interface BriefInput {
  intent: IntentContract | null; read: string;
  hingeHistory: { hinge: string; topic?: string | null; question?: string | null; verdict: string }[];
  skips: { check: string; reason: string; kind?: string }[]; uncertainty: string[];
  terminal: TerminalKind; terminalReasonCode: TerminalReasonCode;
  facts?: MarketFacts;
}
export function assembleBrief(state: BriefInput, spotSymbol: string | null): BriefSections {
  const asset = state.intent?.asset ?? spotSymbol ?? "this stock";
  const decision = state.intent?.action === "wait"
    ? `Considering whether to wait before entering ${asset}.`
    : state.intent?.action === "enter-now" ? `Considering a ${asset} entry now.`
      : state.intent?.action === "exit-now" ? `Considering whether to exit ${asset}.`
        : state.intent?.action === "stand-aside" ? `Considering whether to stay out of ${asset}.`
          : `Considering a decision about ${asset}.`;
  const evidenceFacts = factsForCompletedResearch(state.facts ?? {}, state.hingeHistory);
  const findings = state.hingeHistory.map((h) => groundedEvidenceSummary(h.topic, evidenceFacts));
  const lastTopic = state.hingeHistory[state.hingeHistory.length - 1]?.topic ?? null;
  const completed = state.hingeHistory.map((h) => h.question ?? "Supported market evidence check");
  const unresolvedWhy = userUnresolvedReason(state.terminalReasonCode, asset, state.intent?.action);
  const readQualification = state.read === "enter-now" || state.read === "leaning-in"
    ? " This supports a leaning-in read without establishing that the move is exhausted."
    : state.read === "wait" || state.read === "holding-off"
      ? " This supports holding off until the timing question is clearer."
      : state.read === "stand-aside" || state.read === "standing-aside"
        ? " This keeps the decision cautious without establishing a reversal."
        : "";
  const why = state.terminal === "unresolved"
    ? unresolvedWhy
    : state.hingeHistory.length ? groundedEvidenceSummary(lastTopic, evidenceFacts) + readQualification : userStopReason("", true);
  const changeTriggers = state.terminal === "unresolved"
    ? (lastTopic && TOPIC_CHANGES[lastTopic] ? [TOPIC_CHANGES[lastTopic]] : ["A supported research path capable of answering the remaining decision question becomes available."])
    : (lastTopic && TOPIC_CHANGES[lastTopic] ? [TOPIC_CHANGES[lastTopic]] : ["No remaining supported check is expected to materially change this read."]);
  const researchedFamilies = new Set<string>(
    state.hingeHistory
      .map((h) => researchFamilyForTopic(h.topic))
      .filter((family): family is "spot-structure" | "perp-positioning" => family !== null),
  );
  const skipped = state.skips
    .filter((s) => !researchedFamilies.has(s.check))
    .map((s) => ({ check: s.check, reason: s.reason }));
  const futureRechecks: string[] = [];
  if (skipped.some((s) => s.check === "perp-positioning")) {
    futureRechecks.push("Materially different funding or positioning conditions would warrant a future re-check.");
    futureRechecks.push("A new spot-perp dislocation would warrant a future re-check.");
  }
  if (skipped.some((s) => s.check === "spot-structure")) {
    futureRechecks.push("Materially different spot structure would warrant a future re-check.");
  }
  const decisionImplication = deriveDecisionImplication({
    intent: state.intent,
    read: state.read,
    terminal: state.terminal,
    hingeHistory: state.hingeHistory,
    facts: evidenceFacts,
    uncertainty: state.uncertainty,
  });
  return {
    terminalStatus: state.terminal,
    terminalReasonCode: state.terminalReasonCode,
    decision,
    read: finalReadLabel(state.read, state.terminal),
    why,
    findings,
    completed,
    skipped,
    openQuestions: state.uncertainty,
    changeTriggers: decisionImplication.changeTriggers.length ? decisionImplication.changeTriggers : changeTriggers,
    decisionImplication,
    futureRechecks,
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
    terminal: null,
    terminalReasonCode: null,
    terminalInternalReason: null,
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
  if (input.unsupportedReason) {
    acc.terminal = "unresolved";
    acc.read = "cannot-resolve";
    acc.terminalReasonCode = "NO_ANSWERABLE_HINGE";
    acc.terminalInternalReason = "No supported evidence capability covers the requested news or catalyst question.";
    acc.stopReason = input.unsupportedReason;
    acc.uncertainty.push(input.unsupportedReason);
    await deps.persistStep("stop", null, { terminal: acc.terminal, reasonCode: acc.terminalReasonCode, internalReason: acc.terminalInternalReason }, null);
    emit({ type: "stop", data: { reason: acc.stopReason, cannotResolve: true, terminal: acc.terminal, reasonCode: acc.terminalReasonCode } });
    return acc;
  }
  for (;;) {
    if (iters >= maxIterations) {
      acc.terminal = "unresolved";
      acc.read = "cannot-resolve";
      acc.terminalReasonCode = "ITERATION_CAP";
      acc.terminalInternalReason = "Iteration cap reached; stopping explicitly incomplete rather than fabricating completion.";
      acc.stopReason = userUnresolvedReason("ITERATION_CAP", input.asset, input.action);
      acc.uncertainty.push(acc.stopReason);
      await deps.persistStep("stop", null, { terminal: acc.terminal, reasonCode: acc.terminalReasonCode, internalReason: acc.terminalInternalReason }, null);
      emit({ type: "stop", data: { reason: acc.stopReason, cannotResolve: true, terminal: acc.terminal, reasonCode: acc.terminalReasonCode } });
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
      if (!acc.skips.some((x) => x.check === s.family)) acc.skips.push({ check: s.family, reason: userSkipReason(s.kind, s.reason), kind: s.kind });
    }
    emitSkips(acc.skips.filter((s) => s.kind !== "resolved"));
    if (out.action === "RESEARCH" && out.hinge) {
      const q = pkg.candidates.find((c) => c.id === out.hinge)!;
      emit({ type: "hinge", data: { hinge: q.id, question: q.q, why: TOPIC_WHY[q.topic ?? ""] ?? out.why, changes: TOPIC_CHANGES[q.topic ?? ""] ?? null, family: out.family } });
      await deps.persistStep("hinge", out.family, { hinge: q.id, question: q.q, why: out.why }, null);
      const need = needForTopic(q.topic);
      if (!need || (need.family === "perp-positioning" && !input.perpSymbol)) {
        const internalReason = !need ? "No executor mapping for selected hinge topic." : "No corresponding perp instrument for positioning hinge.";
        acc.terminal = "unresolved";
        acc.read = "cannot-resolve";
        acc.terminalReasonCode = "EXECUTOR_UNAVAILABLE";
        acc.terminalInternalReason = internalReason;
        acc.stopReason = userUnresolvedReason(acc.terminalReasonCode, input.asset, input.action);
        acc.uncertainty.push(acc.stopReason);
        await deps.persistStep("stop", null, { terminal: acc.terminal, reasonCode: acc.terminalReasonCode, internalReason }, null);
        emit({ type: "stop", data: { reason: acc.stopReason, cannotResolve: true, terminal: acc.terminal, reasonCode: acc.terminalReasonCode } });
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
        acc.uncertainty.push(userUnresolvedReason("RESEARCH_UNAVAILABLE", input.asset, input.action));
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
        acc.hingeHistory.push({ hinge: q.id, topic: q.topic ?? null, question: q.q ?? null, verdict: `${outcome} :: read now ${acc.read}` });
      } else {
        acc.uncertainty.push("The selected market check returned evidence, but it did not resolve the decision question.");
        acc.hingeHistory.push({ hinge: q.id, topic: q.topic ?? null, question: q.q ?? null, verdict: "inconclusive; read unchanged" });
        acc.resolvedTopics.push(q.topic ?? q.id);
      }
      iters++;
      continue;
    }
    if (out.action === "STOP") {
      if (acc.read === "undecided") {
        acc.terminal = "unresolved";
        acc.terminalReasonCode = "NO_ANSWERABLE_HINGE";
        acc.terminalInternalReason = "Stop reached before an answerable finding established a read.";
        acc.read = "cannot-resolve";
        acc.stopReason = userUnresolvedReason(acc.terminalReasonCode, input.asset, input.action);
      } else {
        acc.terminal = "stopped";
        acc.terminalReasonCode = "NO_REMAINING_VALUE";
        acc.terminalInternalReason = out.why;
        acc.stopReason = userStopReason(out.why, true);
      }
      await deps.persistStep("stop", null, { terminal: acc.terminal, reasonCode: acc.terminalReasonCode, internalReason: out.why }, null);
      emit({ type: "stop", data: { reason: acc.stopReason, cannotResolve: acc.terminal === "unresolved", terminal: acc.terminal, reasonCode: acc.terminalReasonCode } });
      break;
    }
    if (out.action === "CANNOT_RESOLVE") {
      const code = terminalReasonCode(out.why);
      acc.terminal = "unresolved";
      acc.read = "cannot-resolve";
      acc.terminalReasonCode = code;
      acc.terminalInternalReason = out.why;
      acc.read = "cannot-resolve";
      acc.stopReason = userUnresolvedReason(code, input.asset, input.action);
      acc.uncertainty.push(acc.stopReason);
      await deps.persistStep("stop", null, { terminal: acc.terminal, reasonCode: code, internalReason: out.why }, null);
      emit({ type: "stop", data: { reason: acc.stopReason, cannotResolve: true, terminal: acc.terminal, reasonCode: code } });
      break;
    }
    if (out.action === "CLARIFY") {
      acc.terminal = "unresolved";
      acc.read = "cannot-resolve";
      acc.terminalReasonCode = "NO_ANSWERABLE_HINGE";
      acc.terminalInternalReason = out.why;
      acc.stopReason = userUnresolvedReason(acc.terminalReasonCode, input.asset, input.action);
      emit({ type: "clarify", data: { question: "What are you deciding? Tell me the asset and whether you are considering entering, exiting, or waiting." } });
      break;
    }
    break;
  }
  if (!acc.terminal) {
    acc.terminal = "unresolved";
    acc.read = "cannot-resolve";
    acc.terminalReasonCode = "INCOMPLETE";
    acc.terminalInternalReason = "Research loop ended without a terminal decision.";
    acc.stopReason = userUnresolvedReason("INCOMPLETE", input.asset, input.action);
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
