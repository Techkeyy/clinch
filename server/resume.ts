import type { LoopInput } from "./flow";

// Persisted-state shape the retry route reconstructs a resume from. Deliberately
// a subset: only what the server persisted, never UI-derived input, so a stream
// disconnect can never erase completed work — resume seeds from this state.
export interface SavedResumeState {
  intent: { asset: string; action: string };
  spotSymbol: string | null;
  perpSymbol: string | null;
  read: string;
  resolvedTopics: string[];
  facts: Record<string, unknown>;
  skips?: { check: string; reason: string; kind?: string }[];
  uncertainty?: string[];
  stopReason?: string | null;
  context?: string;
  known?: string[];
  hingeHistory?: { hinge?: string; topic?: string | null; verdict?: string }[];
}

// buildResumeInput derives the driveLoop seed from persisted server state alone.
// Completed Hinge topics re-enter resolvedTopics so a resumed loop never re-runs
// a completed family; availability resets to fresh so the next unresolved family
// may execute. The retry route AND its tests call this same helper.
export function buildResumeInput(st: SavedResumeState): LoopInput {
  const completedTopics = (st.hingeHistory ?? []).map((h) => h.topic).filter((t): t is string => !!t);
  return {
    asset: st.intent.asset,
    spotSymbol: st.spotSymbol ?? "",
    perpSymbol: st.perpSymbol,
    action: st.intent.action,
    read: st.read === "cannot-resolve" ? "undecided" : st.read,
    resolvedTopics: [...new Set([...st.resolvedTopics, ...completedTopics])],
    facts: JSON.parse(JSON.stringify(st.facts ?? {})),
    data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
    context: st.context ?? "",
    known: [...(st.known ?? [])],
    skips: (st.skips ?? []).map((s) => ({ ...s })),
    uncertainty: [...(st.uncertainty ?? [])],
    stopReason: st.stopReason ?? null,
    hingeHistory: (st.hingeHistory ?? []).map((h) => ({
      hinge: h.hinge ?? "restored",
      topic: h.topic ?? null,
      verdict: h.verdict ?? "restored finding",
    })),
  };
}
