# CLINCH P7 — Security & Trust Design

## 1. State metadata

P7 BUILDING (P0-P6 PASS; P8-P27 NOT STARTED; overall BUILDING). Locked 2026-09-12
against the P6 architecture (Next.js single deployable, Neon/Drizzle, Zod, Qwen
via narrow interface, direct Bitget REST, anonymous UUID sessions, two tables,
streamed POST commands, Postgres-authoritative state). No product code. Design
only; the audit skill's rules apply as discipline (verify-don't-assume, secrets
hygiene, claim-vs-reality, least privilege). No P8 work.

## 2. Executive security position

The browser is untrusted. The model is untrusted for authority. External data is
untrusted until validated. The server is the sole application trust boundary.
Structured persisted state is the source of truth. Concretely: an anonymous user
gets trading research without credentials; nobody can read or steer another
user's session; the model cannot take authority, reach secrets, or fabricate
evidence; every displayed finding traces to validated, freshness-stamped server
state; abuse is bounded invisibly without punishing normal use.

## 3. Threat model

Malicious anonymous user: prompt injection demanding state changes, secret
reveals, or arbitrary fetches; model-call flooding; Bitget-call flooding;
malformed symbols; multi-KB prompts; duplicate runs; expensive-loop attempts;
arbitrary URLs/tool names; session-ID guessing or replay from another browser.
Accidental normal user: double clicks, refreshes, retries, ambiguous or malformed
text, two-tab conflicts. Browser attacker: XSS via dilemma/model/Bitget strings,
CSRF against cookie-backed actions, stolen session identifiers, malicious
cross-origin requests. External provider: malformed/stale/hostile/timeout
responses from Qwen or Bitget, unexpected fields, downtime. Dependency
compromise: vulnerable or malicious package, install-time scripts, version drift.
Out of scope (not product-relevant): physical host attacks, BGP-level adversaries,
insider threats at hosting vendors, attacks on Bitget/Qwen infrastructure itself.

## 4. Protected assets

Server secrets (Qwen/DashScope credential, Neon DATABASE_URL, deployment secrets,
session-hash pepper). Session ownership (read/write limited to the owning
browser). Research integrity (no fabricated evidence, no silent source swaps, no
missing-as-negative collapse, no persisted-step mutation, no skip/stop bypass).
Stored dilemmas and intents (private application data despite no identities).
Availability and cost (anonymous abuse must not mint unlimited model/DB/API spend).

## 5. Trust boundaries

Browser ↔ server (HTTPS; server validates everything). Server ↔ model provider
(server-side key; schema-bounded responses; least data sent). Server ↔ Bitget
(read-only fixed endpoints; responses validated + freshness-stamped). Server ↔
Neon (server-side credential, TLS, least-privilege role). Server ↔ logs (redacted
by policy). Crossed only through the narrow interfaces named in this document.

## 6. Trust matrix

| Component | Trust level | May receive | Must never receive | Authority |
|---|---|---|---|---|
| Browser | untrusted | own rendered state, public UI | secrets, other sessions, verdict power | none; displays server truth |
| Next.js server | sole trust boundary | validated input, provider/Bitget responses | client-authored state, arbitrary URLs | all verdicts, transitions, persistence |
| Semantic compiler | deterministic code | normalized facts, rules | model verdicts, user commands | candidate semantics within rule module |
| Kernel | deterministic code | structured candidates | network, model text, orders | RESEARCH/SKIP/STOP/CLARIFY/CANNOT_RESOLVE |
| Bitget APIs | untrusted until validated | fixed request shapes | credentials, orders, trust | none; data after validation only |
| Qwen | untrusted for authority | minimal task prompts | secrets, cookies, full state, DB access | none; language tasks only |
| Neon | trusted storage | session/step rows | browser-direct access | durability, not verdicts |
| Logs | redacted sink | ids, transitions, reason codes, latencies | secrets, owner tokens, full prompts, CoT | debugging, never evidence |

## 7. Anonymous ownership design

Session identity and ownership are SEPARATE values. Browser holds: public
sessionId (UUIDv4, identifier only) plus `clinch_owner`, a 256-bit random owner
secret in an httpOnly cookie (never JavaScript-readable, never in URLs or logs).
Server stores per session only `owner_hash = SHA-256(pepper + owner_secret)`
(peper = deployment secret, sec 35). Every session action (start-continue,
clarify, retry, GET session, stream commands, delete) recomputes the hash and
compares timing-safe before any read or write. Session IDs alone grant nothing:
possession of an ID without the owner cookie yields unauthorized on every
endpoint. Same browser (second tab included) shares cookies and works;
different browser without the cookie cannot read, continue, retry, modify, or
delete. No signup, no accounts, no wallet, no recovery-by-design (sec 33).

## 8. Cookie contract

`clinch_owner`: HttpOnly always; Secure in production (localhost dev exception
documented in P9); SameSite=Lax; host-only (no Domain attribute); Path=/;
Max-Age 30 days matching retention (sec 27); value base64url 32 random bytes;
re-issued only on fresh session creation (no rotation ceremony in v1). Forbidden
homes for the secret: localStorage, sessionStorage, query strings, fragments,
frontend logs, model prompts, error payloads.

## 9. Authorization

Ownership check precedes ALL session logic (before version checks, before state
loads for mutation, before stream subscription binds a session). Order per
request: validate shape → verify ownership → check idempotency/version →
authorize transition → execute → persist → emit. Unauthorized returns identical
generic 401/404-style denial without revealing whether the session exists.

## 10. CSRF

Decision: NO separate CSRF token. Protection rests on three jointly sufficient
layers for this exact design: (a) all state-changing actions are POST with
`Content-Type: application/json` (non-simple requests; cross-origin posting
without CORS grants fails preflight, and no credentialed CORS is ever granted);
(b) SameSite=Lax cookies are withheld on cross-site POST; (c) strict Origin/Host
validation rejects any state-changing request whose Origin is absent-unexpected
or foreign (same-origin or empty-for-navigation POSTs only where the client
provably omits Origin). Read-only GETs remain safe cross-origin (SOP + no
credentialed CORS = not exfiltratable). P17 must test a foreign-Origin POST and
a top-level-GET exfiltration attempt.

## 11. CORS

Same-origin by default. No `Access-Control-Allow-Origin: *` on any route, and no
credentialed CORS at all in v1 (UI and API ship from one deployable). Bitget and
model calls are server-to-server, never browser-originated. Any future exception
requires proof of necessity plus Director review.

## 12. Input validation

Enforcement lives in Zod schemas at the Route Handler boundary (shared
client/server module for messages, server-authoritative for decisions). Limits:
dilemma text 2000 chars; clarification 500; asset/symbol raw 32; idempotency key
`[A-Za-z0-9-_]{16,64}`; session id UUIDv4 shape; stateVersion non-negative int;
JSON body max 32KB; content-type must be application/json for POSTs. Reject
(rather than truncate) security-sensitive identifiers; truncation of prose, if
ever applied, is disclosed in-product. Exact numbers are initial values P9 may
tighten, never loosen without review.

## 13. Prompt-injection boundary

User text is DATA. The model interface exposes no capability that could honor
"ignore instructions / call this URL / reveal keys / mark complete": no URL
fetching, no shell, no database, no secrets in context, no endpoint construction,
no family registration, no rule mutation, no direct state writes, no STOP
authority. Security is architectural (capability absence + schema-bounded
outputs + server-owned transitions), never prompt politeness. Prompt-injection
attempts are handled as ordinary untrusted input: parsed for intent or rejected,
never obeyed as instructions.

## 14. Model input minimization

Intent parse receives: dilemma text + allowed action enum + symbol universe hint
only. Prose polish receives: assembled brief sections + approved provenance
labels, nothing else. Never sent: env vars, DB credentials, cookies, ownership
secrets, stack traces, app config, other sessions, raw Bitget dumps beyond the
finding being worded.

## 15. Model output contract

All structured model output is Zod-validated; invalid output is never partially
trusted. Malformed JSON, extra actions, nonexistent symbols, schema overflow,
missing fields, refusal text, or malicious-looking fields → at most one useful
retry → CLARIFY or truthful model-service failure. No silent coercion into a
trade decision; ambiguity resolves to CLARIFY.

## 16. Family/tool allowlist

Research execution consults a server-side registry containing exactly
`spot-structure` and `perp-positioning`, each bound to fixed endpoint builders.
User text and model text cannot supply endpoints, URLs, executables, or new
family strings that become runnable. Unknown family → reject. Future families
enter only via the P6 six-step validation path (proven → normalizer → topics →
branch validation → tests → registry edit).

## 17. SSRF

No `fetch(userProvidedUrl)` exists anywhere. Bitget adapter: fixed trusted base
host + fixed endpoint builders + validated symbol/category/interval enums; no
user-supplied host; redirects disabled or pinned to the same trusted host.
Model endpoint: configured server-side base URL only. Outbound allowlist is
exactly: api.bitget.com (proven paths), the configured model endpoint, the Neon
endpoint via DB client.

## 18. Bitget read-only enforcement

Adapter exposes market reads only; no order/cancel/transfer/withdraw/account
mutation methods exist, and no generic method/path passthrough exists. Later
audits mechanically grep for write families (`place.*order`, `cancel`, order
endpoints, transfer/withdraw paths, API-keyed write verbs). Any future trade
support requires DIRECTOR review before code.

## 19. Evidence integrity

Findings carry type, family, canonical symbol, source timestamp, fetched
timestamp, freshness status, normalized facts. Only deterministic server
normalization creates decision-critical evidence records; the model references
evidence IDs in prose but introduces nothing. Unsigned client claims about
evidence are rejected at the boundary.

## 20. No-data invariant

Missing vs negative are distinct Zod-discriminated types, enforced in code
review and unit tests: `noData(reason)` vs `observedAbsent(detail)`. A timed-out
orderbook is never "thin liquidity"; an unsupported indicator is never "neutral
signal". Later phases must include at least one test per family proving the
split.

## 21. Freshness integrity

Freshness is computed server-side from immutable source timestamps; frontend
cannot upgrade stale to fresh (no such action exists); model cannot relabel
freshness (no such field in its output schema); rules requiring fresh evidence
reject stale inputs at evaluation. Threshold values calibrate in P10; authority
is locked here.

## 22. DB security

DATABASE_URL server-only (never serialized, never logged even partially);
TLS-enforced connections; least-privilege application role (CRUD on app tables
only, no DDL at runtime) provisioned in P9/P18; browser has no DB path;
migrations run as a separate deploy-time step, never from request handling;
Drizzle parameterized queries only, no string-built SQL from user content; no
admin credential in client, logs, or CI output.

## 23. State integrity

All transitions server-computed from persisted state plus narrow validated
command parameters (dilemma, clarification text, expected version). No endpoint
accepts replacement state JSON; read/skip/stop fields are server-derived only.
Ste
...[truncated 9113 chars]