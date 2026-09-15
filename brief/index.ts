// Structured brief assembly from authoritative state FIRST; model wording
// polish is optional and can never add evidence. Truth lives in state.
export interface BriefSections {
  terminalStatus: "stopped" | "unresolved";
  terminalReasonCode: string;
  decision: string;
  read: string;
  why: string;
  findings: string[];
  completed: string[];
  skipped: { check: string; reason: string }[];
  openQuestions: string[];
  changeTriggers: string[];
  futureRechecks: string[];
  decisionImplication: {
    summary: string;
    supportiveEvidence: string[];
    cautionEvidence: string[];
    unresolvedPoint: string;
    changeTriggers: string[];
  };
  freshness: string;
  sources: string[];
  disclaimer: string;
}
export function renderStructuredBrief(b: BriefSections): string {
  const lines = [
    `Decision: ${b.decision}`,
    `Current read: ${b.read}`,
    `What this means: ${b.decisionImplication.summary}`,
    ...b.decisionImplication.supportiveEvidence.map((f) => `Supporting evidence: ${f}`),
    ...b.decisionImplication.cautionEvidence.map((f) => `Caution evidence: ${f}`),
    `What remains unresolved: ${b.decisionImplication.unresolvedPoint}`,
    `Why: ${b.why}`,
    ...b.findings.map((f, i) => `Finding ${i + 1}: ${f}`),
    `Checks completed: ${b.completed.length ? b.completed.join("; ") : "none yet"}`,
    ...b.skipped.map((s) => `Skipped ${s.check}: ${s.reason}`),
    `Open questions: ${b.openQuestions.length ? b.openQuestions.join("; ") : "none"}`,
    `What would change the current read: ${b.decisionImplication.changeTriggers.length ? b.decisionImplication.changeTriggers.join("; ") : "new relevant evidence"}`,
    ...(b.futureRechecks.length ? [`When to re-check: ${b.futureRechecks.join("; ")}`] : []),
    `Freshness: ${b.freshness}`,
    `Sources: ${b.sources.length ? b.sources.join("; ") : "Bitget market data, see findings"}`,
    b.disclaimer,
  ];
  return lines.join("\n");
}
export const HUMAN_DEC_LINE = "Research finished. The trading decision is yours. CLINCH never places trades.";
