import { BANDS } from "../config/thresholds";
import type { IntentContract } from "../domain/types";
import type { MarketFacts } from "../research/orchestrator";

export interface DecisionImplication {
  summary: string;
  supportiveEvidence: string[];
  cautionEvidence: string[];
  unresolvedPoint: string;
  changeTriggers: string[];
}

export interface InterpretationInput {
  intent: IntentContract | null;
  read: string;
  terminal: "stopped" | "unresolved";
  hingeHistory: { topic?: string | null; question?: string | null }[];
  facts: MarketFacts;
  uncertainty: string[];
}

const cleanQuestion = (question: string | null | undefined): string | null => {
  if (!question) return null;
  const clean = question.replace(/\s+/g, " ").trim().replace(/[?]+$/, "");
  return clean ? `${clean}?` : null;
};

const price = (value: number): string => value.toLocaleString("en-US", { maximumFractionDigits: 2 });

function readSummary(read: string, terminal: "stopped" | "unresolved"): string {
  if (terminal === "unresolved" || read === "cannot-resolve" || read === "undecided") {
    return "The available evidence does not answer the decision-changing question yet.";
  }
  if (read === "enter-now" || read === "leaning-in") {
    return "The observed evidence currently supports the contemplated entry more than waiting or avoiding it.";
  }
  if (read === "wait" || read === "holding-off") {
    return "The observed evidence does not yet justify acting, so waiting for the Hinge to resolve is more supported.";
  }
  if (read === "stand-aside" || read === "standing-aside") {
    return "The evidence is mixed or unattractive enough that acting is not justified by this read.";
  }
  return "The observed evidence narrows the decision, but does not establish a safe next step.";
}

function structureInterpretation(
  facts: MarketFacts,
  supportive: string[],
  caution: string[],
  triggers: string[],
): void {
  const sp = facts.spot ?? {};
  const move = sp.windowMovePcnt;
  const spread = sp.spreadBps;

  if (typeof move === "number") {
    if (move < 0) caution.push(`The observed window is still lower by ${Math.abs(move).toFixed(2)}%.`);
    else if (move > 0) supportive.push(`The observed window is higher by ${move.toFixed(2)}%.`);
    else supportive.push("The observed window is holding flat.");
  }
  if (typeof spread === "number") {
    if (sp.spreadWide === true || spread > BANDS.SPREAD_WIDE_BPS) {
      caution.push(`The spread is wide at ${spread.toFixed(1)} basis points, so timing evidence is less reliable.`);
    } else {
      supportive.push(`The spread is tight at ${spread.toFixed(1)} basis points, so the observed move has usable liquidity context.`);
    }
  }
  if (typeof sp.supportLevel === "number" && typeof sp.resistanceLevel === "number") {
    supportive.push(`Nearby structure is visible between ${price(sp.supportLevel)} and ${price(sp.resistanceLevel)}.`);
    triggers.push(`A hold around nearby support at ${price(sp.supportLevel)} followed by movement toward ${price(sp.resistanceLevel)} would make the entry case more supportive.`);
    triggers.push(`A clean break below nearby support at ${price(sp.supportLevel)} would support waiting longer.`);
  } else if (typeof sp.supportLevel === "number") {
    supportive.push(`Nearby support is visible at ${price(sp.supportLevel)}.`);
    triggers.push(`A clear hold or break around nearby support at ${price(sp.supportLevel)} would change the timing read.`);
  } else if (typeof move === "number") {
    triggers.push(move < 0
      ? "A clear stabilization of the lower move, or renewed downside follow-through, would change this timing read."
      : "A clear loss of the current hold, or continued follow-through, would change this timing read.");
  }
}

function positioningInterpretation(
  facts: MarketFacts,
  supportive: string[],
  caution: string[],
  triggers: string[],
): void {
  const pp = facts.perp ?? {};
  if (typeof pp.fundingRate === "number") {
    if (pp.fundingRate >= BANDS.FUNDING_ELEVATED) {
      caution.push(`Funding is elevated at ${(pp.fundingRate * 100).toFixed(3)}%, which points to more crowded positioning.`);
      triggers.push("A normalization or further build in funding would change the crowding read.");
    } else {
      supportive.push(`Funding is calm at ${(pp.fundingRate * 100).toFixed(4)}%, with no elevated crowding signal in this check.`);
      triggers.push("A sharp change in funding or open interest would change the positioning read.");
    }
  }
  if (typeof pp.markIndexDislocationBps === "number") {
    if (Math.abs(pp.markIndexDislocationBps) >= BANDS.DISLOCATION_WIDE_BPS) {
      caution.push(`Perp pricing is ${Math.abs(pp.markIndexDislocationBps).toFixed(1)} basis points from index, so the gap needs to persist to matter.`);
      triggers.push("Persistence or normalization of the spot-perp gap would change the dislocation read.");
    } else {
      supportive.push("Perp pricing is tracking the index closely in this check.");
      triggers.push("A persistent widening or continued normalization of the spot-perp gap would change the dislocation read.");
    }
  }
}

export function deriveDecisionImplication(input: InterpretationInput): DecisionImplication {
  const last = input.hingeHistory[input.hingeHistory.length - 1];
  const question = cleanQuestion(last?.question) ?? cleanQuestion(input.intent?.decisionQuestion);
  const supportiveEvidence: string[] = [];
  const cautionEvidence: string[] = [];
  const changeTriggers: string[] = [];

  if (last?.topic === "structure-direction" || last?.topic === "move-reality" || input.facts.spot) {
    structureInterpretation(input.facts, supportiveEvidence, cautionEvidence, changeTriggers);
  }
  if (last?.topic === "crowd-timing" || last?.topic === "dislocation" || input.facts.perp) {
    positioningInterpretation(input.facts, supportiveEvidence, cautionEvidence, changeTriggers);
  }

  if (!supportiveEvidence.length && !cautionEvidence.length && input.uncertainty.length) {
    cautionEvidence.push("The available check did not produce a normalized market observation that can support a stronger read.");
  }
  if (!changeTriggers.length) {
    changeTriggers.push(question
      ? `A supported finding that answers “${question}” would change the read.`
      : "A supported finding that answers the remaining decision question would change the read.");
  }

  return {
    summary: readSummary(input.read, input.terminal),
    supportiveEvidence,
    cautionEvidence,
    unresolvedPoint: input.terminal === "unresolved"
      ? question ?? "The decision-changing question remains unresolved."
      : question ?? "No further supported question is expected to materially change this read.",
    changeTriggers: Array.from(new Set(changeTriggers)),
  };
}
