// Production decision-value kernel (P12). Faithful port of the P5-proven
// structured kernel (proof/p5/candidates/structured.js): deterministic, pure,
// model-independent, no I/O, no order vocabulary. Owns selection, skip, stop,
// clarify, cannot-resolve, blocked-attempt handling, and skip contracts.
import type { ContemplatedAction, CurrentRead, ResearchFamily, SkipKind } from "./types";

export type KernelAction = "RESEARCH" | "SKIP" | "STOP" | "CLARIFY" | "CANNOT_RESOLVE";
export type FamilyName = ResearchFamily | "fills" | "unsupported-ta" | string;

export interface Branch { outcome: string; action: string; moots?: string[] }
export interface Candidate {
  id: string; topic?: string; q?: string;
  families: string[]; prunes?: string[]; dataNeeded?: string;
  resolved?: boolean; resolution?: string;
  branches: Branch[];
}
export interface KernelState {
  step: number;
  read: CurrentRead | "undecided" | string;
  resolved: string[];
  mooted: Record<string, string>;
  data: Record<string, string>;
}
export interface SkipEntry { family: string; kind: SkipKind; reason: string }
export interface KernelOutput {
  hinge: string | null; hingeQuestion: string | null; why: string;
  family: string | null; action: KernelAction; final: string;
  branches: { outcome: string; effect: string }[];
  canChange: boolean; skips: SkipEntry[];
  blocked?: { family: string; handling: string };
  trace: { candidates: string[]; selected: string | null; prunes: string[]; dataSnapshot: Record<string, string>; resolvedSoFar: string[] };
}

const KNOWN_FAMILIES = ["spot-structure", "perp-positioning"];

export function branchEffects(q: Candidate): string[] {
  return [...new Set(q.branches.map((b) => b.action))];
}
/** Flippable = can move the read: divergent branches, or one decisive outcome. */
export function flippable(q: Candidate, read: string): boolean {
  const e = branchEffects(q);
  if (e.length > 1) return true;
  if (e.length === 1 && e[0] !== read && e[0] !== "undecided") return true;
  return false;
}
function answerable(q: Candidate, data: Record<string, string>): { ok: boolean; why?: string; families: string[] } {
  const fams = q.families || [];
  if (fams.length === 0) return { ok: false, why: "no-capable-family", families: [] };
  const fresh = fams.filter((f) => data[f] === "fresh");
  if (fresh.length > 0) return { ok: true, families: fresh };
  return { ok: false, why: "no-data", families: fams };
}

function base(scenario: { id: string }, state: KernelState, q: Candidate | null,
  action: KernelAction, family: string | null, reason: string, skips: SkipEntry[],
  top: { prunes: string[] } | null): KernelOutput {
  const final = action === "RESEARCH" ? "CONTINUE" : action;
  return {
    hinge: q ? q.id : null, hingeQuestion: q?.q ?? null, why: reason,
    family, action, final,
    branches: q ? q.branches.map((b) => ({ outcome: b.outcome, effect: b.action })) : [],
    canChange: q ? flippable(q, state.read) : false,
    skips, trace: {
      candidates: [], selected: q ? q.id : null,
      prunes: top?.prunes ?? [], dataSnapshot: { ...state.data }, resolvedSoFar: [...state.resolved],
    },
  };
}

function openCandidates(scenario: { candidates: Candidate[] }, state: KernelState): Candidate[] {
  return scenario.candidates.filter((q) => !state.resolved.includes(q.id) && !state.mooted[q.id]);
}

export function skipSet(scenario: { candidates: Candidate[] }, state: KernelState, selectedId: string | null): SkipEntry[] {
  const data = state.data;
  const fams = new Set<string>();
  for (const q of scenario.candidates) for (const f of q.families || []) fams.add(f);
  for (const k of Object.keys(data)) { if (k !== "fills") fams.add(k); }
  if (data.fills === "missing") fams.add("fills");
  const out: SkipEntry[] = [];
  for (const f of [...fams].sort()) {
    if (!KNOWN_FAMILIES.includes(f)) {
      const used = scenario.candidates.some((q) => (q.families || []).includes(f) && !state.resolved.includes(q.id) && !state.mooted[q.id]);
      if (used) { out.push({ family: f, kind: "unsupported", reason: `${f} cannot answer this asset; refused, never faked` }); continue; }
      if (f === "fills" && data.fills === "missing") { out.push({ family: f, kind: "no-data", reason: "fills feed known-stale; absent flow is not evidence" }); continue; }
      continue;
    }
    const qs = scenario.candidates.filter((q) => (q.families || []).includes(f) && !state.resolved.includes(q.id) && !state.mooted[q.id]);
    if (qs.length === 0) {
      const wasMooted = scenario.candidates.some((q) => (q.families || []).includes(f) && state.mooted[q.id]);
      const wasPre = scenario.candidates.some((q) => (q.families || []).includes(f) && q.resolved);
      out.push({ family: f, kind: "resolved",
        reason: wasMooted ? `${f} mooted by an earlier finding` : (wasPre ? `${f} questions already settled in a prior step` : `no open question needs ${f}`) });
      continue;
    }
    if (data[f] === "missing") { out.push({ family: f, kind: "no-data", reason: `${f} data missing; reroute, never evidence` }); continue; }
    const flip = qs.filter((q) => flippable(q, state.read));
    if (flip.length === 0) { out.push({ family: f, kind: "cannot-matter", reason: `every plausible ${f} outcome leaves the read unchanged` }); continue; }
    const sel = qs.find((q) => q.id === selectedId);
    if (!sel) { out.push({ family: f, kind: "cannot-matter", reason: `${f} outcomes cannot beat the selected hinge now` }); continue; }
  }
  return out;
}

export function decide(scenario: { id: string; action: string; candidates: Candidate[] }, state: KernelState): KernelOutput {
  const data = state.data;
  if (scenario.action === "unclear") {
    return base(scenario, state, null, "CLARIFY", null,
      "no contemplated action stated; one clarification required, intent never invented", [], null);
  }
  const open = openCandidates(scenario, state);
  const scored = open.map((q) => {
    const effects = branchEffects(q);
    const ans = answerable(q, data);
    const attemptable = ans.ok || (q.families || []).length > 0;
    return { q, effects, flip: flippable(q, state.read), ans, attemptable,
      prunes: q.prunes || [], relevant: effects.some((a) => a !== state.read) };
  });
  const live = scored.filter((s) => s.flip && s.ans.ok);
  if (live.length > 0) {
    live.sort((a, b) => (b.prunes.length - a.prunes.length) ||
      (b.effects.length - a.effects.length) ||
      (Number(b.relevant) - Number(a.relevant)) ||
      (a.q.id < b.q.id ? -1 : 1));
    const top = live[0];
    const fam = top.ans.families.includes("spot-structure") ? "spot-structure" : top.ans.families[0];
    const skips = skipSet(scenario, state, top.q.id);
    const out = base(scenario, state, top.q, "RESEARCH", fam,
      `unresolved flippable hinge (outcomes: ${top.effects.join(" vs ")}) answerable by ${fam}`, skips, top);
    out.trace.candidates = open.map((s) => s.id);
    return out;
  }
  const established = state.resolved.length > 0 || state.read !== "undecided";
  const attempted = scored.filter((s) => s.flip && s.attemptable && !s.ans.ok);
  if (!established && !live.length && scored.some((s) => s.flip)) {
    const missing = attempted.length > 0 ? attempted : scored.filter((s) => s.flip);
    const need = [...new Set(missing.flatMap((s) => (s.q.families || []).length ? s.q.families : ["NO-CAPABLE-FAMILY"]))];
    const out = base(scenario, state, null, "CANNOT_RESOLVE", null,
      `nothing ever established and no flippable hinge answerable; missing: ${need.join(", ")}`,
      skipSet(scenario, state, null), null);
    out.trace.candidates = open.map((s) => s.id);
    return out;
  }
  if (attempted.length > 0 && established) {
    const t = attempted[0];
    const fam = (t.q.families || [])[0];
    const skips = skipSet(scenario, state, null);
    const out = base(scenario, state, t.q, "RESEARCH", fam,
      `attempt blocked: ${fam} data missing; retry-or-wait, never evidence`, skips, t);
    out.blocked = { family: fam, handling: "retry-or-wait, not evidence" };
    out.final = "CONTINUE";
    out.trace.candidates = open.map((s) => s.id);
    return out;
  }
  const residue = open.filter((s) => !flippable(s, state.read)).map((s) => s.id);
  const out = base(scenario, state, null, "STOP", null,
    `no unresolved flippable hinge remains; residue: ${residue.join(", ") || "none"}`,
    skipSet(scenario, state, null), null);
  out.trace.candidates = open.map((s) => s.id);
  return out;
}

/** Apply a researched outcome: resolve, moot dependents, update read. Pure. */
export function applyOutcome(state: KernelState, q: Candidate, outcomeLabel: string): KernelState {
  const br = q.branches.find((b) => b.outcome === outcomeLabel);
  if (!br) throw new Error(`Unknown outcome for ${q.id}: ${outcomeLabel}`);
  const mooted: Record<string, string> = { ...state.mooted };
  for (const m of br.moots || []) mooted[m] = q.id;
  return {
    ...state,
    resolved: [...state.resolved, q.id],
    mooted,
    read: br.action === "undecided" ? state.read : br.action,
  };
}
export function initialState(read: string, data: Record<string, string>, resolved: string[] = []): KernelState {
  return { step: 1, read, resolved: [...resolved], mooted: {}, data: { ...data } };
}
export type { ContemplatedAction, CurrentRead };
