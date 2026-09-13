# CLINCH P18/P19 Production Verification

Date: 2026-09-13
Status: INTEGRATION PROVEN
Public URL: https://clinch-nine.vercel.app

No secret values are recorded in this report.

## Neon proof

- The real local `DATABASE_URL` was loaded without displaying its value.
- `npm run db:push` completed successfully against the configured Neon database.
- The direct Postgres adapter reported `kind: postgres`; SQLite was not used for this gate.
- A cleanup-safe Neon contract run passed all checks:
  - session create
  - research-step persistence
  - GET through a separate Postgres adapter instance
  - idempotency lookup
  - compare-and-set success and stale-version rejection
  - two recent sessions readable after independent access
  - owner-verifier isolation
  - delete with step cleanup
  - expiry/retention deletion with step cleanup
- All probe rows were removed after verification.

## Qwen gateway proof

- Sponsored gateway: `https://hackathon.bitgetops.com/v1`
- Model: `qwen3.8-max`
- Both candidate routes were probed; Chat Completions was selected because it returned the complete CLINCH `IntentContract` under strict structured output. Responses returned a reduced incompatible shape.
- Direct protocol probes returned HTTP 200 for the accepted route and a clean HTTP 404 for the provider-failure route.
- The production adapter is server-only, uses `BITGET_QWEN_API_KEY`, pins the sponsored base URL/model, enables structured outputs, and has no alternate provider fallback.
- Adapter integration against the real gateway passed:
  - clear dilemma: valid contract, `wait`, no clarification
  - ambiguous dilemma: valid contract, `unclear`, clarification required
  - unusual dilemma: valid contract, `wait`, no clarification
  - missing credential: failed closed with no fallback
- Measured adapter latencies were approximately 11–52 seconds; the application timeout was raised to 60 seconds to cover the observed gateway behavior.

## Vercel proof

- Authenticated Vercel CLI account: `techkeyy`.
- Project: `techkeyys-projects/clinch`.
- Production environment entries were added through Vercel encrypted environment storage for the five required names: `BITGET_QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL`, `SESSION_PEPPER`, and `DATABASE_URL`.
- `.vercel` is ignored and `.env.local` is untracked.
- The current application was deployed over HTTPS.
- Deployment alias: https://clinch-nine.vercel.app

## Production P18 verification

Fresh public desktop browser verification passed against the HTTPS alias:

- HTTPS and HSTS passed.
- `X-Content-Type-Options: nosniff` passed.
- `X-Frame-Options: DENY` passed.
- `Referrer-Policy: strict-origin-when-cross-origin` passed.
- `Permissions-Policy` passed.
- CSP with `frame-ancestors 'none'` passed.
- No `x-powered-by` header was present.
- First stream event contained a session ID and state.
- Observed stream order: `session → intent → baseline → hinge → research → finding → stop → brief → done`.
- Final persisted session had four persisted steps and a nonzero state version.
- Same-owner idempotency replay returned the original session without creating a second run.
- Refresh restored the Neon-backed completed brief.
- Recent history reopened the completed session.
- Owner cookie was Secure, HttpOnly, Path `/`, and SameSite `Lax`.
- Owner cookie was absent from `document.cookie`; client storage contained no owner secret.
- A stranger context with only the session ID received HTTP 401 for GET and delete.
- Owner delete succeeded and the session was no longer readable afterward.
- Stream and browser request inspection found no secret names in client-visible HTML, URLs, request bodies, stream data, or normal console messages.
- The production persisted evidence contained Bitget provenance and no hardcoded IP URL.
- Production runtime source and built client artifacts contained no DNS-pin, TLS-bypass, or hardcoded Bitget-IP reference.
- The production Vercel environment contained no `CLINCH_DEV_SQLITE` entry; the local SQLite escape hatch is guarded from Vercel by the production boundary.

## Production P19 clean-user E2E

- Fresh desktop context: passed.
- No signup, wallet, exchange account, or user API key: passed.
- Supported RNVDA dilemma: passed.
- Real Qwen intent: passed through the production adapter path.
- Real Bitget baseline and targeted research: passed.
- Decision Hinge: passed.
- Adaptive research state: passed.
- Truthful live research/skip behavior: passed; no skip was forced by the test.
- Deliberate STOP: passed.
- Final brief: passed.
- Refresh and Neon-backed restoration: passed.
- Recent history: passed.
- Second-browser isolation: passed.
- Fresh mobile context: passed with zero horizontal overflow and a 48px CTA.

## Remaining issues

- The local Windows shell still cannot be used as production evidence for direct Bitget DNS; one local direct probe failed at the workstation network layer. The public Vercel run succeeded through the normal `api.bitget.com` hostname, which is the production path and the required deployment evidence.
- No Git remote is configured. Vercel deployment was completed without a Git remote as authorized.
- P20 owner manual UAT remains intentionally unperformed.
