import { z } from "zod";

// P7/P6 foundation schemas. Server-authoritative; shared client/server for messages only.

export const ContemplatedAction = z.enum(["enter-now", "wait", "exit-now", "stand-aside", "unclear"]);
export type ContemplatedAction = z.infer<typeof ContemplatedAction>;

export const CurrentRead = z.enum(["leaning-in", "holding-off", "standing-aside", "cannot-resolve", "undecided"]);
export type CurrentRead = z.infer<typeof CurrentRead>;

export const ResearchFamily = z.enum(["spot-structure", "perp-positioning"]);
export type ResearchFamily = z.infer<typeof ResearchFamily>;

export const SessionId = z.string().uuid();
export const IdempotencyKey = z.string().regex(/^[A-Za-z0-9-_]{16,64}$/);
export const StateVersion = z.number().int().nonnegative();

export const OrchestratorState = z.enum([
  "awaiting", "clarifying", "context", "researching", "evaluating",
  "stopped", "unresolved", "failed",
]);
export type OrchestratorState = z.infer<typeof OrchestratorState>;

export const FreshnessStatus = z.enum(["fresh", "stale", "missing"]);
export type FreshnessStatus = z.infer<typeof FreshnessStatus>;

// P7 no-data invariant: missing vs negative are distinct types.
export const NoData = z.object({ kind: z.literal("no-data"), reason: z.string().min(1) });
export type NoData = z.infer<typeof NoData>;
export const NegativeEvidence = z.object({ kind: z.literal("negative"), detail: z.string().min(1) });
export type NegativeEvidence = z.infer<typeof NegativeEvidence>;

export const Freshness = z.object({
  source: z.string().min(1),
  symbol: z.string().min(1),
  observedAt: z.string().datetime(),
  sourceTimestamp: z.string().datetime().nullable(),
  fetchedAt: z.string().datetime(),
  ageMs: z.number().nonnegative().nullable(),
  status: FreshnessStatus,
});
export type Freshness = z.infer<typeof Freshness>;

export const Provenance = z.object({
  endpointFamily: z.string().min(1),
  symbol: z.string().min(1),
  evidenceType: z.string().min(1),
  sourceTimestamp: z.string().datetime().nullable(),
  fetchedAt: z.string().datetime(),
});
export type Provenance = z.infer<typeof Provenance>;

export const SkipKind = z.enum(["resolved", "cannot-matter", "no-data", "unsupported"]);
export type SkipKind = z.infer<typeof SkipKind>;
export const SkipRecord = z.object({ family: ResearchFamily, kind: SkipKind, reason: z.string().min(1) });
export type SkipRecord = z.infer<typeof SkipRecord>;

export const DilemmaInput = z.object({ dilemma: z.string().trim().min(4).max(2000) });
export type DilemmaInput = z.infer<typeof DilemmaInput>;

export const ClarificationInput = z.object({ text: z.string().trim().min(1).max(500) });
export type ClarificationInput = z.infer<typeof ClarificationInput>;

export const IntentContract = z.object({
  asset: z.string().min(1).max(32),
  resolvedSymbol: z.string().nullable(),
  action: ContemplatedAction,
  timeframeContext: z.string().max(200),
  decisionQuestion: z.string().min(1).max(500),
  clarificationNeeded: z.boolean(),
  clarificationQuestion: z.string().max(300).nullable(),
});
export type IntentContract = z.infer<typeof IntentContract>;
