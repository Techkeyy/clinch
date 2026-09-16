import { build } from "esbuild";

await build({
  entryPoints: ["scripts/watch-worker.ts"],
  bundle: true,
  packages: "bundle",
  platform: "node",
  target: "node24",
  format: "esm",
  minify: true,
  sourcemap: false,
  banner: { js: "/* eslint-disable */" },
  outfile: "deploy/watch-worker.mjs",
});
