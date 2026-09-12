import js from "@eslint/js";
import globals from "globals";

// Minimal flat config. eslint-config-next 16.3.5 bundles plugin versions that
// crash under eslint 10 (react version detection + SourceCode finalize), so the
// Next preset is intentionally not used. tsc --noEmit plus these core rules and
// the P17 audit provide the real gates. Revisit only with evidence.
export default [
  js.configs.recommended,
  // proof/ holds frozen P4/P5 evidence scripts: never edited, never shipped.
  { ignores: ["node_modules", ".next", "coverage", "data", "proof"] },
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_" }] } },
];
