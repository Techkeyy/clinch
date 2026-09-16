import type { SessionRow } from "@/persistence/store";
import type { MarketFacts } from "@/research/orchestrator";
import { researchFamilyForTopic } from "@/server/interpretation";
import { compileWatchPlan, normalizeWatchRead, type WatchPlan } from "@/domain/watch";

type SavedState = {
  intent?: { asset?: string; action?: string; decisionQuestion?: string } | null;
  assetIdentity?: { normalTicker?: string | null; realityTicker?: string | null; perpSymbol?: string | null } | null;
  facts?: MarketFacts;
  hingeHistory?: { topic?: string | null; question?: string | null }[];
};

export function planFromSession(row: SessionRow): WatchPlan | null {
  const state = row.state as SavedState;
  const intent = state.intent;
  const asset = state.assetIdentity?.normalTicker || intent?.asset || state.assetIdentity?.realityTicker || "this stock";
  const hinge = state.hingeHistory?.[state.hingeHistory.length - 1] ?? null;
  const family = researchFamilyForTopic(hinge?.topic ?? null);
  const facts = state.facts ?? {};
  if (!intent || !state.assetIdentity?.realityTicker || !hinge || !family) return null;
  const brief = row.brief as { changeTriggers?: string[]; futureRechecks?: string[] } | null;
  return compileWatchPlan({
    asset,
    action: intent.action ?? "unclear",
    currentRead: normalizeWatchRead(row.read),
    hinge: { topic: hinge.topic, question: hinge.question },
    completedFamily: family,
    facts,
    changeTriggers: brief?.changeTriggers,
    futureRechecks: brief?.futureRechecks,
  });
}
