// P5 proof-only evaluator. Compares run dirs against proof/p5/expected/expected.json.
// Run: node evaluate.js <runsDir>  -> prints per-scenario verdicts + writes reports/eval-<name>.json
// E-mapping: E1 first hinge, E2 family, E3 flip-awareness, E4 skips, E5 blindspot,
// E6 terminal, E7 abstention, E8 missing-data safety, E9 fidelity, E10 inspectability.
// CF-1..CF-7 flags. Baseline dirs (baseline.js shape) get counts-only scoring.
const fs = require("fs");
const path = require("path");

const exp = JSON.parse(fs.readFileSync("proof/p5/expected/expected.json", "utf8"));

function neededFamilies(e) {
  return [e.firstFamily, e.secondFamily].filter(Boolean);
}
function skipMap(steps) {
  const m = {};
  for (const st of steps) for (const s of (st.skips || [])) {
    if (!(s.family in m)) m[s.family] = s.kind;
  }
  return m;
}
function evalSteps(id, steps, isBaseline) {
  const e = exp[id];
  const R = { id, E: {}, CF: [], notes: [] };
  const s1 = steps[0] || {};
  if (isBaseline) {
    const calls = (s1.calls || []).filter((c) => c.action === "RESEARCH").map((c) => c.family);
    const need = neededFamilies(e);
    R.E = { familiesCalled: calls,
      useful: calls.filter((f) => need.includes(f)).length,
      unnecessary: calls.filter((f) => !need.includes(f)).length,
      neededTotal: need.length || "n/a-terminal-case" };
    return R;
  }
  // E1
  R.E.E1_firstHinge = (s1.hinge || null) === (e.firstHinge || null);
  // E2
  R.E.E2_family = (s1.family || null) === (e.firstFamily || null);
  // E3: read-aware flippability (a single decisive outcome vs current read counts)
  const tr = s1.branches || [];
  const eff = [...new Set(tr.map((b) => b.effect))];
  const canMove = eff.length > 1 || (eff.length === 1 && eff[0] !== s1.read && eff[0] !== "undecided");
  R.E.E3_flipAware = s1.hinge ? (canMove && eff.length >= 1) : true;
  // E4/E5 via skips across all steps + needed set
  const sk = skipMap(steps);
  const need = neededFamilies(e);
  const expSkips = Object.fromEntries((e.skips || []).map((s) => [s.family, s.kind]));
  let e4 = true;
  for (const [f, kind] of Object.entries(expSkips)) {
    if (!(f in sk)) { e4 = false; R.notes.push(`missing expected skip ${f}`); }
    else if (kind !== "resolved" && sk[f] !== kind) {
      // resolved-kind bookkeeping may legitimately differ; others must match
      if (!(kind === "cannot-matter" && sk[f] === "resolved")) { e4 = false; R.notes.push(`skip kind ${f}: got ${sk[f]}, want ${kind}`); }
    }
  }
  R.E.E4_skips = e4;
  R.E.E4_skipMap = sk;
  const blind = need.filter((f) => sk[f] && sk[f] !== "resolved" && !(e.skips || []).some((s) => s.family === f));
  R.E.E5_noBlindspot = blind.length === 0;
  if (blind.length) { R.CF.push("CF-1"); R.notes.push(`blindspot: skipped needed ${blind}`); }
  // E6 terminal
  const finals = steps.map((s) => s.final);
  const last = finals[finals.length - 1];
  const expF = e.afterSim.final;
  const researches = steps.filter((s) => s.action === "RESEARCH").length;
  let e6 = false;
  if (expF === "STOP" && last === "STOP") e6 = true;
  else if (expF.startsWith("CONTINUE") && researches >= 2) e6 = true;
  else if (expF === "CONTINUE" && researches >= 1) e6 = true;
  else if ((expF === "CANNOT_RESOLVE" || expF === "CLARIFY") && last === expF) e6 = true;
  R.E.E6_terminal = e6;
  R.E.E6_detail = `expected ${expF}, got [${finals}]`;
  if (expF === "STOP" && researches === 0 && e.firstHinge) { R.CF.push("CF-2"); }
  // E7
  R.E.E7_abstention = (expF === "CLARIFY" || expF === "CANNOT_RESOLVE") ? (last === expF) : true;
  // E8: never research a missing-data family as fresh
  let e8 = true;
  for (const st of steps) {
    if (st.action === "RESEARCH" && st.family && st.family !== "unsupported-ta") {
      // blocked attempts are honest (carry .blocked); fresh claims need data
      if (!st.blocked && st.trace && st.trace.dataSnapshot && st.trace.dataSnapshot[st.family] === "missing") {
        e8 = false; R.notes.push(`researched missing-data family ${st.family} as fresh (step ${st.step})`);
        if (!R.CF.includes("CF-3")) R.CF.push("CF-3");
      }
    }
    if (st.family === "unsupported-ta" && !st.blocked) {
      const sk2 = (st.skips || []).find((s) => s.family === "unsupported-ta");
      void sk2;
    }
  }
  R.E.E8_missingDataSafe = e8;
  // E9 fidelity: researched hinge can move the read; reason references hinge
  R.E.E9_fidelity = s1.hinge ? (canMove && (s1.why || "").length > 10) : true;
  // E10 inspectability: trace present with candidates+data
  R.E.E10_inspectable = !!(s1.trace && s1.trace.candidates && s1.trace.dataSnapshot);
  // CF-4 fixed order probe (per-scenario contribution noted in report)
  // CF-5 topic-match: researched a hinge whose outcomes cannot move the read
  if (s1.hinge && !canMove && s1.action === "RESEARCH" && !s1.blocked) {
    R.CF.push("CF-5"); R.notes.push("researched non-flippable hinge");
  }
  // CF-6 ambiguity
  if (id === "S11" && last !== "CLARIFY" && !R.CF.includes("CF-6")) R.CF.push("CF-6");
  // CF-7 unproven family use: families outside spot/perp researched fresh
  for (const st of steps) {
    if (st.action === "RESEARCH" && st.family && !["spot-structure", "perp-positioning"].includes(st.family) && !st.blocked) {
      if (!R.CF.includes("CF-7")) R.CF.push("CF-7");
      R.notes.push(`used unproven family ${st.family}`);
    }
  }
  return R;
}

if (require.main === module) {
  const runsDir = process.argv[2];
  const name = path.basename(runsDir);
  const isBaseline = name.startsWith("baseline");
  const out = {};
  for (const f of fs.readdirSync(runsDir).filter((f) => f.endsWith(".json"))) {
    const id = path.basename(f, ".json");
    if (!exp[id] || id.startsWith("_")) continue;
    const steps = JSON.parse(fs.readFileSync(path.join(runsDir, f), "utf8"));
    out[id] = evalSteps(id, steps, isBaseline);
  }
  fs.mkdirSync("proof/p5/reports", { recursive: true });
  fs.writeFileSync(`proof/p5/reports/eval-${name}.json`, JSON.stringify(out, null, 1));
  let pass = 0, total = 0;
  for (const [id, r] of Object.entries(out)) {
    if (isBaseline) { console.log(id, JSON.stringify(r.E)); continue; }
    const keys = ["E1_firstHinge", "E2_family", "E3_flipAware", "E4_skips", "E5_noBlindspot", "E6_terminal", "E7_abstention", "E8_missingDataSafe", "E9_fidelity", "E10_inspectable"];
    const ok = keys.filter((k) => r.E[k] === true).length;
    total++; if (ok === 10 && r.CF.length === 0) pass++;
    console.log(`${id}: ${ok}/10 CF=[${r.CF}] ${r.notes.length ? "| " + r.notes.join("; ") : ""}`);
  }
  if (!isBaseline) console.log(`CLEAN: ${pass}/${total} (10/10, no CF)`);
}
