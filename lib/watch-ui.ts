export type DecisionWatchEligibility = "target-reached" | "eligible";

export function decisionWatchEligibility(currentRead: string): DecisionWatchEligibility {
  return currentRead.trim().toLowerCase() === "slightly favorable" ? "target-reached" : "eligible";
}
