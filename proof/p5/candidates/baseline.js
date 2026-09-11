// P5 proof-only RUN-ALL baseline. Fixed order [spot-structure, perp-positioning],
// researches every family with fresh data, never skips, stops after both.
const fs = require("fs");
const path = require("path");
const ORDER = ["spot-structure", "perp-positioning"];
if (require.main === module) {
  const [scenPath, outDir] = process.argv.slice(2);
  const scenarios = JSON.parse(fs.readFileSync(scenPath, "utf8")).scenarios;
  fs.mkdirSync(outDir, { recursive: true });
  for (const s of scenarios) {
    const calls = [];
    for (const f of ORDER) {
      const ok = (s.data || {})[f] === "fresh";
      calls.push({ family: f, action: ok ? "RESEARCH" : "SKIP-unavailable", why: ok ? "baseline calls everything" : "no data, skipped as unavailable" });
    }
    fs.writeFileSync(path.join(outDir, `${s.id}.json`), JSON.stringify([{
      scenario: s.id, step: 1, read: s.read, hinge: "N/A-baseline-calls-all",
      why: "baseline: no hinge reasoning", family: null, action: "RESEARCH",
      final: "STOP-after-all", calls,
      trace: { note: "deliberately hinge-free" } }], null, 1));
  }
  console.log(`baseline ran ${scenarios.length} -> ${outDir}`);
}
