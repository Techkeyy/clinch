# CLINCH P17 Product Audit

Date: 2026-09-13
Status: INTEGRATION PROVEN

## Scope and method

This audit followed `DIRECTOR_STANDARD.md`, the repository audit skill, and the current product boundary. The repository has no README or writeup file yet, so no README claims were treated as evidence. The audit inspected the product source, control files, persistence boundary, ownership routes, model configuration, visible copy, tracked-file hygiene, and the P15/P16 evidence.

The audit deliberately distinguishes code evidence from later deployment and owner-acceptance gates. A passing local build or test does not establish a public production deployment.

## Mechanical results

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npx vitest run` | PASS: 11 files, 109 passed, 4 skipped |
| `npm run build` | PASS: Next 16.3.5 production build, no parent-lockfile warning |
| P15 browser evidence | PASS: 39 Playwright tests, 1 expected mobile-only skip |
| P16 controlled/adversarial evidence | PASS: 30 frozen cases, 7 adversarial cases |
| Visible long-dash scan | PASS: no em dash or en dash in product-facing code |
| Tracked build artifacts | PASS: no `.next`, database, test-results, or dependency paths tracked |
| Secret scan | PASS: `.env` is ignored; tracked `.env.example` contains names only; no secret values committed |
| Scope scan | PASS after remediation: shipped research families are spot structure and stock-perp positioning only |

The root directory still contains local ignored build/test residue such as `.next`, `data`, logs, and `tsconfig.tsbuildinfo`. None is tracked or included in the release commits.

## Findings and remediation

### P17-01: unused out-of-scope semantic scaffolding

The live semantic path carried an unused `events`/`catalyst` field and a positioning explanation mentioning catalysts and events. That did not create a shipped external executor, but it conflicted with the locked product boundary and could make future routing ambiguous.

Remediation: removed the unused event fields from `MarketFacts` and `RawFacts`, removed the unused mapping, changed the positioning explanation to refer to the decision point, and changed the unresolved fallback to ask only about supported market evidence. Existing P5 fixtures remain historical proof inputs and are not product capabilities.

### P17-02: audit-visible harness residue

The new P16 harness used an intentional `console.log` to capture metrics and an `as any` JSON loader. Both were unnecessary in the committed test surface.

Remediation: replaced the logger with assertion-locked metric constants from `P16_VALIDATION_REPORT.md` and replaced the untyped loader with explicit fixture types. The harness still passes and now contains no debug logger or `as any` marker.

### P17-03: Next.js workspace-root warning

Next automatically discovered the unrelated parent `package-lock.json`, producing a warning during the production build. The project is not a workspace and should resolve from its own root.

Remediation: added `turbopack.root: process.cwd()` to `next.config.ts`. Next's current documentation states that `turbopack.root` sets the application root and that automatic root detection considers lockfiles. The next production build completed without the warning. The unrelated parent lockfile was not deleted or modified.

## Claim-versus-reality review

- The shipped research registry contains exactly `spot-structure` and `perp-positioning`; unsupported families are rejected or marked unsupported.
- Visible copy states that CLINCH is research-only, requires no wallet or exchange account, and never places trades. No order or wallet executor exists in the application routes.
- Bitget access is direct and read-only through the fixed `api.bitget.com` surface. No user Bitget credential is requested by the core flow.
- Qwen is optional. If the model provider is unavailable, deterministic intent extraction remains available; model polish is not treated as required evidence.
- Anonymous session ownership is cookie-bound through an HMAC verifier using `SESSION_PEPPER`; session reads, retries, and deletes verify ownership and same-origin requests.
- Production refuses the SQLite fallback when `DATABASE_URL` is missing, except for the explicit local test escape hatch. The P15 tests cover this boundary.
- P15 proves local recovery and the live Bitget browser path. P16 proves controlled decision-value behavior and adversarial handling. Neither proves public deployment, Neon connectivity, Qwen credentials, HTTPS, clean-user external access, or owner UAT.
- No README is present yet. README, submission, and deployment claims remain future-phase work, not silently implied by this audit.

## Residual limitations carried forward

1. P18 still requires owner-provisioned production infrastructure and a public host. No deployment was attempted because the current environment does not provide the required production configuration.
2. The P16 comprehension measure is a mechanical explanation contract, not human comprehension research. Owner UAT remains required.
3. Archived P4 capability captures mention broader external research tools. They are historical capability-proof records, not shipped CLINCH routes and not part of the current product claim.

## Audit conclusion

P17 is INTEGRATION PROVEN for the current local repository: the mechanical checks are green, product-facing claims match the shipped code, the two out-of-scope semantic references and harness hygiene issues are corrected, and the Next root warning is resolved. The project must not be called production-ready until P18 and later deployment, clean-user, UAT, documentation, and submission gates are completed.