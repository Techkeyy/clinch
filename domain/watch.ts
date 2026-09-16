import type { MarketFacts } from "@/research/orchestrator";
import type { ContemplatedAction, ResearchFamily } from "@/domain/types";
import { BANDS } from "@/config/thresholds";

export type WatchStatus = "ACTIVE" | "PAUSED" | "TRIGGERED" | "CANCELLED" | "ERROR";
export type WatchChannel = "TELEGRAM" | "WHATSAPP";
export type WatchRead = "enter-now" | "wait" | "stand-aside" | "undecided" | "cannot-resolve" | string;

export interface WatchEvidenceSnapshot {
  capturedAt: string;
  facts: MarketFacts;
  read: WatchRead;
  evidenceVersion: number;
  previousRead?: WatchRead;
  changeReasons?: string[];
}

export interface WatchCheck {
  family: ResearchFamily;
  inputs: string[];
  materialChange: string[];
}

export interface WatchPlan {
  version: "watch-plan-v1";
  cadenceSeconds: number;
  action: string;
  family: ResearchFamily;
  hingeTopic: string | null;
  humanKeyQuestion: string;
  targetRead: string;
  checks: WatchCheck[];
  whatToWatch: string[];
  baseline: WatchEvidenceSnapshot;
}

export interface WatchCompilerInput {
  asset: string;
  action: ContemplatedAction | string;
  currentRead: WatchRead;
  hinge?: { topic?: string | null; question?: string | null } | null;
  completedFamily?: ResearchFamily | null;
  facts: MarketFacts;
  changeTriggers?: string[];
  futureRechecks?: string[];
}

export interface WatchTransition {
  previousRead: WatchRead;
  nextRead: WatchRead;
  targetReached: boolean;
  materialChange: boolean;
  reasons: string[];
  evidenceVersion: number;
}

const FAVORABLE_READS = new Set(["enter-now", "leaning-in"]);

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function familyForInput(input: WatchCompilerInput): ResearchFamily {
  if (input.completedFamily) return input.completedFamily;
  if (input.hinge?.topic === "crowd-timing" || input.hinge?.topic === "dislocation") return "perp-positioning";
  return "spot-structure";
}

function targetForAction(action: string): string {
  return action === "exit-now" ? "exit-now" : "enter-now";
}

function defaultQuestion(asset: string, family: ResearchFamily): string {
  return family === "spot-structure"
    ? "Would a material change in " + asset + " spot structure make this decision more favorable?"
    : "Would a material change in " + asset + " positioning make this decision more favorable?";
}

export function compileWatchPlan(input: WatchCompilerInput): WatchPlan {
  const family = familyForInput(input);
  const targetRead = targetForAction(input.action);
  const triggers = [...(input.changeTriggers ?? []), ...(input.futureRechecks ?? [])]
    .map((value) => value.trim())
    .filter(Boolean);
  const checks: WatchCheck[] = family === "spot-structure"
    ? [{
      family,
      inputs: ["ticker", "candles", "depth"],
      materialChange: [
        "24-hour move or short-window direction changes materially",
        "support or resistance is crossed",
        "spread or top-of-book liquidity changes materially",
      ],
    }]
    : [{
      family,
      inputs: ["ticker"],
      materialChange: [
        "funding crosses a calibrated positioning band",
        "mark to index dislocation changes materially",
        "open interest or perp direction changes materially",
      ],
    }];
  const whatToWatch = triggers.length ? triggers.slice(0, 5) : checks[0].materialChange;
  return {
    version: "watch-plan-v1",
    cadenceSeconds: 10 * 60,
    action: input.action,
    family,
    hingeTopic: input.hinge?.topic ?? null,
    humanKeyQuestion: input.hinge?.question?.trim() || defaultQuestion(input.asset, family),
    targetRead,
    checks,
    whatToWatch,
    baseline: {
      capturedAt: new Date().toISOString(),
      facts: input.facts,
      read: input.currentRead,
      evidenceVersion: 0,
    },
  };
}

function changedAcrossBand(previous: number | null | undefined, next: number | null | undefined, band: number): boolean {
  if (!finite(previous) || !finite(next)) return false;
  return (Math.abs(previous) < band) !== (Math.abs(next) < band);
}

function spotMaterialChange(previous: MarketFacts["spot"], next: MarketFacts["spot"]): string[] {
  const reasons: string[] = [];
  if (!previous || !next) return reasons;
  if (finite(previous.movePct24h) && finite(next.movePct24h)) {
    const threshold = Math.max(0.5, Math.abs(previous.movePct24h) * 0.25);
    if (Math.abs(next.movePct24h - previous.movePct24h) >= threshold) reasons.push("24-hour move changed materially");
  }
  if (previous.spreadWide !== next.spreadWide && previous.spreadWide !== null && next.spreadWide !== null) {
    reasons.push("spread condition changed");
  }
  if (finite(previous.last) && finite(next.last)) {
    if (finite(previous.supportLevel) && ((previous.last >= previous.supportLevel && next.last < previous.supportLevel) || (previous.last < previous.supportLevel && next.last >= previous.supportLevel))) {
      reasons.push("support boundary changed");
    }
    if (finite(previous.resistanceLevel) && ((previous.last <= previous.resistanceLevel && next.last > previous.resistanceLevel) || (previous.last > previous.resistanceLevel && next.last <= previous.resistanceLevel))) {
      reasons.push("resistance boundary changed");
    }
  }
  return reasons;
}

function perpMaterialChange(previous: MarketFacts["perp"], next: MarketFacts["perp"]): string[] {
  const reasons: string[] = [];
  if (!previous || !next) return reasons;
  if (finite(previous.fundingRate) && finite(next.fundingRate)) {
    const threshold = Math.max(0.0001, Math.abs(previous.fundingRate) * 0.25);
    if (Math.abs(next.fundingRate - previous.fundingRate) >= threshold) reasons.push("funding changed materially");
    if (changedAcrossBand(previous.fundingRate, next.fundingRate, BANDS.FUNDING_ELEVATED)) reasons.push("funding band changed");
  }
  if (finite(previous.markIndexDislocationBps) && finite(next.markIndexDislocationBps)) {
    const threshold = Math.max(2, Math.abs(previous.markIndexDislocationBps) * 0.25);
    if (Math.abs(next.markIndexDislocationBps - previous.markIndexDislocationBps) >= threshold) reasons.push("mark to index dislocation changed materially");
    if (changedAcrossBand(previous.markIndexDislocationBps, next.markIndexDislocationBps, BANDS.DISLOCATION_WIDE_BPS)) reasons.push("dislocation band changed");
  }
  return reasons;
}

export function materialChange(plan: WatchPlan, previous: WatchEvidenceSnapshot, nextFacts: MarketFacts): { changed: boolean; reasons: string[] } {
  const reasons = plan.family === "spot-structure"
    ? spotMaterialChange(previous.facts.spot, nextFacts.spot)
    : perpMaterialChange(previous.facts.perp, nextFacts.perp);
  return { changed: reasons.length > 0, reasons };
}

export function transitionFor(plan: WatchPlan, previous: WatchEvidenceSnapshot, next: WatchEvidenceSnapshot, reasons: string[]): WatchTransition {
  const targetReached = next.read === plan.targetRead || (plan.targetRead === "enter-now" && FAVORABLE_READS.has(next.read));
  return {
    previousRead: previous.read,
    nextRead: next.read,
    targetReached,
    materialChange: reasons.length > 0,
    reasons,
    evidenceVersion: previous.evidenceVersion + 1,
  };
}

export function isFavorableRead(read: string): boolean {
  return FAVORABLE_READS.has(normalizeWatchRead(read));
}

export function normalizeWatchRead(read: string): string {
  const normalized = read.trim().toLowerCase();
  if (normalized === "leaning-in" || normalized === "slightly favorable" || normalized === "enter-now") return "enter-now";
  if (normalized === "holding-off" || normalized === "better to wait" || normalized === "wait") return "wait";
  if (normalized === "standing-aside" || normalized === "no clear advantage" || normalized === "stand-aside") return "stand-aside";
  if (normalized === "cannot-resolve" || normalized === "not enough evidence yet" || normalized === "undecided") return "undecided";
  return read;
}

export function advanceReadForFinding(outcome: string, currentRead: string, action: string): string {
  const read = normalizeWatchRead(currentRead);
  if (read === "stand-aside") return "stand-aside";
  if (outcome.includes("[thin-artifact]") || outcome.includes("[mirage")) return action === "enter-now" ? "wait" : read === "undecided" ? "wait" : read;
  if (outcome.includes("[breakdown]")) return action === "exit-now" ? "exit-now" : "stand-aside";
  if (outcome.includes("[genuine-move]") || outcome.includes("[exhaustion]")) return action === "enter-now" ? "enter-now" : read;
  if (outcome.includes("[crowded]")) return action === "exit-now" ? "exit-now" : "wait";
  if (outcome.includes("[calm]") || outcome.includes("[persistent]")) return action === "enter-now" ? "enter-now" : read;
  return read;
}
