// P5 proof-only candidate B: structured decision-value kernel. Zero dependencies.
// Reads proof/p5/scenarios/scenarios.json ONLY (never expected/). Method:
// rank unresolved questions by (prunes-others desc, distinct-action breadth desc,
// relevance-to-current-read, id asc); skip families with no unresolved flippable
// answerable-or-attemptable question; STOP iff grounded read stands with nothing
// flippable left; CANNOT_RESOLVE iff undecided with nothing ever established and
// nothing answerable; CLARIFY iff no contemplated action. Node 24 stdlib only.
const fs = require("fs");
const path = require("path");

const KNOWN_FAMILIES = ["spot-structure", "perp-positioning"];

function effectsOf(q) {
  return [...new Set((q.branches || []).map((b) => b.action))];
}
// Flippable = can move the read: divergent branches, or a single decisive
// outcome different from the current read (confirmation that upgrades undecided).
function flippable(q, read) {
  const e = effectsOf(q);
  if (e.length > 1) return true;
  if (e.length === 1 && e[0] !== read && e[0] !== "undecided") return true;
  return false;
}
function answerable(q, data) {
  const fams = q.families || [];
  if (fams.length === 0) return { ok: false, why: "no-capable-family" };
  const fresh = fams.filter((f) => data[f] === "fresh");
  if (fresh.length > 0) return { ok: true, families: fresh };
  return { ok: false, why: "no-data", families: fams };
}

function decide(scenario, state) {
  const data = state.data;
  if (scenario.action === "unclear") {
    return base(scenario, state, null, "CLARIFY", null,
      "no contemplated action stated; one clarification required, intent never invented", []);
  }
  const open = (scenario.candidates || []).filter((q) => !state.resolved.includes(q.id) && !(state.mooted || {})[q.id]);
  const scored = open.map((q) => {
    const effects = effectsOf(q);
    const ans = answerable(q, data);
    const attemptable = ans.ok || ((q.families || []).length > 0);
    return { q, effects, flip: flippable(q, state.read), ans, attemptable,
      prunes: (q.prunes || []).length,
      relevant: effects.some((a) => a !== state.read) };
  });
  const live = scored.filter((s) => s.flip && s.ans.ok);
  if (live.length > 0) {
    live.sort((a, b) => (b.prunes - a.prunes) ||
      (b.effects.length - a.effects.length) ||
      ((b.relevant ? 1 : 0) - (a.relevant ? 1 : 0)) ||
      (a.q.id < b.q.id ? -1 : 1));
    const top = live[0];
    const fam = top.ans.families.includes("spot-structure") ? "spot-structure" : top.ans.families[0];
    const skips = skipSet(scenario, state, top.q.id);
    return base(scenario, state, top.q, "RESEARCH", fam,
      `unresolved flippable hinge (outcomes: ${top.effects.join(" vs ")}) answerable by ${fam}`, skips, top);
  }
  const established = state.resolved.length > 0 || state.read !== "undecided";
  const attempted = scored.filter((s) => s.flip && s.attemptable && !s.ans.ok);
  if (!established && !live.length && scored.some((s) => s.flip)) {
    const missing = attempted.length > 0 ? attempted : scored.filter((s) => s.flippable);
    const need = [...new Set(missing.flatMap((s) => (s.q.families || []).length ? s.q.families : ["NO-CAPABLE-FAMILY"]))];
    return base(scenario, state, null, "CANNOT_RESOLVE", null,
      `nothing ever established and no flippable hinge answerable; missing: ${need.join(", ")}`,
      skipSet(scenario, state, null), null);
  }
  if (attempted.length > 0 && established) {
    const t = attempted[0];
    const fam = (t.q.families || [])[0];
    const skips = skipSet(scenario, state, null);
    const out = base(scenario, state, t.q, "RESEARCH", fam,
      `attempt blocked: ${fam} data missing; retry-or-wait, never evidence`, skips, t);
    out.blocked = { family: fam, handling: "retry-or-wait, not evidence" };
    out.final = "CONTINUE";
    return out;
  }
  const residue = open.filter((s) => !s.flip).map((s) => s.q.id);
  return base(scenario, state, null, "STOP", null,
    `no unresolved flippable hinge remains; residue: ${residue.join(", ") || "none"}`,
    skipSet(scenario, state, null), null);
}

function skipSet(scenario, state, selectedId) {
  const data = state.data;
  const fams = new Set();
  (scenario.candidates || []).forEach((q) => (q.families || []).forEach((f) => fams.add(f)));
  Object.keys(data).forEach((f) => { if (f !== "fills") fams.add(f); });
  if (data.fills === "missing") fams.add("fills");
  const out = [];
  for (const f of [...fams].sort()) {
    if (!KNOWN_FAMILIES.includes(f)) {
      const used = (scenario.candidates || []).some((q) => (q.families || []).includes(f) && !state.resolved.includes(q.id) && !(state.mooted || {})[q.id]);
      if (used) { out.push({ family: f, kind: "unsupported", reason: `${f} cannot answer this asset; refused, never faked` }); continue; }
      if (f === "fills" && data.fills === "missing") { out.push({ family: f, kind: "no-data", reason: "fills feed known-stale; absent flow is not evidence" }); continue; }
      continue;
    }
    const qs = (scenario.candidates || []).filter((q) => (q.families || []).includes(f) && !state.resolved.includes(q.id) && !(state.mooted || {})[q.id]);
    if (qs.length === 0) {
      const wasMooted = (scenario.candidates || []).some((q) => (q.families || []).includes(f) && (state.mooted || {})[q.id]);
      const wasPre = (scenario.candidates || []).some((q) => (q.families || []).includes(f) && q.resolved);
      out.push({ family: f, kind: "resolved",
        reason: wasMooted ? `${f} mooted by an earlier finding` : (wasPre ? `${f} questions already settled in a prior step` : `no open question needs ${f}`) });
      continue;
    }
    if (data[f] === "missing") { out.push({ family: f, kind: "no-data", reason: `${f} data missing; reroute, never evidence` }); continue; }
    const flip = qs.filter((q) => flippable(q, state.read));
    if (flip.length === 0) { out.push({ family: f, kind: "cannot-matter", reason: `every plausible ${f} outcome leaves the read unchanged` }); continue; }
    const sel = qs.find((q) => q.id === selectedId);
    if (!sel) { out.push({ family: f, kind: "cannot-matter", reason: `${f} outcomes cannot beat the selected hinge now` }); continue; }
  }
  return out;
}

function base(scenario, state, q, action, family, reason, skips, top) {
  return { scenario: scenario.id, step: state.step, read: state.read,
    hinge: q ? q.id : null, hinge_q: q ? q.q : null, why: reason,
    family, action, final: action === "RESEARCH" ? "CONTINUE" : action,
    branches: q ? q.branches.map((b) => ({ outcome: b.outcome, effect: b.action })) : [],
    canChange: q ? flippable(q, state.read) : false,
    skips, trace: { candidates: (scenario.candidates || []).filter((c) => !state.resolved.includes(c.id)).map((c) => c.id),
      selected: q ? q.id : null, prunes: q ? (q.prunes || []) : [],
      dataSnapshot: state.data, resolvedSoFar: [...state.resolved] } };
}

function runScenario(scenario, sim) {
  const steps = [];
  const state = { step: 1, read: scenario.read,
    resolved: (scenario.candidates || []).filter((q) => q.resolved).map((q) => q.id),
    mooted: {}, data: { ...scenario.data } };
  let out = decide(scenario, state);
  out.narrative = scenario.narrative;
  steps.push(out);
  const simOut = sim && out.hinge && sim[out.hinge];
  if (out.action === "RESEARCH" && simOut && !out.blocked) {
    const q = scenario.candidates.find((c) => c.id === out.hinge);
    const br = q.branches.find((b) => b.outcome === simOut);
    state.resolved.push(q.id);
    for (const m of (br.moots || [])) state.mooted[m] = out.hinge;
    state.read = br.action === "undecided" ? state.read : br.action;
    state.known = [...(scenario.known || []), `FOUND: ${simOut}`];
    if (scenario.midflow) {
      state.known.push(`REVEALED: ${scenario.midflow.reveal}`);
      Object.assign(state.data, scenario.midflow.revealFresh || {});
    }
    state.step = 2;
    const out2 = decide(scenario, state);
    steps.push(out2);
    if (out2.action === "RESEARCH" && !out2.blocked) {
      const sim2 = sim && sim[out2.hinge];
      if (sim2) {
        const q2 = scenario.candidates.find((c) => c.id === out2.hinge);
        const br2 = q2.branches.find((b) => b.outcome === sim2);
        state.resolved.push(q2.id);
        for (const m of (br2.moots || [])) state.mooted[m] = out2.hinge;
        if (br2.action !== "undecided") state.read = br2.action;
        state.step = 3;
        steps.push(decide(scenario, state));
      }
    }
  }
  return steps;
}

if (require.main === module) {
  const [scenPath, outDir, simPath] = process.argv.slice(2);
  const scenarios = JSON.parse(fs.readFileSync(scenPath, "utf8")).scenarios;
  const sims = simPath ? JSON.parse(fs.readFileSync(simPath, "utf8")) : {};
  fs.mkdirSync(outDir, { recursive: true });
  for (const s of scenarios) {
    const steps = runScenario(s, sims[s.id] || {});
    fs.writeFileSync(path.join(outDir, `${s.id}.json`), JSON.stringify(steps, null, 1));
  }
  console.log(`ran ${scenarios.length} scenarios -> ${outDir}`);
}
module.exports = { decide, runScenario };
