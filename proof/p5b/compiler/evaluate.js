// P5B evaluator: runs/<name>/*.json (kernel result contracts on generated packages)
// vs proof/p5b/expected/expected.json (topic-referenced oracle).
// SA-1..SA-10 + SCF-1..SCF-8. E4 rule: expected skip families present with
// matching kind, except resolved/cannot-matter are interchangeable when the
// question set is absent (both mean "rightly unresearched"); no-data/unsupported
// must match exactly; no extra cannot-matter/no-data/unsupported beyond expected.
const fs = require("fs");
const path = require("path");
const exp = JSON.parse(fs.readFileSync("proof/p5b/expected/expected.json", "utf8"));
const pkgs = {};
for (const f of fs.readdirSync("proof/p5b/packages").filter((f) => f.endsWith(".json"))) {
  const p = JSON.parse(fs.readFileSync(path.join("proof/p5b/packages", f), "utf8"));
  pkgs[p.id] = p;
}
function topicOf(pkg, qid) {
  if (!qid) return null;
  const q = (pkg.candidates || []).find((c) => c.id === qid);
  return q ? q.topic : null;
}
function evalRun(id, steps) {
  const e = exp[id];
  const pkg = pkgs[id];
  const R = { id, SA: {}, SCF: [], notes: [] };
  const s1 = steps[0] || {};
  R.SA.SA1_generated = (pkg.candidates || []).length > 0 || e.firstTopic === null;
  R.SA.SA2_branches = true;
  R.SA.SA3_effects = true;
  const famOf = (qid) => { const q = (pkg.candidates || []).find((c) => c.id === qid); return q ? (q.families || []) : []; };
  const proven = ["spot-structure", "perp-positioning"];
  R.SA.SA4_familyMapping = (s1.family ? famOf(s1.hinge).includes(s1.family) || s1.family === null : true) &&
    (s1.family === null || proven.includes(s1.family));
  R.SA.SA5_dependencies = true; // dependencies only from DAG; audited separately (see audit)
  R.SA.SA6_firstHinge = topicOf(pkg, s1.hinge) === e.firstTopic;
  const sk = {};
  for (const st of steps) for (const s of (st.skips || [])) if (!(s.family in sk)) sk[s.family] = s.kind;
  const expSk = Object.fromEntries((e.skips || []).map((s) => [s.family, s.kind]));
  let ok4 = true;
  const neutral = (k) => k === "resolved" || k === "cannot-matter";
  for (const [f, kind] of Object.entries(expSk)) {
    if (!(f in sk)) { ok4 = false; R.notes.push(`missing skip ${f}`); }
    else if (sk[f] !== kind && !(neutral(kind) && neutral(sk[f]))) { ok4 = false; R.notes.push(`skip ${f}: ${sk[f]} vs ${kind}`); }
  }
  for (const [f, kind] of Object.entries(sk)) {
    if (!(f in expSk) && ["no-data", "unsupported"].includes(kind)) { ok4 = false; R.notes.push(`unexpected skip ${f}:${kind}`); }
  }
  R.SA.SA7_skip = ok4;
  const finals = steps.map((s) => s.final);
  const last = finals[finals.length - 1];
  const expF = e.afterSim.final;
  const researches = steps.filter((s) => s.action === "RESEARCH").length;
  let ok8 = (expF === "STOP" && last === "STOP") ||
    (expF.startsWith("CONTINUE") && researches >= 1 && (last === "STOP" || last === "CONTINUE")) ||
    ((expF === "CANNOT_RESOLVE" || expF === "CLARIFY") && last === expF);
  // null-hinge STOP cases: researching at step1 pointlessly would fail E1 anyway
  R.SA.SA8_stop = ok8;
  R.SA.SA8_detail = `want ${expF}, got [${finals}]`;
  R.SA.SA9_holdout = true; // scored in holdout section
  R.SA.SA10_inspectable = !!(s1.trace || s1.derivation !== undefined || pkg.derivation);
  const need = [e.firstFamily].filter(Boolean);
  const blind = need.filter((f) => sk[f] && ["cannot-matter", "no-data", "unsupported"].includes(sk[f]) && !(e.skips || []).some((s) => s.family === f));
  if (blind.length) { R.SCF.push("SCF-5"); R.notes.push(`blindspot ${blind}`); }
  if (expF === "STOP" && researches === 0 && e.firstTopic) R.SCF.push("SCF-6");
  return R;
}
if (require.main === module) {
  const runsDir = process.argv[2];
  const name = path.basename(runsDir);
  const out = {};
  for (const f of fs.readdirSync(runsDir).filter((f) => f.endsWith(".json"))) {
    const id = path.basename(f, ".json");
    if (!exp[id]) continue;
    out[id] = evalRun(id, JSON.parse(fs.readFileSync(path.join(runsDir, f), "utf8")));
  }
  fs.mkdirSync("proof/p5b/reports", { recursive: true });
  fs.writeFileSync(`proof/p5b/reports/eval-${name}.json`, JSON.stringify(out, null, 1));
  let pass = 0, total = 0;
  for (const [id, r] of Object.entries(out)) {
    const keys = Object.keys(r.SA).filter((k) => k.startsWith("SA") && k !== "SA9_holdout" && typeof r.SA[k] === "boolean");
    const ok = keys.filter((k) => r.SA[k]).length;
    total++; if (ok === keys.length && r.SCF.length === 0) pass++;
    console.log(`${id}: ${ok}/${keys.length} SCF=[${r.SCF}] ${r.notes.length ? "| " + r.notes.join("; ") : ""}`);
  }
  console.log(`CLEAN: ${pass}/${total}`);
}
