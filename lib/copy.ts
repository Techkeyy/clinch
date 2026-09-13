// P8 copy constants. No em/en dashes anywhere (design-skill hard rule).
// Every research claim here is derivable from spot-structure or perp-positioning.
export const COPY = {
  heroQuestion: "What are you deciding?",
  heroSupport:
    "CLINCH finds the unanswered question most capable of changing your decision, researches it with live Bitget data, and stops when more research is unlikely to matter.",
  inputPlaceholder:
    "Example: rNVDA fell hard after the close. I am thinking of buying the dip. Real opportunity or wait?",
  inputLabel: "Describe the trade you are considering",
  ctaCheck: "Find the Decision Hinge",
  trustLine: "CLINCH researches the decision. It does not place trades.",
  restatementTitle: "Your decision",
  confirmHint: "Is that right?",
  clarifierQuestion: "What are you deciding about this asset?",
  choiceEnter: "Enter now",
  choiceExit: "Exit",
  choiceWait: "Wait for a better moment",
  choiceUndecided: "I am not deciding yet",
  undecidedState:
    "CLINCH works from a decision you are considering. Tell me what you might do, such as enter now, exit, or wait.",
  hingeEyebrow: "Decision Hinge",
  hingeWhy: "Why this matters",
  hingeChanges: "What would change the read",
  skippedEyebrow: "Skipped",
  skippedWhy: "Why skipped",
  stopStatement:
    "CLINCH is stopping here. The checks still available are unlikely to change this read.",
  unresolvedTitle: "Cannot resolve with current evidence",
  finalNotice: "Research finished. The trading decision is yours. CLINCH never places trades.",
  privacyNote:
    "Private by design: no account, no wallet. Research lives in this browser session for 30 days; clearing site data removes access.",
  recheck: "Re-check now",
  reviewBrief: "Review saved brief",
  deleteResearch: "Delete this research",
  recentTitle: "Recent decisions",
  readLeaningIn: "Leaning in",
  readHoldingOff: "Holding off",
  readStandingAside: "Standing aside",
  readCannotResolve: "Cannot resolve",
} as const;
export type CopyKey = keyof typeof COPY;
