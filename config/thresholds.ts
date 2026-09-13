// Versioned product configuration. Mechanism locked here; numeric thresholds
// calibrate in P10/P12/P16 against live data. Sessions record LOGIC_VERSION.
export const LOGIC_VERSION = "hinge-v1" as const;
export const SEMANTICS_VERSION = "semantics-v1" as const;

export const RESEARCH_LOOP_CAP = 6;

// Retention (P7/P15): research sessions 30 days; abuse buckets 24 hours max.
export const SESSION_TTL_MS = 30 * 24 * 3_600_000;
export const RATE_BUCKET_TTL_MS = 24 * 3_600_000;
// A researching run untouched this long is presumed interrupted (P15 resume rule).
export const STALE_RUN_MS = 5 * 60_000;export const MODEL_PARSE_ATTEMPTS = 2;
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

// Provisional qualitative bands (P10/P12/P16 calibrate against live data).
// Labeled provisional; numeric facts always preserved alongside bands.
export const BANDS = {
  SPREAD_WIDE_BPS: 10,
  DISLOCATION_WIDE_BPS: 15,
  MOVE_LARGE_PCT: 2,
  FUNDING_ELEVATED: 0.0005,
  FUNDING_EXTREME: 0.001,
} as const;

// Initial qualitative bands; numeric cutoffs calibrate later. Never invent precision.
export const SPREAD_BAND = { normal: "tight", wide: "wide" } as const;
