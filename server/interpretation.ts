import { BANDS } from "../config/thresholds";
import type { IntentContract } from "../domain/types";
import type { MarketFacts } from "../research/orchestrator";

export interface DecisionImplication {
  summary: string;
  supportiveEvidence: string[];
  cautionEvidence: string[];
  contextEvidence: string[];
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

export type ResearchFamily = "spot-structure" | "perp-positioning";

export function researchFamilyForTopic(topic: string | null | undefined): ResearchFamily | null {
  if (topic === "move-reality" || topic === "structure-direction") return "spot-structure";
  if (topic === "crowd-timing" || topic === "dislocation") return "perp-positioning";
  return null;
}

/**
 * Baseline facts are deliberately not eligible for interpretation. Only facts
 * belonging to a completed Hinge family may support the current read.
 */
export function factsForCompletedResearch(
  facts: MarketFacts,
  hingeHistory: { topic?: string | null }[],
): MarketFacts {
  const families = new Set(
    hingeHistory
      .map((hinge) => researchFamilyForTopic(hinge.topic))
      .filter((family): family is ResearchFamily => family !== null),
  );
  return {
    ...(families.has("spot-structure") && facts.spot ? { spot: facts.spot } : {}),
    ...(families.has("perp-positioning") && facts.perp ? { perp: facts.perp } : {}),
  };
}

export function groundedEvidenceSummary(
  topic: string | null | undefined,
  facts: MarketFacts,
): string {
  const family = researchFamilyForTopic(topic);
  if (family === "spot-structure") {
    const sp = facts.spot ?? {};
    const parts: string[] = [];
    if (typeof sp.windowMovePcnt === "number") {
      const direction = sp.windowMovePcnt > 0 ? "higher" : sp.windowMovePcnt < 0 ? "lower" : "flat";
      parts.push("The recent window was " + direction + " by " + Math.abs(sp.windowMovePcnt).toFixed(2) + "%.");
    }
    if (typeof sp.last === "number" && typeof sp.supportLevel === "number" && typeof sp.resistanceLevel === "number") {
      const inStructure = sp.last >= sp.supportLevel && sp.last <= sp.resistanceLevel;
      parts.push(inStructure
        ? "Price was within nearby structure from " + price(sp.supportLevel) + " to " + price(sp.resistanceLevel) + "."
        : "Nearby structure was marked from " + price(sp.supportLevel) + " to " + price(sp.resistanceLevel) + ", while price was " + price(sp.last) + ".");
    } else if (typeof sp.supportLevel === "number" && typeof sp.resistanceLevel === "number") {
      parts.push("Nearby structure was marked from " + price(sp.supportLevel) + " to " + price(sp.resistanceLevel) + ".");
    }
    if (typeof sp.spreadBps === "number") {
      parts.push(sp.spreadWide === true
        ? "The spread was wide at " + sp.spreadBps.toFixed(1) + " basis points."
        : "The spread was tight at " + sp.spreadBps.toFixed(1) + " basis points.");
    }
    return parts.length ? parts.join(" ") : "The completed spot-structure check did not produce a normalized market observation.";
  }
  if (family === "perp-positioning") {
    const pp = facts.perp ?? {};
    const parts: string[] = [];
    if (typeof pp.fundingRate === "number") {
      parts.push(pp.fundingRate >= BANDS.FUNDING_ELEVATED
        ? "Funding was elevated at " + (pp.fundingRate * 100).toFixed(3) + "%."
        : "Funding was calm at " + (pp.fundingRate * 100).toFixed(4) + "%.");
    }
    if (typeof pp.openInterest === "number") {
      parts.push("Open interest was " + Math.round(pp.openInterest).toLocaleString("en-US") + " contracts.");
    }
    if (typeof pp.markIndexDislocationBps === "number") {
      parts.push("The perp-index gap was " + Math.abs(pp.markIndexDislocationBps).toFixed(1) + " basis points.");
    }
    return parts.length ? parts.join(" ") : "The completed positioning check did not produce a normalized market observation.";
  }
  return "The completed market check did not produce a normalized observation for the current read.";
}

function remainingUncertainty(facts: MarketFacts): string {
  const support = facts.spot?.supportLevel;
  if (typeof support === "number") {
    return "Whether the observed stabilization persists or breaks below nearby support at " + price(support) + ".";
  }
  return "Whether the observed market conditions persist or change materially.";
}

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
  context: string[],
  triggers: string[],
): void {
  const sp = facts.spot ?? {};
  const move = sp.windowMovePcnt;
  const spread = sp.spreadBps;

  if (typeof move === "number") {
    if (move < 0) caution.push("The observed window is still lower by " + Math.abs(move).toFixed(2) + "%.");
    else if (move > 0) supportive.push("The observed window is higher by " + move.toFixed(2) + "%.");
    else context.push("The recent price move is holding flat.");
  }
  if (typeof spread === "number") {
    if (sp.spreadWide === true || spread > BANDS.SPREAD_WIDE_BPS) {
      context.push("Buying and selling prices are farther apart, so timing evidence is less reliable.");
    } else {
      context.push("Buying and selling prices are close together, so trading conditions look normal.");
    }
  }
  if (typeof sp.supportLevel === "number" && typeof sp.resistanceLevel === "number") {
    context.push("Recent prices are ranging between " + price(sp.supportLevel) + " and " + price(sp.resistanceLevel) + ".");
    triggers.push("A hold around nearby support at " + price(sp.supportLevel) + " followed by movement toward " + price(sp.resistanceLevel) + " would make the entry case more supportive.");
    triggers.push("A clean break below nearby support at " + price(sp.supportLevel) + " would support waiting longer.");
  } else if (typeof sp.supportLevel === "number") {
    context.push("A recent low is visible around " + price(sp.supportLevel) + ".");
    triggers.push("A clear hold or break around nearby support at " + price(sp.supportLevel) + " would change the timing read.");
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
  context: string[],
  triggers: string[],
): void {
  const pp = facts.perp ?? {};
  if (typeof pp.fundingRate === "number") {
    if (pp.fundingRate >= BANDS.FUNDING_ELEVATED) {
      caution.push("Futures trader positioning looks more crowded, which makes the timing less comfortable.");
      triggers.push("A normalization or further build in funding would change the crowding read.");
    } else {
      context.push("Futures trader positioning looks calm, with no elevated crowding signal in this check.");
      triggers.push("A sharp change in funding or open interest would change the positioning read.");
    }
  }
  if (typeof pp.markIndexDislocationBps === "number") {
    if (Math.abs(pp.markIndexDislocationBps) >= BANDS.DISLOCATION_WIDE_BPS) {
      caution.push("The futures price is separated from the stock price, so that gap needs to persist to matter.");
      triggers.push("Persistence or normalization of the spot-perp gap would change the dislocation read.");
    } else {
      context.push("The stock and futures prices are moving closely together.");
      triggers.push("A persistent widening or continued normalization of the spot-perp gap would change the dislocation read.");
    }
  }
}

function unresolvedTrigger(input: InterpretationInput): string {
  const uncertainty = input.uncertainty.join(" ");
  const lastTopic = input.hingeHistory[input.hingeHistory.length - 1]?.topic;
  if (/news|catalyst|event|headline|earnings/i.test(uncertainty)) {
    return "A supported news or event source covering the relevant catalyst would change this read.";
  }
  if (lastTopic === "structure-direction" || lastTopic === "move-reality") {
    return "A supported market-structure observation that distinguishes whether the move is stabilizing or downside is still extending would change this timing read.";
  }
  if (lastTopic === "crowd-timing" || lastTopic === "dislocation") {
    return "A supported positioning observation that shows whether crowding or dislocation is changing would change this timing read.";
  }
  if (input.intent?.action === "exit-now") {
    return "A supported market-structure or positioning observation showing whether the move is reversing would change this exit read.";
  }
  if (input.intent?.action === "enter-now" || input.intent?.action === "wait") {
    return "A supported market-structure observation that distinguishes whether the move is stabilizing or downside is still extending would change this timing read.";
  }
  return "A supported evidence source that directly covers the missing capability would change this read.";
}

export function deriveDecisionImplication(input: InterpretationInput): DecisionImplication {
  const last = input.hingeHistory[input.hingeHistory.length - 1];
  const question = cleanQuestion(last?.question) ?? cleanQuestion(input.intent?.decisionQuestion);
  const completedFacts = factsForCompletedResearch(input.facts, input.hingeHistory);
  const supportiveEvidence: string[] = [];
  const cautionEvidence: string[] = [];
  const contextEvidence: string[] = [];
  const changeTriggers: string[] = [];

  if (last?.topic === "structure-direction" || last?.topic === "move-reality" || completedFacts.spot) {
    structureInterpretation(completedFacts, supportiveEvidence, cautionEvidence, contextEvidence, changeTriggers);
  }
  if (last?.topic === "crowd-timing" || last?.topic === "dislocation" || completedFacts.perp) {
    positioningInterpretation(completedFacts, supportiveEvidence, cautionEvidence, contextEvidence, changeTriggers);
  }

  if (!supportiveEvidence.length && !cautionEvidence.length && input.uncertainty.length) {
    cautionEvidence.push("The available check did not produce a normalized market observation that can support a stronger read.");
  }
  if (!changeTriggers.length) {
    changeTriggers.push(input.terminal === "unresolved"
      ? unresolvedTrigger(input)
      : "A supported market observation that materially changes the current read would change this decision.");
  }

  return {
    summary: readSummary(input.read, input.terminal),
    supportiveEvidence,
    cautionEvidence,
    contextEvidence,
    unresolvedPoint: input.terminal === "unresolved"
      ? question ?? "The decision-changing question remains unresolved."
      : remainingUncertainty(completedFacts),
    changeTriggers: Array.from(new Set(changeTriggers)),
  };
}
