export type TimingOutcome = "ok" | "fallback" | "failed" | "timeout";

export interface TimingEvent {
  stage: string;
  phase: "start" | "end" | "mark";
  durationMs?: number;
  outcome?: TimingOutcome;
}

export interface TimingReporter {
  start(stage: string): void;
  end(stage: string, outcome?: TimingOutcome): void;
  mark(stage: string, outcome?: TimingOutcome): void;
}

/**
 * Non-secret stage instrumentation for production diagnosis.
 * Only stage names, phases, durations, and bounded outcomes are emitted.
 */
export function createTimingReporter(sink?: (event: TimingEvent) => void): TimingReporter {
  const started = new Map<string, number>();
  const report = (event: TimingEvent) => {
    sink?.(event);
    console.info("[CLINCH_TIMING]", JSON.stringify(event));
  };
  return {
    start(stage) {
      started.set(stage, Date.now());
      report({ stage, phase: "start" });
    },
    end(stage, outcome = "ok") {
      const start = started.get(stage);
      started.delete(stage);
      report({ stage, phase: "end", durationMs: start === undefined ? undefined : Date.now() - start, outcome });
    },
    mark(stage, outcome = "ok") {
      report({ stage, phase: "mark", outcome });
    },
  };
}

export async function timedStage<T>(
  timing: TimingReporter,
  stage: string,
  work: () => Promise<T>,
): Promise<T> {
  timing.start(stage);
  try {
    const value = await work();
    timing.end(stage, "ok");
    return value;
  } catch (error) {
    timing.end(stage, error instanceof Error && /timed out/i.test(error.message) ? "timeout" : "failed");
    throw error;
  }
}
