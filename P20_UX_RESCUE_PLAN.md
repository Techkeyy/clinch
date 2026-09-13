# CLINCH P20 UX Rescue Plan

## Audit finding

The production flow is technically complete but visually reads as a raw event stream. The first action is easy to miss, live context has no useful facts, the active Decision Hinge does not hold the page, progress is not a legible journey, and the final brief lacks a clear reading order. Recent history is functional but visually indistinct. Mobile inherits the same hierarchy problem.

## Product response

Keep one calm research workspace. Make the user journey visible in this order:

1. question and one primary action;
2. the user's decision and live market context;
3. the current Decision Hinge as the hero object;
4. named research progress and findings;
5. the current read, skip or stop rationale;
6. a readable final brief and the next safe action.

## Implementation boundary

- Keep the existing streaming protocol, session ownership, Neon persistence, Qwen adapter, Bitget adapters, and deterministic kernel unchanged.
- Refactor presentation only in `app/page.tsx`, `app/recent/page.tsx`, `components/research.tsx`, `app/globals.css`, and copy metadata where needed.
- Use semantic sections, explicit loading, empty, success, error, recovery, and clarification states.
- Preserve the no-wallet, no-account, research-only boundary and the existing accessible labels used by automated checks.
- Verify with the UI text audit, typecheck, lint, Vitest, production build, local browser checks, and a fresh public HTTPS smoke run.

## Visual direction

Paper surface, ink typography, serif judgment moments, restrained petrol action color, hairline separators, generous spacing, no dashboard chrome, no gradients, no decorative metrics, and no color-only status meaning. The mobile layout is a single readable column with thumb-reachable actions and no horizontal overflow.

## Verification

Date: 2026-09-13

- npm run typecheck: PASS.
- npm run lint: PASS.
- npm test: PASS, 11 files, 109 tests passed, 4 expected skips.
- npm run build: PASS locally and on Vercel.
- Fresh local DOM checks at 1280px and 390px: heading, decision label, primary action, recent link, 50px CTA, 136px input, no horizontal overflow, no visible long-dash copy.
- Fresh public HTTPS checks at desktop and mobile: same first-open contract, no horizontal overflow, no visible long-dash copy.
- Fresh public supported entry dilemma: one Decision Hinge rendered, one live finding rendered, explicit stop rendered, final brief saved, and the probe was deleted through the owner UI. Browser journey duration was 33.6 seconds.
- A separate fresh public supported dilemma reached a saved brief in about 18 seconds without error. The live kernel did not expose a Hinge for that market state, which was left truthful rather than forced.

The next gate is owner manual UAT. P21 and later phases remain untouched.

## Second design pass

Date: 2026-09-13

The follow-up audit found two state-truth issues in the completion flow. Delete used a browser-native confirmation and, after a successful response, cleared only the brief and session pointer while leaving the decision, market context, findings, skips, and stop state mounted. The stop panel also had a malformed prefix-removal expression, so a duplicated stop lead-in could remain in the body copy.

The completion flow now uses an inline accessible confirmation, preserves the brief when deletion fails, and resets the full workspace only after the delete endpoint confirms success. The stop copy removes its lead-in with an escaped period and whitespace expression. No backend, provider, persistence, or market-data code changed.

Second-pass verification: typecheck, lint, Vitest (109 passed, 4 skipped), production build, no long-dash copy, and a fixture-backed mobile browser check all pass. The browser check confirmed no native dialog, the keep action preserves the brief, successful deletion returns to the initial empty workspace, the stop body has no duplicate lead-in, CTA height remains 50px, and mobile has no horizontal overflow. Public deployment verification remains pending for this latest UI change.
