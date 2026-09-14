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

Second-pass verification: typecheck, lint, Vitest (109 passed, 4 skipped), production build, no long-dash copy, and a fixture-backed mobile browser check all pass. The browser check confirmed no native dialog, the keep action preserves the brief, successful deletion returns to the initial empty workspace, the stop body has no duplicate lead-in, CTA height remains 50px, and mobile has no horizontal overflow. The change was deployed in Vercel production at commit `9b5d162`, and a fresh public mobile journey completed in 47.1 seconds with real research, no console errors, no native dialog, a correct stop body, inline confirmation, successful reset, and no overflow.

## Owner-authorized P20 UX restructure

Date: 2026-09-13

The Owner rejected the prior interface before UAT and explicitly authorized a close structural transfer from the live JustFair reference at `https://justfair-theta.vercel.app/#dashboard`. This supersedes the earlier single-workspace and no-dashboard direction. P20 is now treated as UX RESTRUCTURE, and after deployment the gate returns to OWNER UAT REQUIRED. P21 remains untouched.

Reference mapping:

- JustFair header and mode switch -> CLINCH wordmark, Dashboard/App controls, learn-more anchors, Recent research, and Open App action.
- JustFair split hero -> CLINCH decision-first hero with a compact Decision -> Hinge -> Targeted research -> Human decision proof panel.
- JustFair three-value section -> Find the Decision Hinge, Research only what matters, and Know when to stop.
- JustFair four-step workflow -> Describe the decision, Find the Hinge, Research selectively, and Stop with a brief.
- JustFair proof/API slot -> Live Evidence. Human Decision. CLINCH explains Bitget data, Qwen language understanding, deterministic control, and no trade execution without inventing an API.
- JustFair App workflow -> CLINCH App with stage tracker, natural-language decision input, optional verified quick starts, live result overview, evidence families, skip state, stop rationale, final brief, and expandable Research Evidence & Sources.

The restructure preserves the natural-language backend contract and does not advertise a closed market universe. Quick starts are the existing verified rNVDA, rTSLA, and rAAPL examples, while users can still describe any currently supported Reality instrument in their own words.

Screenshot evidence is stored under `proof/design-pass/`: `clinch-dashboard-desktop.png`, `clinch-dashboard-mobile.png`, `clinch-app-fresh-desktop.png`, `clinch-app-active-desktop.png`, `clinch-app-completed-desktop.png`, and `clinch-app-completed-mobile.png`, alongside the captured JustFair Dashboard and App reference states.

## Current production design-pass verification

Date: 2026-09-13

The restructure is deployed from commit `085ca7c` in Vercel production deployment `DWQ48oVPgoLrxh88vR1TaRLwXkVX` and is aliased at `https://clinch-nine.vercel.app`.

Fresh public browser smoke timings:

- Dashboard response and render: 1.06s
- App response and render: 1.20s
- Research request accepted: 1.27s
- Live result and context state: 17.57s
- Final brief: 47.59s
- Total journey: 47.69s

The live run used the current production path and reached a final brief through a truthful `NO-CAPABLE-FAMILY` STOP because the current market context did not establish a capable research family. No live SKIP was forced and no hinge or finding was invented. Refresh restored the decision and progress state. The smoke found no console errors, native dialogs, horizontal overflow, or long-dash UI copy. The owner cookie was observed with HttpOnly, Secure, SameSite=Lax, and Path=/ flags. Rendered-page and local-storage checks found no secret-name leakage.

The required owner boundary remains unchanged: P20 UX restructure is complete, P20 owner manual UAT is required and unperformed, and P21 has not started.

## Final typography-only pass

Date: 2026-09-14

The Owner accepted the current CLINCH layout, Dashboard/App structure, colors, interactions, backend, and component architecture. This pass changes typography only. No navigation destination, content architecture, research logic, provider, persistence, or market-data behavior changed.

Live JustFair computed-style audit:

- Public stylesheet loads Inter at weights 400, 500, 600, 700, and 800 through Google Fonts.
- JetBrains Mono is reserved for technical values and is not used for ordinary prose.
- Desktop hero: Inter 800, 48px, 1.15 line-height, -0.035em tracking, approximately 650px text width.
- Mobile hero: Inter 800, 32px, 1.15 line-height, -0.035em tracking.
- Section title: Inter 700, 30px, -0.025em tracking, with the reference's open 1.6 line rhythm.
- Card title: Inter 700, 18px, 1.35 line-height.
- Body: Inter 400, 17.5px desktop and 15px mobile, with comfortable 1.5 to 1.58 line-height.
- Navigation: Inter 500, 14px, normal tracking. Active navigation uses weight 600.
- Compact buttons: Inter 600, 13px.
- Eyebrows and labels: uppercase Inter 700, approximately 11px, restrained tracking around 0.06em.

CLINCH mapping:

- Dashboard and App display headings now use the Inter display face and reference scale.
- Section headings use the reference's Inter hierarchy instead of the prior Georgia display face.
- Body, metadata, navigation, labels, buttons, result values, final brief headings, and evidence details now share the same Inter type system.
- Inter is loaded through `next/font/google` with the public weights required by the interface and `display: swap`.
- Existing CLINCH colors, layout, component boundaries, URLs, interactions, and state hierarchy remain unchanged.

Typography-pass proof is stored under `proof/typography-pass/`:

- `clinch-dashboard-desktop.png`
- `clinch-dashboard-mobile.png`
- `clinch-app-desktop.png`
- `clinch-app-mobile.png`
- `clinch-app-completed-desktop.png`
- `clinch-app-completed-mobile.png`

Local verification passed: typecheck, lint, Vitest with 109 passed and 4 skipped, production build, design-skill UI audit with zero long-dash errors and zero small-text warnings, focused desktop browser smoke, focused mobile browser smoke, font-loaded checks, and no horizontal overflow at 1440px or 390px. The completed App fixture rendered the final brief and truthful STOP at both widths.

Deployment and public verification:

- Typography commit: `1b3249f`
- Vercel deployment: `dpl_GKxff1ENw41xVazNf28EeTSoRTwg`
- Production target: `READY`
- Production alias: `https://clinch-nine.vercel.app`
- Public desktop and mobile audits observed Inter weights 400, 500, 600, 700, and 800 loaded before inspection.
- Public desktop metrics matched the audit at 48px hero, 30px section title, 17.5px body, 14px navigation, and 13px buttons.
- Public mobile metrics matched the audit at 32px hero and 15px body.
- Public Dashboard and App navigation worked with `#dashboard` and `#app` hash synchronization.
- Public desktop and mobile renders had no horizontal overflow.

The final handoff remains P20 owner UAT REQUIRED. Do not continue to P21.

## Targeted P20 correction pass

Date: 2026-09-14

The Owner inspection correction pass preserves the accepted Dashboard plus App structure, typography, colors, research kernel, Qwen adapter, Neon persistence, streaming contract, session ownership, and normal Bitget REST path.

Stock universe and naming:

- The old three-chip list is replaced by a dynamic `/api/stocks` route backed by Bitget's official SPOT instruments endpoint and the existing CLINCH spot research capability. Online Reality symbols are the live universe; optional stock-perp mapping is derived only when the discovered RWA futures instrument exists.
- Search accepts company name, normal ticker, and Bitget rToken ticker. The deterministic extractor now recognizes common company names as well as ticker forms, while the server canonicalizes the resolved intent to the normal ticker and keeps raw exchange symbols in server state and validated research adapters.
- A single `StockIdentity` component renders the company name, normal ticker, secondary `Bitget rToken · rTICKER` explanation, local recognizable issuer mark, or a stable monogram fallback. It is used in stock search results, examples, selected decisions, parsed result state, live context, Hinge, findings, final brief, and Recent research.

Version conflict correction:

- Root cause: the start clarification transition performed a compare-and-set from version 0 to version 1, but the stream's clarify event did not carry the new version. The browser then submitted the answer with a stale expected version.
- Fix: clarification JSON and stream events return the authoritative post-CAS version; the client consumes version fields from every stream event and JSON response. Clarified intents are resolved and persisted before the same-session run claim.
- Research Again now clears the old session locator, resets the client CAS target, and creates a fresh idempotency key. Historical completed or reopened sessions remain readable in Recent research. Retry remains same-session for failed or stale interrupted work.

Verification completed locally:

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm test -- --run`: PASS, 114 tests passed and 4 expected skips.
- Production build: PASS, including `/api/stocks`.
- Design-skill UI audit: PASS, zero long-dash errors, zero small-text warnings, zero copy warnings.
- Desktop and mobile focused browser smoke: PASS with no horizontal overflow.
- Fixture-backed P20 browser regressions: PASS on desktop and mobile for searchable stock identity and completed-session Research Again isolation.

P14 status remains CUT / DEFERRED. The current official Bitget REST documentation describes user-created API keys with read-only or read/write permission configuration, plus separate trade, transfer, and withdrawal capabilities. It does not provide a clean delegated browser authorization flow for this product surface. CLINCH therefore keeps the original guest and public-data core, adds no credential form, adds no connection button, and requests no trading or withdrawal permission. A later P14 reopening would require an official permission-scoped delegated flow, server-side token handling, revocation, and a separate owner authorization decision. Reference: https://www.bitget.com/docs/classic/rest-api.

P20 remains OWNER UAT REQUIRED. P21 remains untouched.
