// Deterministic user-facing presentation text (P8 copy, capability-truth audited).
// No model, no jargon, no scores, no long dashes. Unit-tested.
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
  return "CLINCH is stopping here. The checks still available are unlikely to change this read.";
}
