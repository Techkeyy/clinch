import { investigatePositioning, investigateSpot } from "../research";
import { classifyFinding, type MarketFacts } from "../research/orchestrator";
import { advanceReadForFinding, isFavorableRead, materialChange, transitionFor, type WatchEvidenceSnapshot } from "../domain/watch";
import { dispatchDecisionChanged } from "../notifications/dispatcher";
import type { WatchRow, WatchStore } from "../persistence/watch";

const DEFAULT_LEASE_MS = 5 * 60_000;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_POLL_MS = 5_000;

export interface WatchWorkerOptions {
  workerId: string;
  leaseMs?: number;
  batchSize?: number;
  pollMs?: number;
  maxCycles?: number;
  signal?: AbortSignal;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => Date;
  logger?: Pick<Console, "info" | "error">;
}

export interface WatchWorkerCycle {
  claimed: number;
  processed: number;
  errors: string[];
}

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

function nextCheckAt(seconds: number, now: () => Date): string {
  return new Date(now().getTime() + seconds * 1000).toISOString();
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 500);
}

async function updateClaimed(
  store: WatchStore,
  current: WatchRow,
  workerId: string,
  patch: Parameters<WatchStore["updateWatch"]>[2],
): Promise<WatchRow | null> {
  return store.updateWatch(current.id, current.stateVersion, patch, workerId);
}

export async function processClaimedWatch(
  store: WatchStore,
  claimed: WatchRow,
  workerId: string,
  now: () => Date = () => new Date(),
): Promise<string> {
  let current = claimed;
  try {
    if (current.status !== "ACTIVE") return "not-active";

    if (isFavorableRead(current.currentRead) && current.snapshot.previousRead) {
      const delivery = await dispatchDecisionChanged(store, current, {
        eventType: "decision_changed",
        watchId: current.id,
        assetLabel: current.assetLabel,
        originalQuestion: current.originalQuestion,
        previousRead: current.snapshot.previousRead,
        nextRead: current.currentRead,
        whatChanged: current.snapshot.changeReasons ?? ["The monitored evidence changed enough to revisit the read."],
        evidenceVersion: current.snapshot.evidenceVersion,
      });
      const terminalStatus = delivery === "sent" || delivery === "deduped" ? "TRIGGERED" : "PAUSED";
      const updated = await updateClaimed(store, current, workerId, {
        status: terminalStatus,
        triggeredAt: terminalStatus === "TRIGGERED" ? now().toISOString() : undefined,
      });
      if (updated) current = updated;
      return updated ? terminalStatus : "version-conflict";
    }

    const previous = current.snapshot;
    let probe;
    if (current.plan.family === "spot-structure") {
      probe = await investigateSpot(current.realityTicker, ["ticker"]);
    } else if (current.perpTicker) {
      probe = await investigatePositioning(current.perpTicker, ["ticker"]);
    } else {
      probe = { status: "no-data" as const, facts: {}, evidence: [] };
    }
    const probedFacts = mergeFacts(previous.facts, current.plan.family, probe.facts);
    const probeChange = materialChange(current.plan, previous, probedFacts);
    if (probe.status !== "ok") {
      const updated = await updateClaimed(store, current, workerId, {
        lastCheckedAt: now().toISOString(),
        nextCheckAt: nextCheckAt(current.plan.cadenceSeconds, now),
      });
      if (updated) current = updated;
      return updated ? "upstream-unavailable" : "version-conflict";
    }
    if (!probeChange.changed) {
      const capturedAt = now().toISOString();
      const heartbeat: WatchEvidenceSnapshot = { ...previous, capturedAt, facts: probedFacts };
      const updated = await updateClaimed(store, current, workerId, {
        snapshot: heartbeat,
        lastCheckedAt: capturedAt,
        nextCheckAt: nextCheckAt(current.plan.cadenceSeconds, now),
      });
      if (updated) current = updated;
      return updated ? "heartbeat" : "version-conflict";
    }

    const research = current.plan.family === "spot-structure"
      ? await investigateSpot(current.realityTicker, ["ticker", "candles", "depth"], "15m")
      : current.perpTicker ? await investigatePositioning(current.perpTicker, ["ticker", "candles"]) : null;
    if (!research || research.status !== "ok") {
      const updated = await updateClaimed(store, current, workerId, {
        lastCheckedAt: now().toISOString(),
        nextCheckAt: nextCheckAt(current.plan.cadenceSeconds, now),
      });
      if (updated) current = updated;
      return updated ? "research-unavailable" : "version-conflict";
    }

    const facts = mergeFacts(probedFacts, current.plan.family, research.facts);
    const finding = classifyFinding(current.plan.hingeTopic ?? undefined, facts);
    const nextRead = finding ? advanceReadForFinding(finding, previous.read, current.plan.action) : previous.read;
    const currentAt = now().toISOString();
    const nextSnapshot: WatchEvidenceSnapshot = {
      capturedAt: currentAt,
      facts,
      read: nextRead,
      evidenceVersion: previous.evidenceVersion + 1,
      previousRead: previous.read,
      changeReasons: probeChange.reasons,
    };
    const transition = transitionFor(current.plan, previous, nextSnapshot, probeChange.reasons);
    const updated = await updateClaimed(store, current, workerId, {
      currentRead: nextRead,
      snapshot: nextSnapshot,
      lastCheckedAt: currentAt,
      nextCheckAt: nextCheckAt(current.plan.cadenceSeconds, now),
    });
    if (!updated) return "version-conflict";
    current = updated;
    if (!transition.targetReached) return finding ? "re-evaluated" : "unchanged";

    const delivery = await dispatchDecisionChanged(store, current, {
      eventType: "decision_changed",
      watchId: current.id,
      assetLabel: current.assetLabel,
      originalQuestion: current.originalQuestion,
      previousRead: transition.previousRead,
      nextRead: transition.nextRead,
      whatChanged: transition.reasons,
      evidenceVersion: transition.evidenceVersion,
    });
    const terminalStatus = delivery === "sent" || delivery === "deduped" ? "TRIGGERED" : "PAUSED";
    const terminal = await updateClaimed(store, current, workerId, {
      status: terminalStatus,
      triggeredAt: terminalStatus === "TRIGGERED" ? currentAt : undefined,
    });
    if (terminal) current = terminal;
    return terminal ? terminalStatus : "version-conflict";
  } finally {
    try {
      await store.releaseLease(current.id, workerId, current.stateVersion);
    } catch {
      // The lease has an expiry safety net; do not hide the processing result.
    }
  }
}

export async function runWatchWorkerCycle(
  store: WatchStore,
  options: Pick<WatchWorkerOptions, "workerId" | "leaseMs" | "batchSize" | "now" | "logger">,
): Promise<WatchWorkerCycle> {
  const now = options.now ?? (() => new Date());
  const claimed = await store.claimDueWatches(
    options.workerId,
    now(),
    options.leaseMs ?? DEFAULT_LEASE_MS,
    options.batchSize ?? DEFAULT_BATCH_SIZE,
  );
  const errors: string[] = [];
  let processed = 0;
  for (const watch of claimed) {
    try {
      await processClaimedWatch(store, watch, options.workerId, now);
      processed += 1;
    } catch (error) {
      const message = errorMessage(error);
      errors.push(watch.id + ": " + message);
      options.logger?.error("Decision Watch processing failed", { watchId: watch.id, error: message });
    }
  }
  return { claimed: claimed.length, processed, errors };
}

function waitFor(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    timer = setTimeout(finish, milliseconds);
    signal?.addEventListener("abort", finish, { once: true });
  });
}

export async function runWatchWorker(store: WatchStore, options: WatchWorkerOptions): Promise<void> {
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? ((milliseconds: number) => waitFor(milliseconds, options.signal));
  const logger = options.logger ?? console;
  const startedAt = now().toISOString();
  await store.recordWorkerHeartbeat({
    workerId: options.workerId,
    startedAt,
    lastCycleStartedAt: null,
    lastCycleFinishedAt: null,
    lastCycleClaimed: 0,
    lastCycleProcessed: 0,
    lastError: null,
  });

  let cycle = 0;
  while (!options.signal?.aborted && (options.maxCycles === undefined || cycle < options.maxCycles)) {
    const cycleStartedAt = now().toISOString();
    let result: WatchWorkerCycle = { claimed: 0, processed: 0, errors: [] };
    try {
      result = await runWatchWorkerCycle(store, { ...options, now });
    } catch (error) {
      const message = errorMessage(error);
      result.errors.push(message);
      logger.error("Decision Watch worker cycle failed", { workerId: options.workerId, error: message });
    }
    const cycleFinishedAt = now().toISOString();
    await store.recordWorkerHeartbeat({
      workerId: options.workerId,
      startedAt,
      lastCycleStartedAt: cycleStartedAt,
      lastCycleFinishedAt: cycleFinishedAt,
      lastCycleClaimed: result.claimed,
      lastCycleProcessed: result.processed,
      lastError: result.errors.length ? result.errors.join(" | ").slice(0, 500) : null,
    });
    cycle += 1;
    if (options.maxCycles !== undefined && cycle >= options.maxCycles) break;
    await sleep(options.pollMs ?? DEFAULT_POLL_MS);
  }
}

export const WATCH_WORKER_DEFAULTS = {
  leaseMs: DEFAULT_LEASE_MS,
  batchSize: DEFAULT_BATCH_SIZE,
  pollMs: DEFAULT_POLL_MS,
} as const;
