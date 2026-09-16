import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { getWatchStore } from "../server/watch-db";
import { runWatchWorker, WATCH_WORKER_DEFAULTS } from "../server/watch-runner";

function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const workerId = process.env.WATCH_WORKER_ID?.trim() || hostname() + "-" + process.pid + "-" + randomUUID().slice(0, 8);
const store = await getWatchStore();
const controller = new AbortController();
const stop = () => controller.abort();
process.once("SIGTERM", stop);
process.once("SIGINT", stop);

try {
  await runWatchWorker(store, {
    workerId,
    leaseMs: positiveInteger("WATCH_WORKER_LEASE_MS", WATCH_WORKER_DEFAULTS.leaseMs),
    batchSize: positiveInteger("WATCH_WORKER_BATCH_SIZE", WATCH_WORKER_DEFAULTS.batchSize),
    pollMs: positiveInteger("WATCH_WORKER_POLL_MS", WATCH_WORKER_DEFAULTS.pollMs),
    signal: controller.signal,
  });
} finally {
  await store.close();
}
