// P5B proof-only semantic compiler. Reads raw factual state + global-semantics.json,
// emits a P5A-schema semantic package. No scenario IDs, no oracle, no expected
// answers anywhere in this file or its inputs (audited mechanically). Node stdlib.
const fs = require("fs");
const path = require("path");

function getFact(state, dotted) {
  if (dotted === "_firedCount") return state.__firedCount;
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), state);
}
function testClause(state, c) {
  const v = getFact(state, c.fact);
  if (c.op === "in") return (c.value || []).includes(v);
  if (c.op === "not-in") return !(c.value || []).includes(v);
  if (c.op === "eq") return v === c.value;
  return false;
}
function templateFires(state, t, resolved) {
  if (resolved.includes(t.topic)) return { fire: false, why: `topic ${t.topic} already resolved` };
  let ok = true;
  const used = [];
  for (const c of (t.when.all || [])) {
    if (c.anyOf) {
      const sub = c.anyOf.some((s) => { const r = testClause(state, s); if (r) used.push(`${s.fact}=${getFact(state, s.fact)}`); return r; });
      if (!sub) ok = false;
    } else {
      const r = testClause(state, c);
      if (r) used.push(`${c.fact}=${JSON.stringify(getFact(state, c.fact))}`);
      else ok = false;
    }
  }
  return { fire: ok, facts: used };
}
function effectOf(outcome, action, read) {
  if (read === "stand-aside") return "stand-aside"; // R-ABSORB-TERMINAL: a broken thesis is not resurrected by any single positioning finding
  let e = action === "exit-now" ? outcome.exit : outcome.enter;
  if (e === "enter-now") return "enter-now"; // (stand-aside case handled above)
  return e;
}
function compile(raw, G) {
  const state = { ...raw, __firedCount: 0 };
  const resolved = raw.resolved || [];
  const questions = [];
  const derivation = [];
  for (const t of G.templates) {
    if (t.id === "T-UNRESOLVED") continue;
    const chk = templateFires(state, t, resolved);
    if (!chk.fire) continue;
    state.__firedCount++;
    const branches = t.outcomes.map((o) => ({
      outcome: `${o.label} [${o.key}]`,
      outcomeKey: o.key,
      action: effectOf(o, raw.action, raw.read),
      terminal: !!o.terminal,
    }));
    // id encodes the documented global tiebreak (direct spot evidence before
    // positioning overlay) so the frozen P5A kernel's id-asc order applies it.
    const rank = (G.topicPriority || []).indexOf(t.family);
    const qid = `q-${rank < 0 ? "z" : String.fromCharCode(97 + rank)}-${t.topic}`;
    questions.push({ id: qid, topic: t.topic, q: t.question,
      whyTemplate: t.why, families: t.family ? [t.family] : [],
      prunes: [], branches,
      derivation: { template: t.id, firedFacts: chk.facts, effectRule: "template-outcome-table+R-ABSORB-TERMINAL" } });
    derivation.push(`${t.id} fired on {${chk.facts.join("; ")}}`);
  }
  // dependency-derived prunes (global DAG only) + terminal moots
  const byTopic = {};
  questions.forEach((q) => { byTopic[q.topic] = q; });
  for (const q of questions) {
    const prunes = [];
    for (const [dependent, prereqs] of Object.entries(G.dependencies)) {
      if (prereqs.includes(q.topic) && byTopic[dependent]) prunes.push(byTopic[dependent].id);
    }
    q.prunes = prunes;
    if (prunes.length) derivation.push(`prune: ${q.id} -> ${prunes.join(",")} via dependencies DAG`);
    for (const b of q.branches) {
      b.moots = [];
      if (b.terminal) {
        for (const [dependent, prereqs] of Object.entries(G.dependencies)) {
          if (prereqs.includes(q.topic) && byTopic[dependent]) b.moots.push(byTopic[dependent].id);
        }
        if (b.moots.length) derivation.push(`moot: ${q.id}#${b.outcomeKey} -> ${b.moots.join(",")} (terminal outcome)`);
      }
      delete b.outcomeKey;
      delete b.terminal;
    }
  }
  // pass through prior-step settlements so the kernel marks those families settled
  for (const topic of resolved) {
    if (byTopic[topic]) continue;
    questions.push({ id: `q-${topic}-settled`, topic, q: `(settled earlier: ${topic})`,
      families: G.topicFamily[topic] ? [G.topicFamily[topic]] : [], resolved: true,
      resolution: "settled before this step", prunes: [],
      branches: [{ outcome: "settled (known)", action: raw.read === "undecided" ? "undecided" : raw.read }],
      derivation: { template: "PRIOR-SETTLEMENT", firedFacts: [`resolved[] contains ${topic}`], effectRule: "none" } });
    derivation.push(`prior settlement passed through: ${topic}`);
  }
  if (questions.length === 0 && raw.read === "undecided") {
    const t = G.templates.find((x) => x.id === "T-UNRESOLVED");
    const branches = t.outcomes.map((o) => ({ outcome: `${o.label}`, action: effectOf(o, raw.action, raw.read) }));
    questions.push({ id: "q-unknown-cause", topic: t.topic, q: t.question, whyTemplate: t.why,
      families: [], dataNeeded: t.dataNeeded, prunes: [], branches,
      derivation: { template: t.id, firedFacts: ["no-template-fired+read-undecided"], effectRule: "template-outcome-table" } });
    derivation.push("T-UNRESOLVED fired (nothing else matched, read undecided)");
  }
  return { id: raw.id, narrative: raw.narrative, asset: raw.asset, action: raw.action,
    read: raw.read, context: raw.context, known: raw.known || [],
    candidates: questions.map(({ derivation, whyTemplate, ...rest }) => ({
      ...rest, derivation })),
    data: raw.data, derivation };
}

if (require.main === module) {
  const [rawDir, globalPath, outDir] = process.argv.slice(2);
  const G = JSON.parse(fs.readFileSync(globalPath, "utf8"));
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(rawDir).filter((f) => f.endsWith(".json"))) {
    const raw = JSON.parse(fs.readFileSync(path.join(rawDir, f), "utf8"));
    const pkg = compile(raw, G);
    fs.writeFileSync(path.join(outDir, `${pkg.id}.json`), JSON.stringify(pkg, null, 1));
  }
  console.log(`compiled ${fs.readdirSync(outDir).length} packages -> ${outDir}`);
}
module.exports = { compile };
