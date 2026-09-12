// Versioned product configuration. Mechanism locked here; numeric thresholds
// calibrate in P10/P12/P16 against live data. Sessions record LOGIC_VERSION.
export const LOGIC_VERSION = "hinge-v1" as const;
export const SEMANTICS_VERSION = "semantics-v1" as const;

export const RESEARCH_LOOP_CAP = 6;
export const MODEL_PARSE_ATTEMPTS = 2;
export const MODEL_POLISH_ATTEMPTS = 2;
export const MAX_MODEL_CALLS_PER_RUN = 4;
export const MAX_CLARIFICATION_ROUNDS = 3;
export const MAX_STEP_RETRIES = 3;
export const MAX_ACTIVE_RUNS_PER_OWNER = 2;

// Initial conservative freshness budgets (ms). P10 refines per evidence type.
export const FRESHNESS_BUDGET_MS = {
  ticker: 60_000,
  candles: 300_000,
  orderbook: 30_000,
  positioning: 300_000,
} as const;

// Initial qualitative bands; numeric cutoffs calibrate later. Never invent precision.
export const SPREAD_BAND = { normal: "tight", wide: "wide" } as const;
