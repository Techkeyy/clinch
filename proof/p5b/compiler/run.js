// P5B proof-only runner: imports the FROZEN P5A kernel read-only and runs it over
// compiler-generated packages. The kernel file itself is never modified here.
const fs = require("fs");
const path = require("path");
const kernel = require("../../p5/candidates/structured.js");
const [pkgDir, outDir, simPath] = process.argv.slice(2);
const sims = simPath ? JSON.parse(fs.readFileSync(simPath, "utf8")) : {};
fs.mkdirSync(outDir, { recursive: true });
let n = 0;
for (const f of fs.readdirSync(pkgDir).filter((f) => f.endsWith(".json"))) {
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, f), "utf8"));
  const scen = { id: pkg.id, narrative: pkg.narrative, asset: pkg.asset, action: pkg.action,
    read: pkg.read, candidates: pkg.candidates, data: pkg.data, known: pkg.known || [] };
  const steps = kernel.runScenario(scen, sims[pkg.id] || {});
  fs.writeFileSync(path.join(outDir, `${pkg.id}.json`), JSON.stringify(steps, null, 1));
  n++;
}
console.log(`p5b ran ${n} packages -> ${outDir}`);
