# CLINCH — Director Handoff

Last updated: 2026-09-18
Current branch: master
Current HEAD (code): 3a9845f
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
- Auth server-side: WORKING (owner claim 09:38 UTC: `proxyAuthStatus = signed-in`, `authPresent = true`)
- Guest → account claim: WORKING (`claimed = 8` on owner UAT; 2 foreign recent IDs correctly rejected)
- Recent Research: WORKING (owner-confirmed: claimed research visible in account history)
- Authenticated research ownership: WORKING (owner-confirmed: fresh signed-in research account-owned immediately, no Save CTA)
- Persistence across sign-out/in: WORKING (owner-confirmed: sign-out hides, sign-in restores)
- Decision Watch: PARTIALLY WORKING (creation + linking + heartbeat live; Telegram companion actions live; genuine transition pending)
- VPS worker: WORKING (deployed, heartbeat/lease/reclaim/restart proven; bundle proven functionally current on all worker paths; DO NOT TOUCH)
- Telegram linking: WORKING (owner linked 2026-09-17, CONNECTED persisted; reverse discovery path added 2026-09-18)
- Telegram outbound notification: PARTIALLY WORKING (connection confirmation received; decision-flow message pending a real transition)
- Telegram companion (home/watches/actions/recent/help): DEPLOYED 2026-09-18, owner UAT A–G pending
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

IN PROGRESS 2026-09-18: Telegram companion final sprint. Owner Phase 1+2 DONE (Tesla watch created 10:18 UTC 09-17; Telegram linked with confirmation received). Companion (home, /watches with pause/resume/stop, /recent, /help, callback queries, Telegram-first link guidance) deployed, covered by 13 companion + 4 linking tests. Next: owner Telegram UAT A–G, then genuine-transition observation (never fabricated).

### Clerk server-side authentication (RESOLVED history — do not regress)

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

Owner verification completed 09:38 UTC (`claimed = 8`); auth rows above are PASS per owner confirmation.

## 7. Exact Next Action

Owner, in order: (1) Security rotations from the credential checklist (dev Neon password, dev Clerk test keys, dev peppers plus dedupe, sponsored-key scope check, BotFather token only if local matches prod). (2) Telegram UAT C–G if not yet done (pause → web PAUSED; resume → web ACTIVE; Open Research; Recent Research; Open CLINCH). (3) Record demo video (DEMO_SCRIPT.md), add LICENSE decision, post X, submit form by the 9/21 operational deadline.

## 8. Production UAT Ledger

- META visible-stock research: PASS (full research to stopped brief, 2026-09-17)
- Featured-8 deterministic preflight (ticker + 1H candles + resolver): PASS
- Non-featured spot checks (incl. `RDY`/`DY` distinctness): PASS
- `/api/stocks` zero-broken-catalog: PASS (1653/1653/0)
- Authenticated research ownership: PASS (owner-confirmed 2026-09-17: fresh signed-in research account-owned immediately, no Save CTA)
- Guest → account claim: PASS (09:38 UTC owner click: `claimed = 8`, `alreadyOwned = 0`; 2 stale foreign recent IDs correctly rejected as `CLAIM_ALREADY_OWNED_BY_OTHER_ACCOUNT`, no cross-account write)
- Persistence across sign-out/in: PASS (owner-confirmed 2026-09-17)
- Decision Watch creation: PASS (owner 2026-09-17: Tesla, Better to wait → Slightly favorable, Telegram, ACTIVE; `POST /api/watches → 201` 10:18 UTC; pre-link 412 correctly enforced)
- Telegram account linking: PASS (owner 2026-09-17: connect 200 → webhook 200 → CONNECTED; wrong/missing secret correctly 401)
- Telegram connection-confirmation transport: PASS (owner received "CLINCH notifications are connected for this account via TELEGRAM.")
- Watch transition (deterministic harness): PASS (`watch-transition` tests: heartbeat, lease-once, real-code transition → TRIGGERED, dedupe, no-channel PAUSED)
- Telegram companion regression: PASS (`telegram-companion` 13 tests: resolution scoping, watches output, pause/resume/stop incl. foreign rejection, recent scoping, start variants, secret + ack discipline)
- Telegram companion UAT: PASS 2026-09-18 (owner-confirmed all: /start home, My Watches + watch data, pause → web PAUSED, resume → web ACTIVE, Open Research, Recent Research, Open CLINCH). Stop not required and not exercised.
- Live worker heartbeat/process: PASS (owner 2026-09-17: Tesla card shows Last checked Sep 17, 10:38 AM, screenshot ~10:39; status ACTIVE, no decision message — correct no-op cycle)
- Real market transition: PENDING (requires genuine movement; never fabricated)
- Decision Watch Telegram notification: PENDING (only on a real transition)
- Telegram companion UAT A–G: PASS (owner 2026-09-18, all eight checks; deployed 2026-09-18)

## 9. Important Commits

- `3a9845f` — feat: Telegram companion with chat-scoped watches, actions, and recent research — home/watches/actions/recent/help + callbacks + reverse link path + 13 tests
- `df21d67` — feat: prove watch transition dispatch and telegram linking with regression tests — 8 permanent tests + WatchList last-checked line
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
- 2026-09-17 09:38 UTC — owner Save-to-account UAT on Ab28PtHouxmWZosLrg9Qpfx7Hs1Q — result: `authPresent = true`, `proxyAuthStatus = signed-in`, `claimed = 8`; blocker resolved.
- 2026-09-17 ~10:25 UTC (CaHAsHYUi4BZZxSEhE2w2J6A3Cna) — watch transition/linking tests + WatchList last-checked line — result: deployed clean; catalog 1653/0 re-verified.
- 2026-09-18 (88BmjhpTpXHYdgeYWejybiUpi9kh) — Telegram companion (home/watches/actions/recent/help/callbacks) — result: deployed clean; catalog 1653/0 + research sanity re-verified; owner UAT A–G pending.
- 2026-09-18 (EhVrzTfkhtwHGBSm8wqoqtsouSBQ) — favicon fix — result: deployed clean; icon 200, catalog 1653/0 re-verified.

## 11. Infrastructure Safety Constraints

- Shared VPS hosts unrelated production workloads; never touch unrelated services.
- Do not restart Caddy; do not modify firewall, system Node, Docker, or global services.
- CLINCH VPS surface is only the isolated runtime/service (`clinch` user, `clinch-watch-worker.service`).
- No SSH into VPS unless explicitly necessary and approved.
- Telegram/VPS changes require a reason tied to the current task.
- Web app deploys go only to the existing Vercel project; stable URL must not change.
- 2026-09-18: GitHub repo `Techkeyy/clinch` (public, branch `master`) connected to the EXISTING Vercel project via `vercel git connect`; no new project, no env/domain changes. Push `579a111` auto-produced production deployment `dpl_8fuhfTHhyUCECLkLANYrTcU5jgfN` within ~40s with zero manual deploys.

## 12. Security Invariants

- Clerk user ID is the account ownership key, never email.
- Guest ownership = secure owner cookie + timing-safe HMAC verifier; same key at create and claim.
- Strict same-origin on all mutation requests.
- No claim by session-ID possession alone.
- No secrets, tokens, user IDs, or verifier material in logs, responses, or this file.
- No insecure fake "Connect Bitget" or invented support.
- Account-owned data requires matching authenticated Clerk user on every access.
- SECURITY GATE OPEN (2026-09-18): dev-only values from `.env.local` appeared in a debugging transcript (never in repo/history, verified clean). Owner rotations pending: dev Neon password, dev Clerk test keys, dev `SESSION_PEPPER` values plus removal of the doubled key line, sponsored gateway key scope confirmation, Telegram bot token only if the local value equals the production token. Production secrets were never printed and need no action unless the checks below implicate them.

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
- 2026-09-17 — Watch E2E honesty rule: heartbeat/transition/notification each proven separately; never fabricate market movement or test alerts in production data.
- 2026-09-18 — Telegram is a linked client, never identity: chat→account resolution only via token-bound connection; callbacks carry id only, version read fresh; mutations reuse web authorization rules.
- 2026-09-17 — Clerk cookie suffix is `SHA-1(publishableKey)` verbatim while key parsing tolerates whitespace: always trim keys server-side; desync is silent (no errors, just `signed-out`).
- 2026-09-18 — Credential hygiene: dev-only secrets shown in a debugging transcript are treated as exposed; rotate dev Neon password, dev Clerk test keys, and dev peppers, dedupe the doubled `SESSION_PEPPER` line in `.env.local`, and confirm the sponsored gateway key scope before touching it. Never commit values; names only.
- 2026-09-18 — DEADLINE STATUS: CONFLICT. Landing page says 9/21, S2 guide says 9/27 UTC+8, cutoff hour unpublished. Operational deadline: SUBMIT BY 9/21. Never present either date as the resolved rule.

## 15. Takeover Checklist

1. Read this file.
2. Run `git status`.
3. Run `git log --oneline --decorate -10`.
4. Confirm current production deployment.
5. Confirm the current blocker before changing code.
6. Read the relevant implementation files.
7. Never assume a hypothesis is proven.
8. Preserve protected systems unless the current task requires them.
