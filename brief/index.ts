// Structured brief assembly from authoritative state FIRST; model wording
// polish is optional and can never add evidence. Truth lives in state.
export interface BriefSections {
  decision: string;
  read: string;
  why: string;
  findings: string[];
  completed: string[];
  skipped: { check: string; reason: string }[];
  openQuestions: string[];
  changeTriggers: string[];
  freshness: string;
  sources: string[];
  disclaimer: string;
}
export function renderStructuredBrief(b: BriefSections): string {
  const lines = [
    `Decision: ${b.decision}`,
    `Current read: ${b.read}`,
    `Why: ${b.why}`,
    ...b.findings.map((f, i) => `Finding ${i + 1}: ${f}`),
    `Checks completed: ${b.completed.length ? b.completed.join("; ") : "none yet"}`,
    ...b.skipped.map((s) => `Skipped ${s.check}: ${s.reason}`),
    `Open questions: ${b.openQuestions.length ? b.openQuestions.join("; ") : "none"}`,
    `What would change this read: ${b.changeTriggers.length ? b.changeTriggers.join("; ") : "new relevant evidence"}`,
    `Freshness: ${b.freshness}`,
    `Sources: ${b.sources.length ? b.sources.join("; ") : "Bitget market data, see findings"}`,
    b.disclaimer,
  ];
  return lines.join("\n");
}
export const HUMAN_DEC_LINE = "Research finished. The trading decision is yours. CLINCH never places trades.";
