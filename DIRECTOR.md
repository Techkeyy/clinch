# CLINCH — Director Handoff

Last updated: 2026-09-17
Current branch: master
Current HEAD: 1f6f91b
Production URL: https://clinch-nine.vercel.app

## 1. Product

### One-line thesis
CLINCH is an AI Trading Desk for tokenized U.S. stock decisions on Bitget: it finds the one piece of information worth investigating next, researches it with live Bitget data, and stops when more research will not change the decision.

### Primary user
A retail holder/considerer of tokenized U.S. stocks (Bitget rTokens) who wants a focused research read before acting.

### Core user journey
Describe decision → CLINCH finds the Decision Hinge → researches only the highest-value evidence family → brief with read + why + what-to-watch → human decides. Optional: save to account → monitor via Decision Watch.

### Decision model
Deterministic kernel compiles evidence into reads (`leaning-in` / `holding-off` / `standing-aside` / `cannot-resolve`); Qwen handles language understanding only and never decides support, reads, or execution. CLINCH never places trades.

### Research families
1. `spot-structure` (required V1 minimum: ticker + 1H candles + depth from Reality spot)
2. `perp-positioning` (optional: funding/OI/mark-index from RWA stock perp; never gates visibility)

## 2. Locked Product Invariants

- Human always makes the trading decision; CLINCH researches only.
- CLINCH never auto-executes trades.
- If CLINCH lists an asset as selectable, it must be researchable end to end (`VISIBLE = RESEARCHABLE`, `BROKEN = 0`).
- Qwen does not decide whether an asset is supported.
- Perp availability is optional if spot-structure can answer the Hinge.
- Research only what can matter; re-research only when something changes that can matter.
- Decision Watch notifications are state-change notifications, never "BUY NOW".
- Clerk user ID is the account ownership key, never email.
- No claim by session-ID possession alone; guest claim requires the owner cookie + verifier.
- No secrets in logs, responses, or handoff docs.

## 3. Current Production Architecture

### Web
- Next.js 16.3.5 (App Router, `proxy.ts` convention) + React 19
- Vercel project `clinch` (team_7fr122ZjxRhRgaZw22w9arwO)
- Production URL: https://clinch-nine.vercel.app

### Database
- Neon Postgres via Drizzle (`research_sessions`, `research_steps`, Decision Watch tables)
- Ownership: guest rows = HMAC owner verifier + `clinch_owner` cookie; account rows = immutable Clerk `userId` in `account_user_id`

### AI
- Qwen via gateway env (`QWEN_BASE_URL`, `QWEN_MODEL`, `BITGET_QWEN_API_KEY` — values in Vercel only)
- Language understanding only; deterministic research loop

### Bitget
- Reality spot research on `GET /api/v3/market/instruments?category=SPOT` (`isReality`, `status`) joined to `GET /api/v3/reality/market/stock-info` (symbol/code/company/sessions)
- Exact Reality symbols persisted verbatim (e.g. `RMETAUSDT`); never synthesized
- Minimum research proof per stock: live ticker + 1H candles

### Authentication
- Clerk, passwordless email OTP, modal sign-in
- `proxy.ts` = `clerkMiddleware` (`authorizedParties: [apex]`, `frontendApiProxy` enabled, strict CSP)
- `ClerkProvider` in root layout; server identity via `auth()` + proxy annotation headers

### Decision Watch
- Vercel (CRUD + Telegram webhook) → Neon (source of truth/leases/heartbeat) → Ubuntu VPS durable worker → generic notification dispatcher → Telegram adapter (WhatsApp possible later)

## 4. Current Production State

- Stock catalog: WORKING (1653 visible = 1653 researchable, broken 0)
- Research: WORKING (META end-to-end proven in production)
- Auth client-side: WORKING (email OTP sign-in verified by owner)
- Auth server-side: BLOCKED (proxy annotates `signed-out`; `auth()` null; all authed endpoints 401)
- Guest → account claim: BLOCKED (behind server auth; contract hardened, awaiting first successful verification)
- Recent Research: WORKING for guests; account history BLOCKED behind server auth
- Decision Watch: PAUSED (worker proven; creation/linking gated on server auth)
- VPS worker: WORKING (deployed, heartbeat/lease/reclaim/restart proven; DO NOT TOUCH)
- Telegram linking: PAUSED (bot + webhook configured, E2E intentionally paused)
- Telegram outbound notification: PAUSED
- Production deployment: WORKING

## 5. Completed and Proven Work

### Stock catalog integrity
- One canonical runtime catalog (`research/bitget/catalog.ts`: 60s fresh TTL, 300s bounded stale, last-known-good, coalesced refresh) over SPOT instruments joined to Reality stock-info; exact symbols; per-stock capabilities; centralized resolver with failure taxonomy (`UNKNOWN_ASSET` / `UNSUPPORTED_ASSET` / `ASSET_OFFLINE` / `ASSET_TEMPORARILY_UNAVAILABLE` / `PROVIDER_ENDPOINT_FAILURE` / `INTERNAL_RESOLVER_BUG`); deterministic verifier script (`npm run verify:stock-catalog`).
- Live proof 2026-09-16/17: 2241 SPOT instruments, 1653 online Reality, 1653-row stock-info join, zero duplicate tickers, production `/api/stocks` broken 0.
- META fix: `RMETAUSDT` (online Reality) + `METAUSDT` RWA perp; full production research completed (intent → live baseline → hinge → stopped brief, no `UNSUPPORTED_ASSET`); `rMETA` alias resolves identically.
- Fixed en route: strict stock-info `name` schema vs live `name: null` (brief 503); R-strip ticker collisions (`RDY`/`DY`, `RBA`/`BA`…); case-sensitive symbol joins.
- Commit: `92d3d5e`

### Stock identity marks
- Recognizable local package-backed company marks restored for featured stocks.
- Commit: `4ccf30c`

### Clerk UI/auth setup
- Email OTP client sign-in working in production (owner-verified).
- Proxy architecture (`proxy.ts`, authorized parties, frontend API proxy) + sign-in control hardening.
- Commits: `dea4af6`, `e1448c2`

### Guest → account claim hardening
- Atomic per-ID claim contract with stable codes (`CLAIMED`, `ALREADY_OWNED`, `CLAIM_SESSION_NOT_FOUND`, `CLAIM_ALREADY_OWNED_BY_OTHER_ACCOUNT`, `CLAIM_OWNER_COOKIE_MISSING`, `CLAIM_OWNER_VERIFICATION_FAILED`, `CLAIM_PROVIDER_FAILURE`, `CLAIM_AUTH_REQUIRED`), idempotent same-user re-claim, presence-only server diagnostics (`clinch-claim` log line), UI consumes server messages.
- 9 route-level regression tests (claim happy path, authenticated-start ownership, idempotency, cross-account rejection, missing cookie, bad verifier, signed-out, post-claim accessibility, recent gating).
- Authenticated start creates account-owned rows directly (verified in code + test).
- Commit: `d22d2bc`

### Decision Watch VPS
- Dedicated `clinch` service account, isolated Node 24.14.0, systemd `clinch-watch-worker.service`; heartbeat, due-watch processing, lease exclusivity/reclaim, restart recovery proven; no public listener.
- Commits: `3dc3b6c`, `74e74a7`

### Telegram foundation
- Bot exists; production webhook registered at `/api/telegram/webhook`; channel-neutral dispatcher built. E2E intentionally PAUSED until claim + watch creation work.

## 6. Current Blocking Issue

### Clerk server-side authentication

Observed (production logs + probes, no guessing):

- Browser-side Clerk sign-in succeeds; fresh OTP sessions created; `touch`/`tokens` 200.
- Owner claim clicks log `hasClerkSessionCookie = true`, `hasClerkUatCookie = true` — Clerk cookies reach the route.
- Middleware annotates `proxyAuthStatus = signed-out`; route `auth()` returns null with `clerkError = null` (clean read, no SDK throw).
- `POST /api/account/claim` → `401 CLAIM_AUTH_REQUIRED`; `/api/watches` and Telegram connect 401 in the same windows.
- Every claim attempt in 72h is 401; server auth never succeeded in production.

Already ruled out:

- Stale browser session (fresh sign-out/in + OTP retested, still fails).
- Missing Clerk browser cookies (both present per instrumentation).
- Guest claim algorithm as first failing guard (401 precedes all claim logic; contract + tests prove logic correct).
- Neon as first failing guard (guest reads/writes healthy).
- Guest verifier as first failing guard (session reads 200 via verifier).
- Deployment-timing race (fresh redeploy started strictly after env save; fresh OTP after that; identical failure).
- Proxy not running / headers not forwarded (proven working: `x-clerk-auth-status` reaches routes; `/__clerk` 200s; live app environment probe 200).

Hypotheses (NOT facts):

- H1 (leading): `CLERK_SECRET_KEY` in Vercel Production is not valid for the live Clerk app (wrong/foreign/revoked value). Fits everything: client needs only the publishable key; every server verification fails silently.
- H2: Browser/session mismatch edge (e.g. session bound to a different Clerk instance than the secret).
- H3: Proxy-side token rejection for another non-obvious reason.

CORRECTION 2026-09-17 — root cause proven (see below); H1–H3 retired.

ROOT CAUSE (proven, no longer a hypothesis):

- `session-token-and-uat-missing` fires only when middleware cookie selection finds neither session token nor client UAT (`@clerk/backend` `authenticateRequestWithTokenInCookie`).
- Production probes with synthetic cookies proved proxy transport, parsing, selection, and verification all work (each cookie combination returns its textbook-distinct reason; fakes rejected as `token-invalid`).
- The suffixed-only probe (`__session_OG0DflVz` + `__client_uat_OG0DflVz`) returned `session-token-and-uat-missing`, possible only when the server-derived cookie suffix differs from the browser's `OG0DflVz`. The suffix is `base64url(SHA-1(publishableKey))` verbatim while key parsing tolerates pasted trailing whitespace — so the server key string differed invisibly from the browser key (same Frontend API, desynced suffix).
- Fix: `proxy.ts` passes an explicitly trimmed `publishableKey` to `clerkMiddleware` (no-op for clean values). Post-deploy probe flipped suffixed-only to `token-invalid` (selection hits, fake correctly rejected) — mechanism fix verified in production without owner action.
- Secret rotation alone could not fix this; the failure was pre-verification (cookie selection), never a verification rejection.

Pending: one owner Save-to-account click to confirm end-to-end claim success (real cookies must now select; verification with the rotated secret happens for the first time).

## 7. Exact Next Action

Owner: click Save to account once on the signed-in production browser, then report whether the research shows "Saved privately to your CLINCH account." Builder verifies via the `clinch-claim` log line (expect `authPresent = true`, `claimed = 1`).

## 8. Production UAT Ledger

- META visible-stock research: PASS (full research to stopped brief, 2026-09-17)
- Featured-8 deterministic preflight (ticker + 1H candles + resolver): PASS
- Non-featured spot checks (incl. `RDY`/`DY` distinctness): PASS
- `/api/stocks` zero-broken-catalog: PASS (1653/1653/0)
- Authenticated research ownership: NOT RUN (needs working server auth)
- Guest → account claim: FIX DEPLOYED, awaiting owner verification click (was FAIL `401 CLAIM_AUTH_REQUIRED`)
- Persistence across sign-out/in: NOT RUN (blocked on claim)
- Decision Watch creation: NOT RUN (paused behind claim)
- Telegram account linking: NOT RUN (paused)
- Watch transition: NOT RUN (paused)
- Telegram notification: NOT RUN (paused)

## 9. Important Commits

- `1f6f91b` — fix: trim Clerk publishable key to sync server cookie suffix with browser — suffix-desync root cause + probe proof + 4 tests
- `d22d2bc` — fix: harden guest research claim contract with stable codes and idempotency — claim rewrite + diagnostics + 9 tests
- `92d3d5e` — fix: enforce single researchable stock catalog contract (META integrity) — canonical catalog, taxonomy, verifier
- `4ccf30c` — feat: restore featured stock brand marks — recognizable marks
- `e1448c2` — fix: restore production sign-in control — Clerk UI/proxy hardening
- `dea4af6` — fix: prepare clerk production proxy — proxy.ts architecture
- `d26cf6c` — polish: use provenance-safe stock identity fallbacks
- `01d9c9a` — fix: align account persistence and decision watch UI
- `74e74a7` — fix: isolate decision watch vps runtime
- `3dc3b6c` — fix: move decision watch runtime to vps worker
- `59cfae6` — feat: add channel-neutral decision watch foundation

## 10. Production Deployments

- 2026-09-17 ~07:33 UTC — claim-contract hardening + catalog fixes — result: claim codes live, catalog 1653/0.
- 2026-09-17 07:45:44 UTC (`dpl_63UrzkTVfharqoZ9ZUtTaVbKu9aV`) — owner redeploy after secret rotation — result: claim still 401, timing race ruled out by later deploy.
- Post-07:56 UTC — owner redeploy started strictly after env save — result: identical 401, timing theory eliminated.
- 2026-09-17 ~09:35 UTC (Ab28PtHouxmWZosLrg9Qpfx7Hs1Q) — trim publishable key in proxy options + suffix regression tests — result: suffixed-only probe flipped `session-token-and-uat-missing` → `token-invalid`, proving server/browser suffix sync restored.

## 11. Infrastructure Safety Constraints

- Shared VPS hosts unrelated production workloads; never touch unrelated services.
- Do not restart Caddy; do not modify firewall, system Node, Docker, or global services.
- CLINCH VPS surface is only the isolated runtime/service (`clinch` user, `clinch-watch-worker.service`).
- No SSH into VPS unless explicitly necessary and approved.
- Telegram/VPS changes require a reason tied to the current task.
- Web app deploys go only to the existing Vercel project; stable URL must not change.

## 12. Security Invariants

- Clerk user ID is the account ownership key, never email.
- Guest ownership = secure owner cookie + timing-safe HMAC verifier; same key at create and claim.
- Strict same-origin on all mutation requests.
- No claim by session-ID possession alone.
- No secrets, tokens, user IDs, or verifier material in logs, responses, or this file.
- No insecure fake "Connect Bitget" or invented support.
- Account-owned data requires matching authenticated Clerk user on every access.

## 13. Known Deferred Work

- WhatsApp notification adapter (dispatcher is channel-neutral; Telegram first).
- Optional Bitget account personalization.
- Nothing deferred is a current blocker.

## 14. Director Notes / Decisions

- 2026-09-17 — Visible = researchable is a release gate (`BROKEN = 0`), not an aspiration.
- 2026-09-17 — Stock-info `code` is authoritative; never R-strip tickers (`RDY` ≠ `DY`).
- 2026-09-17 — Live `stock-info` returns `name: null` for major symbols; identity falls back to directory/neutral label.
- 2026-09-17 — Claim failures must carry stable machine codes; transient/provider faults must never read as `UNSUPPORTED_ASSET`-style user blame.
- 2026-09-17 — Diagnosis before fix: the claim 401 was proven at `currentAccountUserId()`, not in claim logic; instrumentation first, auth surgery never without evidence.
- 2026-09-17 — Clerk cookie suffix is `SHA-1(publishableKey)` verbatim while key parsing tolerates whitespace: always trim keys server-side; desync is silent (no errors, just `signed-out`).

## 15. Takeover Checklist

1. Read this file.
2. Run `git status`.
3. Run `git log --oneline --decorate -10`.
4. Confirm current production deployment.
5. Confirm the current blocker before changing code.
6. Read the relevant implementation files.
7. Never assume a hypothesis is proven.
8. Preserve protected systems unless the current task requires them.
