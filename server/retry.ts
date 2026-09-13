import { STALE_RUN_MS } from "../config/thresholds";

// Retryable terminal states, plus presumed-interrupted runs (researching but
// untouched beyond STALE_RUN_MS). A deliberate STOP is successful completion,
// never retryable: fresh research after completion starts a NEW session.
// cannot-resolve is a completed outcome, not a failure.
export function retryAllowed(status: string, updatedAtIso: string, nowMs: number): boolean {
  if (status === "failed") return true;
  if (status !== "researching") return false;
  const age = nowMs - Date.parse(updatedAtIso);
  return Number.isFinite(age) && age > STALE_RUN_MS;
}
