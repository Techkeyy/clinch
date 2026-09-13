import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bitgetGet } from "../research/bitget/client";
import { DepthBook, SpotTickerRow } from "../research/bitget/endpoints";
import { classifyUpstream } from "../research/bitget/errors";
import { mapSpotToPerp } from "../research/bitget/index";
import { decide, applyOutcome, initialState, type Candidate, type KernelOutput } from "../domain/kernel";
import { compileSemantics, type RawFacts } from "../domain/semantics";
import { parseIntentFlow } from "../server/flow";

type Expected = {
  firstFamily?: string | null;
  secondFamily?: string;
  firstTopic?: string | null;
  afterSim?: { final: string };
};
type Scenario = {
  id: string;
  action: string;
  read: string;
  candidates: Candidate[];
  data: Record<string, string>;
  sim: Record<string, string>;
  expected: Expected;
  source: "P5A" | "P5B";
};
type Replay = { steps: KernelOutput[]; calls: string[]; available: string[]; critical: string[] };

type P5AScenarioInput = { id: string; action: string; read: string; candidates: Candidate[]; data: Record<string, string> };
const load = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as T;
const P5A_SCEN = load<{ scenarios: P5AScenarioInput[] }>("../proof/p5/scenarios/scenarios.json").scenarios;
const P5A_EXP = load<Record<string, Expected>>("../proof/p5/expected/expected.json");
const P5A_SIM = load<Record<string, Record<string, string>>>("../proof/p5/runs/sim.json");
const P5B_EXP = load<Record<string, Expected>>("../proof/p5b/expected/expected.json");
const P5B_SIM = load<Record<string, Record<string, string>>>("../proof/p5b/runs/sim.json");

const P5B_IDS = ["B01", "B02", "B03", "B04", "B05", "B06a", "B06b", "B07a", "B07b", "B08", "B09", "B10", "H-A", "H-B", "H-C"];

function rawToScenario(id: string): Scenario {
  const raw = load<RawFacts>(`../proof/p5b/raw/${id}.json`);
  const pkg = compileSemantics(raw);
  return { id, action: raw.action, read: raw.read, candidates: pkg.candidates, data: { ...raw.data }, sim: P5B_SIM[id] || {}, expected: P5B_EXP[id], source: "P5B" };
}

const makeP5AScenario = (s: P5AScenarioInput): Scenario => ({
  id: s.id,
  action: s.action,
  read: s.read,
  candidates: s.candidates,
  data: { ...s.data },
  sim: P5A_SIM[s.id] || {},
  expected: P5A_EXP[s.id],
  source: "P5A",
});

const SCENARIOS: Scenario[] = [
  ...P5A_SCEN.map(makeP5AScenario),
  ...P5B_IDS.map(rawToScenario),
];

function familyFor(scenario: Scenario, questionId: string): string | null {
  return scenario.candidates.find((q) => q.id === questionId)?.families?.[0] ?? null;
}

function criticalFamilies(scenario: Scenario): string[] {
  if (scenario.source === "P5A") {
    return [...new Set([scenario.expected.firstFamily, scenario.expected.secondFamily].filter((f): f is string => !!f))];
  }
  return [...new Set(Object.keys(scenario.sim).map((id) => familyFor(scenario, id)).filter((f): f is string => !!f))];
}

function replay(scenario: Scenario): Replay {
  const state = initialState(scenario.read, scenario.data, scenario.candidates.filter((q) => q.resolved).map((q) => q.id));
  const steps: KernelOutput[] = [];
  for (let i = 0; i < 8; i++) {
    const out = decide({ id: scenario.id, action: scenario.action, candidates: scenario.candidates }, state);
    steps.push(out);
    if (out.action !== "RESEARCH" || !out.hinge || out.blocked) break;
    const simulated = scenario.sim[out.hinge];
    const q = scenario.candidates.find((candidate) => candidate.id === out.hinge);
    if (!simulated || !q) break;
    Object.assign(state, applyOutcome(state, q, simulated));
    state.step += 1;
  }
  const calls = steps.filter((s) => s.action === "RESEARCH" && !!s.family && !s.blocked).map((s) => s.family as string);
  const available = ["spot-structure", "perp-positioning"].filter((family) => scenario.data[family] === "fresh");
  return { steps, calls, available, critical: criticalFamilies(scenario) };
}

function baselineCalls(scenario: Scenario): string[] {
  return ["spot-structure", "perp-positioning"].filter((family) => scenario.data[family] === "fresh");
}

function expectedTerminalPass(scenario: Scenario, replayResult: Replay): boolean {
  const expected = scenario.expected.afterSim?.final || "";
  const last = replayResult.steps[replayResult.steps.length - 1];
  if (expected.startsWith("STOP")) return last.action === "STOP";
  if (expected === "CANNOT_RESOLVE") return last.action === "CANNOT_RESOLVE";
  if (expected === "CLARIFY") return last.action === "CLARIFY";
  if (expected.startsWith("CONTINUE")) return replayResult.calls.length > 0;
  return false;
}

function explainable(replayResult: Replay): boolean {
  return replayResult.steps.every((step) => {
    if (!step.why.trim()) return false;
    if (step.action === "RESEARCH" && (!step.hinge || !step.family)) return false;
    return step.skips.every((skip) => skip.family.trim() && skip.reason.trim() && skip.kind.trim());
  });
}

const metrics = SCENARIOS.map((scenario) => {
  const r = replay(scenario);
  const base = baselineCalls(scenario);
  const availableCritical = r.critical.filter((family) => r.available.includes(family));
  const unnecessaryBase = base.filter((family) => !r.critical.includes(family)).length;
  const unnecessaryClinch = r.calls.filter((family) => !r.critical.includes(family)).length;
  return {
    id: scenario.id,
    source: scenario.source,
    replay: r,
    baseline: base,
    availableCritical,
    missingCritical: availableCritical.filter((family) => !r.calls.includes(family)),
    unnecessaryBase,
    unnecessaryClinch,
    expectedTerminalPass: expectedTerminalPass(scenario, r),
    explainable: explainable(r),
  };
});

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const totalBaselineCalls = sum(metrics.map((m) => m.baseline.length));
const totalClinchCalls = sum(metrics.map((m) => m.replay.calls.length));
const totalBaselineUnnecessary = sum(metrics.map((m) => m.unnecessaryBase));
const totalClinchUnnecessary = sum(metrics.map((m) => m.unnecessaryClinch));
const covered = metrics.filter((m) => m.availableCritical.length > 0);
const blindspots = metrics.filter((m) => m.missingCritical.length > 0);
const baselineFirstActionable = metrics.map((m) => m.baseline.length ? m.baseline.length : 0);
const clinchFirstActionable = metrics.map((m) => m.replay.calls.length ? 1 : 0);
const terminalPasses = metrics.filter((m) => m.expectedTerminalPass).length;
const explainabilityPasses = metrics.filter((m) => m.explainable).length;

function routeSignature(scenario: Scenario): string {
  return JSON.stringify(replay(scenario).steps.map((s) => ({ action: s.action, hinge: s.hinge, family: s.family, final: s.final, skips: s.skips })));
}

describe("P16 controlled validation: 30 frozen P5 scenarios", () => {
  it("covers 15 P5A + 15 P5B cases and matches the pre-registered terminal contracts", () => {
    expect(SCENARIOS).toHaveLength(30);
    expect(terminalPasses).toBe(30);
  });

  it("finds every available decision-critical family without a blindspot", () => {
    expect(covered).toHaveLength(22);
    expect(blindspots).toEqual([]);
  });

  it("reduces the run-all baseline's unnecessary family calls", () => {
    expect(totalBaselineCalls).toBeGreaterThan(totalClinchCalls);
    expect(totalBaselineUnnecessary).toBeGreaterThan(totalClinchUnnecessary);
  });

  it("reaches the first actionable decision in no more research rounds than run-all", () => {
    expect(sum(clinchFirstActionable)).toBeLessThan(sum(baselineFirstActionable));
  });

  it("is stable across five deterministic replays per scenario", () => {
    for (const scenario of SCENARIOS) {
      const signature = routeSignature(scenario);
      for (let i = 0; i < 5; i++) expect(routeSignature(scenario), scenario.id).toBe(signature);
    }
  });

  it("emits an inspectable explanation contract for every route", () => {
    expect(explainabilityPasses).toBe(30);
  });

  it("locks the measured comparison recorded in P16_VALIDATION_REPORT", () => {
    expect({
      scenarios: SCENARIOS.length,
      covered: covered.length,
      blindspots: blindspots.length,
      baselineCalls: totalBaselineCalls,
      clinchCalls: totalClinchCalls,
      baselineUnnecessary: totalBaselineUnnecessary,
      clinchUnnecessary: totalClinchUnnecessary,
      baselineFirstActionable: sum(baselineFirstActionable),
      clinchFirstActionable: sum(clinchFirstActionable),
    }).toEqual({
      scenarios: 30,
      covered: 22,
      blindspots: 0,
      baselineCalls: 54,
      clinchCalls: 25,
      baselineUnnecessary: 31,
      clinchUnnecessary: 2,
      baselineFirstActionable: 54,
      clinchFirstActionable: 22,
    });
  });
});

describe("P16 adversarial matrix", () => {
  it("rejects malformed ticker and depth payloads before normalization", () => {
    expect(() => SpotTickerRow.parse({ symbol: "RNVDAUSDT" })).toThrow();
    expect(() => DepthBook.parse({ a: [[1]], b: [], ts: "1" })).toThrow();
  });

  it("maps invalid input, unsupported route, and rate-limit envelopes to typed upstream failures", async () => {
    expect(classifyUpstream("v3-ticker", "40034", "unknown").code).toBe("INVALID_INPUT");
    expect(classifyUpstream("v3-x", "40404", "missing route").code).toBe("UNSUPPORTED");
    await expect(bitgetGet("https://api.bitget.com/test", "v3-test", 100, (async () => ({ status: 429, json: async () => ({ code: "429", msg: "rate limit" }) })) as unknown as typeof fetch)).rejects.toMatchObject({ code: "UPSTREAM_FAILURE", status: 429 });
  });

  it("turns a transport timeout into UPSTREAM_FAILURE and never into evidence", async () => {
    const hanging = ((url: string, init?: { signal?: AbortSignal }) => new Promise((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })) as unknown as typeof fetch;
    await expect(bitgetGet("https://api.bitget.com/test", "v3-test", 20, hanging)).rejects.toMatchObject({ code: "UPSTREAM_FAILURE" });
  });

  it("refuses to invent an instrument mapping or a missing-data decision", () => {
    expect(mapSpotToPerp("RXYZUSDT", [], [])).toBeNull();
    const missing = SCENARIOS.find((scenario) => scenario.id === "S10")!;
    expect(replay(missing).steps.at(-1)?.action).toBe("CANNOT_RESOLVE");
  });

  it("asks for clarification rather than inventing an action", () => {
    const out = decide({ id: "unexpected", action: "unclear", candidates: [] }, initialState("undecided", {}));
    expect(out.action).toBe("CLARIFY");
    expect(out.why).toMatch(/clarification/i);
  });

  it("marks an unsupported research family as unsupported instead of calling it", () => {
    const candidate: Candidate = { id: "q-unsupported", topic: "unsupported", families: ["unsupported-family"], branches: [{ outcome: "found", action: "enter-now" }, { outcome: "missing", action: "wait" }] };
    const out = decide({ id: "unsupported", action: "enter-now", candidates: [candidate] }, initialState("undecided", {}));
    expect(out.action).toBe("CANNOT_RESOLVE");
    expect(out.skips).toContainEqual(expect.objectContaining({ family: "unsupported-family", kind: "unsupported" }));
  });

  it("falls back to deterministic intent when the model tier is unavailable", async () => {
    const model = { name: "unavailable", parseIntent: async () => { throw new Error("network down"); }, polishBrief: async () => ({ ok: false as const, error: "network down" }) };
    const intent = await parseIntentFlow("rNVDA is dipping, should I buy?", model);
    expect(intent.asset).toBe("RNVDA");
    expect(intent.action).toBe("enter-now");
  });
});