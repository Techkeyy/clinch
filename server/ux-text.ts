// Deterministic user-facing presentation text (P8 copy, capability-truth audited).
// No model, no jargon, no scores, no long dashes. Unit-tested.
export type TerminalKind = "stopped" | "unresolved";
export type TerminalReasonCode =
  | "NO_CAPABLE_FAMILY"
  | "NO_ANSWERABLE_HINGE"
  | "EXECUTOR_UNAVAILABLE"
  | "RESEARCH_UNAVAILABLE"
  | "ITERATION_CAP"
  | "NO_REMAINING_VALUE"
  | "INCOMPLETE";

/** Convert internal kernel reasons into a bounded diagnostic code. */
export function terminalReasonCode(internalReason: string): TerminalReasonCode {
  const reason = internalReason.toUpperCase();
  if (reason.includes("NO-CAPABLE-FAMILY") || reason.includes("NO_CAPABLE_FAMILY")) return "NO_CAPABLE_FAMILY";
  if (reason.includes("NO EXECUTOR") || reason.includes("NO EXECUTABLE") || reason.includes("NO CORRESPONDING PERP")) return "EXECUTOR_UNAVAILABLE";
  if (reason.includes("DATA MISSING") || reason.includes("RETURNED NO-DATA") || reason.includes("EVIDENCE WAS UNAVAILABLE")) return "RESEARCH_UNAVAILABLE";
  if (reason.includes("ITERATION CAP")) return "ITERATION_CAP";
  if (reason.includes("NO UNRESOLVED FLIPPABLE HINGE")) return "NO_REMAINING_VALUE";
  if (reason.includes("NOT ESTABLISHED") || reason.includes("NO ANSWERABLE")) return "NO_ANSWERABLE_HINGE";
  return "INCOMPLETE";
}

function unresolvedEvidenceNeed(action?: string | null, assetLabel?: string | null): string {
  const asset = assetLabel && assetLabel !== "unknown" ? assetLabel : "this asset";
  if (action === "exit-now") return "whether " + asset + " is reversing or still moving against the exit decision";
  if (action === "enter-now" || action === "wait") return "whether " + asset + " is stabilizing enough to enter now or whether downside is still extending";
  return "the market capability needed to answer the decision";
}

export function userUnresolvedReason(code: TerminalReasonCode, assetLabel?: string | null, action?: string | null): string {
  const asset = assetLabel ? ` for ${assetLabel}` : "";
  switch (code) {
    case "NO_CAPABLE_FAMILY":
    case "NO_ANSWERABLE_HINGE":
      return `CLINCH established live context${asset}, but it still needs supported evidence about ${unresolvedEvidenceNeed(action, assetLabel)}. No available research family can answer that question right now.`;
    case "EXECUTOR_UNAVAILABLE":
      return `CLINCH identified a decision question${asset}, but the required supported market path or instrument was unavailable.`;
    case "RESEARCH_UNAVAILABLE":
      return `CLINCH identified a decision question${asset}, but the supporting market evidence was unavailable. No unavailable result was treated as evidence.`;
    case "ITERATION_CAP":
      return `CLINCH could not complete the remaining research${asset} within this run. The decision remains unresolved.`;
    case "INCOMPLETE":
      return `CLINCH could not establish an answerable research path${asset}. The decision remains unresolved.`;
    case "NO_REMAINING_VALUE":
      return "CLINCH answered the relevant research question. The checks still available are unlikely to materially change this read.";
  }
}

export function userSkipReason(kind: string): string {
  switch (kind) {
    case "resolved": return "This check was already settled by earlier evidence.";
    case "no-data": return "This check was unavailable because its supporting market evidence was missing.";
    case "unsupported": return "This check is not supported for this instrument.";
    case "cannot-matter": return "This check was not expected to change the current read.";
    default: return "This check was not used in the final read.";
  }
}
export const TOPIC_WHY: Record<string, string> = {
  "move-reality":
    "If the move is mostly a thin-liquidity print, entering now is a different decision from buying real selling pressure.",
  "structure-direction":
    "If the drift is exhausted, timing an entry can make sense. If a new leg down has started, entering now catches a falling move.",
  "crowd-timing":
    "If leveraged traders are crowded on one side, entering with them can mean buying their exit.",
  "dislocation":
    "If the gap between spot and perp pricing is real and persistent, it is the trade. If it is a quoting mirage, there is no trade.",
};
export const TOPIC_CHANGES: Record<string, string> = {
  "move-reality": "Sustained closes on rebuilding depth, or confirmation of a thin print.",
  "structure-direction": "A clear break of nearby structure, or a hold that keeps the setup alive.",
  "crowd-timing": "A sharp change in funding or open interest before the decision point.",
  "dislocation": "The gap persisting into tradeable size, or quotes normalizing away.",
};
const pct = (x: number, digits = 2) =>
  `${x >= 0 ? "+" : ""}${(x * 100).toFixed(digits)}%`;

export function summarizeSpotFinding(symbol: string, facts: Record<string, number | string | boolean | null>): string {
  const parts: string[] = [];
  if (typeof facts.last === "number") {
    let s = `${symbol} trades ${facts.last}`;
    if (typeof facts.change24hPcnt === "number") s += `, ${pct(facts.change24hPcnt)} on the day`;
    parts.push(s + ".");
  }
  if (typeof facts.spreadBps === "number") {
    parts.push(facts.spreadWide === true ? `Spread is wide at ${facts.spreadBps} basis points.` : `Spread is tight at ${facts.spreadBps} basis points.`);
  }
  if (typeof facts.windowMovePcnt === "number") {
    parts.push(`Recent window moved ${pct(facts.windowMovePcnt / 100)}.`);
  }
  if (typeof facts.supportLevel === "number" && typeof facts.resistanceLevel === "number") {
    parts.push(`Nearby structure spans ${facts.supportLevel} to ${facts.resistanceLevel}.`);
  }
  return parts.length ? parts.join(" ") : "Spot check completed without a readable summary.";
}

export function summarizePerpFinding(symbol: string, facts: Record<string, number | string | boolean | null>): string {
  const parts: string[] = [];
  if (typeof facts.fundingRate === "number") {
    parts.push(facts.fundingRate >= 0.001
      ? `Funding is elevated at ${(facts.fundingRate * 100).toFixed(3)} percent, a crowded-long sign.`
      : `Funding is calm at ${(facts.fundingRate * 100).toFixed(4)} percent.`);
  }
  if (typeof facts.openInterest === "number") parts.push(`Open interest stands at ${Math.round(facts.openInterest).toLocaleString("en-US")} contracts.`);
  if (typeof facts.markIndexDislocationBps === "number") {
    parts.push(Math.abs(facts.markIndexDislocationBps) >= 15
      ? `Perp pricing sits ${Math.abs(facts.markIndexDislocationBps).toFixed(1)} basis points away from index: a real gap to judge.`
      : "Perp pricing tracks index closely.");
  }
  return parts.length ? parts.join(" ") : "Positioning check completed without a readable summary.";
}

/** Strip machine verdict tails ("... :: read now X") for user surfaces. */
export function cleanVerdict(s: string): string {
  return s.split("::")[0].replace(/\s*\[[a-z-]+\]/gi, " ").replace(/\s{2,}/g, " ").trim().replace(/[.]+$/, "") + ".";
}

export function userStopReason(internalWhy: string, residueEmpty: boolean): string {
  void internalWhy;
  void residueEmpty;
  return "CLINCH answered the relevant research question. The checks still available are unlikely to materially change this read.";
}
