// P12 gate: P5A scenarios + P5B raw states replayed through the PRODUCTION
// domain kernel/semantics. Reads frozen proof oracles (never modified here).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decide, applyOutcome, initialState, type Candidate, type KernelState } from "../domain/kernel";
import { compileSemantics, type RawFacts } from "../domain/semantics";

const load = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const P5A_SCEN = load("../proof/p5/scenarios/scenarios.json").scenarios;
const P5A_EXP = load("../proof/p5/expected/expected.json");
const P5A_SIM = load("../proof/p5/runs/sim.json");
const P5B_EXP = load("../proof/p5b/expected/expected.json");
const P5B_SIM = load("../proof/p5b/runs/sim.json");

interface StepOut { hinge: string | null; family: string | null; action: string; final: string; skips: { family: string; kind: string }[] }
interface Scen { id: string; action: string; read: string; candidates: Candidate[]; data: Record<string, string>; midflow?: { revealFresh?: Record<string, string> } }

function runScenario(scen: Scen, sim: Record<string, string>): StepOut[] {
  const steps: StepOut[] = [];
  const state: KernelState = initialState(scen.read, scen.data, scen.candidates.filter((q) => q.resolved).map((q) => q.id));
  const snap = (o: { hinge: string | null; family: string | null; action: string; final: string; skips: { family: string; kind: string }[] }) =>
    steps.push({ hinge: o.hinge, family: o.family, action: o.action, final: o.final, skips: o.skips.map((s) => ({ family: s.family, kind: s.kind })) });
  let out = decide({ id: scen.id, action: scen.action, candidates: scen.candidates }, state);
  snap(out);
  const simOut = out.hinge ? sim[out.hinge] : undefined;
  if (out.action === "RESEARCH" && simOut && !("blocked" in out && out.blocked)) {
    const q = scen.candidates.find((c) => c.id === out.hinge)!;
    const br = q.branches.find((b) => b.outcome === simOut)!;
    Object.assign(state, applyOutcome(state, q, simOut));
    if (scen.midflow?.revealFresh) Object.assign(state.data, scen.midflow.revealFresh);
    state.step = 2;
    out = decide({ id: scen.id, action: scen.action, candidates: scen.candidates }, state);
    snap(out);
    const sim2 = out.hinge ? sim[out.hinge] : undefined;
    if (out.action === "RESEARCH" && sim2 && !("blocked" in out && out.blocked)) {
      const q2 = scen.candidates.find((c) => c.id === out.hinge)!;
      const br2 = q2.branches.find((b) => b.outcome === sim2)!;
      void br2;
      Object.assign(state, applyOutcome(state, q2, sim2));
      state.step = 3;
      out = decide({ id: scen.id, action: scen.action, candidates: scen.candidates }, state);
      snap(out);
    }
  }
  return steps;
}

function checkOracle(id: string, steps: StepOut[], exp: { firstHinge: string | null; firstFamily: string | null; afterSim: { final: string }; skips: { family: string; kind: string }[] }) {
  const s1 = steps[0];
  expect(s1.hinge, `${id} first hinge`).toBe(exp.firstHinge);
  if (exp.firstFamily) expect(s1.family, `${id} family`).toBe(exp.firstFamily);
  const skips: Record<string, string> = {};
  for (const st of steps) for (const s of st.skips) if (!(s.family in skips)) skips[s.family] = s.kind;
  for (const s of exp.skips) {
    expect(skips[s.family], `${id} skip ${s.family}`).toBeDefined();
    if (s.kind === "no-data" || s.kind === "unsupported") expect(skips[s.family], `${id} skip kind`).toBe(s.kind);
  }
  const finals = steps.map((s) => s.final);
  const last = finals[finals.length - 1];
  const want = exp.afterSim.final;
  if (want === "STOP") expect(last, `${id} terminal`).toBe("STOP");
  else if (want.startsWith("CONTINUE")) expect(steps.filter((s) => s.action === "RESEARCH").length, `${id} researches`).toBeGreaterThanOrEqual(1);
  else expect(last, `${id} terminal`).toBe(want);
  // No blindspot: no skipped family the oracle needed, no CF-1 shape
  const needed = [exp.firstFamily, (exp as { secondFamily?: string }).secondFamily].filter(Boolean) as string[];
  for (const f of needed) {
    if (skips[f] && ["cannot-matter", "no-data", "unsupported"].includes(skips[f])) {
      const expectedSkip = exp.skips.some((s) => s.family === f);
      expect(expectedSkip, `${id} blindspot on ${f}`).toBe(true);
    }
  }
}

describe("P5A regression through production kernel (15 scenarios)", () => {
  for (const scen of P5A_SCEN) {
    it(`${scen.id} matches pre-registered oracle`, () => {
      const steps = runScenario(scen, P5A_SIM[scen.id] || {});
      checkOracle(scen.id, steps, P5A_EXP[scen.id]);
    });
  }
  it("is deterministic across full-suite replays", () => {
    const runAll = () => P5A_SCEN.map((s: Scen) => runScenario(s, P5A_SIM[s.id] || {}));
    expect(runAll()).toEqual(runAll());
  });
});

function rawToScenario(raw: RawFacts & { id: string; narrative?: string; known?: string[] }) {
  const pkg = compileSemantics(raw);
  return { id: raw.id, action: raw.action, read: raw.read, candidates: pkg.candidates, data: { ...raw.data } };
}

describe("P5B semantic acquisition through production compiler+kernel", () => {
  const ids = ["B01", "B02", "B03", "B04", "B05", "B06a", "B06b", "B07a", "B07b", "B08", "B09", "B10", "H-A", "H-B", "H-C"];
  for (const id of ids) {
    it(`${id} derives semantics and matches oracle`, () => {
      const raw = load(`../proof/p5b/raw/${id}.json`);
      const exp = P5B_EXP[id];
      const scen = rawToScenario(raw);
      const steps = runScenario(scen, P5B_SIM[id] || {});
      // map oracle topic to the compiler-generated question id
      const wantId = exp.firstTopic
        ? (scen.candidates.find((c) => c.topic === exp.firstTopic)?.id ?? null)
        : null;
      if (exp.firstTopic) expect(wantId, `${id} oracle topic realizable`).not.toBe(null);
      const topicOf = (hid: string | null) => (scen.candidates.find((c) => c.id === hid)?.topic) ?? null;
      const s1 = steps[0];
      expect(topicOf(s1.hinge), `${id} first topic`).toBe(exp.firstTopic);
      checkOracle(id, steps, { ...exp, firstHinge: wantId });
    });
  }
});
