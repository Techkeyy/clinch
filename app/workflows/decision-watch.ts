import { sleep } from "workflow";
import { getWatchStore } from "@/server/watch-db";
import { investigatePositioning, investigateSpot } from "@/research";
import { classifyFinding } from "@/research/orchestrator";
import type { MarketFacts } from "@/research/orchestrator";
import { advanceReadForFinding, isFavorableRead, materialChange, transitionFor, type WatchEvidenceSnapshot } from "@/domain/watch";
import { dispatchDecisionChanged } from "@/notifications/dispatcher";

function mergeFacts(previous: MarketFacts, family: string, incoming: Record<string, number | string | boolean | null>): MarketFacts {
  const next: MarketFacts = {
    spot: previous.spot ? { ...previous.spot } : undefined,
    perp: previous.perp ? { ...previous.perp } : undefined,
  };
  if (family === "spot-structure") {
    next.spot = next.spot ?? {};
    if (typeof incoming.last === "number") next.spot.last = incoming.last;
    if (typeof incoming.change24hPcnt === "number") next.spot.movePct24h = incoming.change24hPcnt;
    if (typeof incoming.spreadBps === "number") next.spot.spreadBps = incoming.spreadBps;
    if (typeof incoming.spreadWide === "boolean") next.spot.spreadWide = incoming.spreadWide;
    if (typeof incoming.topBidSize === "number") next.spot.topBidSize = incoming.topBidSize;
    if (typeof incoming.topAskSize === "number") next.spot.topAskSize = incoming.topAskSize;
    if (typeof incoming.windowMovePcnt === "number") next.spot.windowMovePcnt = incoming.windowMovePcnt;
    if (typeof incoming.supportLevel === "number") next.spot.supportLevel = incoming.supportLevel;
    if (typeof incoming.resistanceLevel === "number") next.spot.resistanceLevel = incoming.resistanceLevel;
    if (typeof incoming.lastVolume === "number") next.spot.lastVolume = incoming.lastVolume;
  } else {
    next.perp = next.perp ?? {};
    if (typeof incoming.fundingRate === "number") next.perp.fundingRate = incoming.fundingRate;
    if (typeof incoming.openInterest === "number") next.perp.openInterest = incoming.openInterest;
    if (typeof incoming.markIndexDislocationBps === "number") next.perp.markIndexDislocationBps = incoming.markIndexDislocationBps;
    if (typeof incoming.perpMovePcnt === "number") next.perp.perpMovePcnt = incoming.perpMovePcnt;
  }
  return next;
}

function nextCheckAt(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function decisionWatchWorkflow(watchId: string): Promise<{ status: string }> {
  "use workflow";
  while (true) {
    const result = await evaluateWatchStep(watchId);
    if (result.done) return { status: result.status };
    await sleep(result.cadenceSeconds * 1000);
  }
}

async function evaluateWatchStep(watchId: string): Promise<{ done: boolean; status: string; cadenceSeconds: number }> {
  "use step";
  const store = await getWatchStore();
  const watch = await store.getWatch(watchId);
  if (!watch) return { done: true, status: "missing", cadenceSeconds: 600 };
  if (watch.status === "CANCELLED" || watch.status === "TRIGGERED" || watch.status === "ERROR") {
    return { done: true, status: watch.status, cadenceSeconds: watch.plan.cadenceSeconds };
  }
  if (watch.status === "PAUSED") return { done: false, status: "paused", cadenceSeconds: watch.plan.cadenceSeconds };

  if (isFavorableRead(watch.currentRead) && watch.snapshot.previousRead) {
    const delivery = await dispatchDecisionChanged(store, watch, {
      eventType: "decision_changed",
      watchId: watch.id,
      assetLabel: watch.assetLabel,
      originalQuestion: watch.originalQuestion,
      previousRead: watch.snapshot.previousRead,
      nextRead: watch.currentRead,
      whatChanged: watch.snapshot.changeReasons ?? ["The monitored evidence changed enough to revisit the read."],
      evidenceVersion: watch.snapshot.evidenceVersion,
    });
    const terminalStatus = delivery === "sent" || delivery === "deduped" ? "TRIGGERED" : "PAUSED";
    await store.updateWatch(watch.id, watch.stateVersion, {
      status: terminalStatus,
      triggeredAt: terminalStatus === "TRIGGERED" ? new Date().toISOString() : undefined,
    });
    return { done: true, status: terminalStatus, cadenceSeconds: watch.plan.cadenceSeconds };
  }

  const previous = watch.snapshot;
  let probe;
  if (watch.plan.family === "spot-structure") {
    probe = await investigateSpot(watch.realityTicker, ["ticker"]);
  } else if (watch.perpTicker) {
    probe = await investigatePositioning(watch.perpTicker, ["ticker"]);
  } else {
    probe = { status: "no-data" as const, facts: {}, evidence: [] };
  }
  const probedFacts = mergeFacts(previous.facts, watch.plan.family, probe.facts);
  const probeChange = materialChange(watch.plan, previous, probedFacts);
  if (probe.status !== "ok") {
    await store.updateWatch(watch.id, watch.stateVersion, { lastCheckedAt: new Date().toISOString(), nextCheckAt: nextCheckAt(watch.plan.cadenceSeconds) });
    return { done: false, status: "upstream-unavailable", cadenceSeconds: watch.plan.cadenceSeconds };
  }
  if (!probeChange.changed) {
    const heartbeat: WatchEvidenceSnapshot = { ...previous, capturedAt: new Date().toISOString(), facts: probedFacts };
    await store.updateWatch(watch.id, watch.stateVersion, { snapshot: heartbeat, lastCheckedAt: heartbeat.capturedAt, nextCheckAt: nextCheckAt(watch.plan.cadenceSeconds) });
    return { done: false, status: "heartbeat", cadenceSeconds: watch.plan.cadenceSeconds };
  }

  const research = watch.plan.family === "spot-structure"
    ? await investigateSpot(watch.realityTicker, ["ticker", "candles", "depth"], "15m")
    : watch.perpTicker ? await investigatePositioning(watch.perpTicker, ["ticker", "candles"]) : null;
  if (!research || research.status !== "ok") {
    await store.updateWatch(watch.id, watch.stateVersion, { lastCheckedAt: new Date().toISOString(), nextCheckAt: nextCheckAt(watch.plan.cadenceSeconds) });
    return { done: false, status: "research-unavailable", cadenceSeconds: watch.plan.cadenceSeconds };
  }
  const facts = mergeFacts(probedFacts, watch.plan.family, research.facts);
  const finding = classifyFinding(watch.plan.hingeTopic ?? undefined, facts);
  const nextRead = finding ? advanceReadForFinding(finding, previous.read, watch.plan.action) : previous.read;
  const currentAt = new Date().toISOString();
  const nextSnapshot: WatchEvidenceSnapshot = {
    capturedAt: currentAt,
    facts,
    read: nextRead,
    evidenceVersion: previous.evidenceVersion + 1,
    previousRead: previous.read,
    changeReasons: probeChange.reasons,
  };
  const transition = transitionFor(watch.plan, previous, nextSnapshot, probeChange.reasons);
  const updated = await store.updateWatch(watch.id, watch.stateVersion, {
    currentRead: nextRead,
    snapshot: nextSnapshot,
    lastCheckedAt: currentAt,
    nextCheckAt: nextCheckAt(watch.plan.cadenceSeconds),
  });
  if (!updated) return { done: false, status: "version-conflict", cadenceSeconds: watch.plan.cadenceSeconds };
  if (!transition.targetReached) return { done: false, status: finding ? "re-evaluated" : "unchanged", cadenceSeconds: watch.plan.cadenceSeconds };

  const delivery = await dispatchDecisionChanged(store, updated, {
    eventType: "decision_changed",
    watchId: updated.id,
    assetLabel: updated.assetLabel,
    originalQuestion: updated.originalQuestion,
    previousRead: transition.previousRead,
    nextRead: transition.nextRead,
    whatChanged: transition.reasons,
    evidenceVersion: transition.evidenceVersion,
  });
  const terminalStatus = delivery === "sent" || delivery === "deduped" ? "TRIGGERED" : "PAUSED";
  await store.updateWatch(updated.id, updated.stateVersion, {
    status: terminalStatus,
    triggeredAt: terminalStatus === "TRIGGERED" ? currentAt : undefined,
  });
  return { done: true, status: terminalStatus, cadenceSeconds: watch.plan.cadenceSeconds };
}
