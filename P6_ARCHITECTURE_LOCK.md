# CLINCH P6 — Architecture Lock

## 1. State metadata

P6 BUILDING (P0-P5 PASS; P7-P27 NOT STARTED; overall BUILDING). Locked 2026-09-12
from P4 live evidence (two anonymous Bitget families) and P5/P5B proofs (kernel +
semantic compiler + hybrid direction). No product code written. No P7 work.
Versions verified live on npm 2026-09-12: next 16.3.5, react 19.3.0, zod 4.6.2,
drizzle-orm 0.45.2, drizzle-kit 0.31, ai 7.0.98, @ai-sdk/openai-compatible 3.0.48,
@neondatabase/serverless 1.1.0, vitest 5.0.0, tsx 4.23.13, node v24.14.0 local.
No model credential and no DATABASE_URL present in this environment (names only
checked, values never read): P9/P18 prerequisites, recorded in sec 41.

## 2. Architecture executive summary

One repository, one deployable Next.js application (App Router + Route Handlers),
TypeScript throughout, Postgres (Neon serverless) via Drizzle, Zod-shared
schemas, Vitest. A bounded server orchestrator runs the proven authority chain
(NL intent via model, deterministic market normalization, semantic compiler,
structured kernel, one-family-at-a-time Bitget research, state update, loop with
iteration cap 6) with per-step persistence, SSE progress, and a final brief
reconstructed from structured state. Model use is fenced to intent parsing,
wording polish, and proposed uncertainty phrasing; skip/stop/eligibility/provenance
authority stays in deterministic code. Bitget transport is direct REST through one
typed adapter (no SDK/CLI/MCP weight). Deployment primary: Vercel serverless +
Neon; per-step requests keep every call far inside serverless limits.

## 3. Architectural principles

Authority chain from P6 brief sec 6 preserved end to end with inspectability at
every arrow. Smallest complete system: one repo, one deployable, two tables, two
research families, one model interface. Deterministic where measurable (spreads,
levels, funding math, state transitions, skip/stop verdicts); model where language
is genuinely needed (intent parse, prose polish, uncertainty phrasing inside
allowed bounds). Closed-world v1 semantics: only P4-proven families and validated
topics; the model proposes wording, never sources, endpoints, or verdicts. No
mock presented as live, ever. Boring infrastructure, novel mechanism.

## 4. Options considered

Option A (CHOSEN): single Next.js App Router repo. UI pages + Route Handler API
in one deployable; server components for first paint, client components for the
research stream; secrets stay in server runtime; streaming via SSE route;
Drizzle-Neon persistence; one dependency tree; one deploy target.
Option B (REJECTED): Vite SPA + separate Hono/Express API server. Loses on two
deployables, CORS and session-cookie plumbing across origins, duplicated
client/server types, slower hackathon iteration, zero compensating advantage for a
single-flow product with server-owned state. No other shapes evaluated: anything
larger (microservices, queues, workers, K8s) contradicts the product's size.

## 5. Chosen stack

Runtime Node 24 + TypeScript 5 (single language; no Python split: the v1 core
needs no pandas/indicator engine, and the TA layer is unevaluated scope). Framework
Next.js 16.3.5 (App Router). UI React 19.3 (server + minimal client components).
Schema validation Zod 4.6.2, types shared client/server from one schema module.
Database Postgres via Neon serverless (`@neondatabase/serverless` 1.1.0) with
Drizzle ORM 0.45.2 (+ drizzle-kit 0.31 migrations); rejected Prisma (v8 line is
release-candidate: unsuitable stability for a deadline build). Model via AI SDK
`ai` 7.0.98 + `@ai-sdk/openai-compatible` 3.0.48 against Qwen DashScope
OpenAI-compatible endpoint (docs-verified 2026-09-12: regional
`{workspace}.maas.aliyuncs.com/compatible-mode/v1`, `DASHSCOPE_API_KEY`;
fallback OpenAI direct, same interface). Testing Vitest 5.0.0 (+ tsx 4.23.13 dev
runner). Bitget transport: global fetch with AbortController (stdlib, no client
lib). Nothing else at lock time; P9 justifies any addition.

## 6. Deployment topology

```text
Browser (no secrets, no decisions)
  ↓ HTTPS
Next.js application on Vercel (UI + Route Handlers, SSE streams)
  ↓                ↓                     ↓
Neon Postgres   Bitget public REST   Qwen/OpenAI-compatible model API
(serverless)    (api.bitget.com)     (server-side key only)
```
One deployable plus managed Postgres. Region: default primary with co-location
preferred at P18. Fallback if P18 disproves streaming/DNS/timeouts on Vercel: a
single long-running Node host (Render/Railway/Fly class) running the same Next.js
standalone output against the same Neon database; no VPS-by-habit. P18 re-proves
normal DNS to api.bitget.com from the chosen host (P4 local-resolver finding must
not follow us; no IP hardcoding, no TLS weakening, ever).

## 7. Trust boundaries

Browser: untrusted input, renders server truth only. Application server: sole
trusted orchestration/logic boundary (validates, decides, persists). Model
provider: external language processor behind schema validation (never trusted
with verdicts, sources, or state). Bitget public APIs: external evidence source
(read-only, validated + freshness-checked on entry). Postgres/Neon: trusted
application storage (sessions, steps, provenance; no secrets beyond its own
credential). No user exchange key, no wallet, no execution anywhere in v1.

## 8. Component map

`app/` routes + components (input, restatement, hinge, progress, findings, skips,
stop, brief, recovery states). `server/api` Route Handlers (start, continue,
clarify-respond, session-get, stream, retry-step). `domain/intent` (model parse +
validation + ambiguity rule). `domain/market` (deterministic normalizers +
calculators). `domain/semantics` (versioned rules + compiler). `domain/kernel`
(pure selection/skip/stop + traces). `research/orchestrator` (bounded loop).
`research/bitget` (typed adapter: discovery, mapping, timeout, validation,
provenance) with `research/spot` + `research/perp` family modules behind one
interface. `model/` (narrow provider interface: parseIntent, polishProse,
proposeUncertainty). `persistence/` (sessions, steps, idempotency). `brief/`
(structured assembly). `config/` (versioned thresholds + logic version). No
one-file wrapper directories; domain testable without HTTP/UI.

## 9. Request lifecycle

Cold start: POST dilemma + idempotency key → validate → session row created
(AWAITING) → intent parse (model, schema-validated; failure → CLARIFY path or
FAILED with retry) → baseline fetch (ticker + discovery check, parallel where
independent) → CONTEXT → orchestrator loop (compile → kernel → RESEARCH one
family → normalize → persist step → EVALUATING → next) → STOP/UNRESOLVED/FAILED
→ brief assembly → prose polish (non-blocking for truth: structured brief always
returned) → STOPPED/UNRESOLVED with brief. Continue/clarify/retry/session-get
act on the same session row with version-checked transitions. SSE stream mirrors
state transitions; stream is a view, never the authority.

## 10. Normalized decision state

Minimal contract: sessionId, asset, spotSymbol (canonical RXXXUSDT), perpSymbol
or null, action (sec 11 vocabulary), timeframeContext, read, resolvedTopics[],
activeHinge, evidenceSnapshot (per-family latest + freshness), candidates (last
compiled set), history (step ids in order), skips[] (family + kind + reason),
residualUncertainty[], stopState, briefStatus, logicVersion, stateVersion,
updatedAt. No model chain-of-thought stored, ever.

## 11. User intent contract

Model output schema (zod, server-validated): asset (free text + resolvedSymbol or
null), action enum (enter-now, wait, delay→wait, exit-now, stand-aside, unclear),
timeframeContext string, decisionQuestion string, clarificationNeeded boolean,
clarificationQuestion string|null. Bounded actions only; unknown maps to unclear.
Invalid action never coerced into a trade decision.

## 12. Model boundary

Permitted: intent parsing, ambiguity detection, prose polish of assembled brief,
uncertainty phrasing proposals inside allowed topic/family bounds. Forbidden as
sole authority: skip verdicts, stop verdicts, no-data interpretation, source
admission, stance setting, evidence invention, action changes, autonomous
anything. Every model output is schema-validated; malformed JSON, missing fields,
unsupported asset, invented symbols, invalid action, timeout, refusal, or
inconsistent extraction → retry bounded once → CLARIFY or FAILED with truthful
UX. Structured kernel owns eligibility, effects, dependencies, skip/stop
invariants, no-data handling, provenance validity. Provider strategy: Qwen
primary (hackathon credits, OpenAI-compatible), OpenAI direct fallback, both
behind the narrow interface; switching provider rewrites config, not the engine.
No multi-provider abstraction. No credential exists yet: P9/P18 prerequisite
(model key + workspace/region binding).

## 13. Semantic compiler

Production home of the P5B pattern: `domain/semantics` versioned rule module
(topics, family map, dependency DAG, action-aware effects, terminal absorption,
tiebreak) + compiler function (raw normalized facts → candidate packages with
derivation traces). Model may propose uncertainty WORDING for unfamiliar phrasing;
it may not add families, topics, or verdicts outside the rule module. Coded
semantics: topic applicability, effect tables, dependency/moots derivation.
Model-proposed: paraphrase-level phrasing only, validated back into allowed
bounds. No "AI decides."

## 14. Decision-value kernel

Pure deterministic TypeScript module (P5A logic, production-shaped): consumes
structured candidates (question, eligible family, branches with read effects,
dependencies, data availability); emits RESEARCH/SKIP/STOP/CLARIFY/CANNOT_RESOLVE
plus structured reason (candidate effects, can-change verdict, family,
selected/skipped, reason codes, availability snapshot). Deterministic per
identical structured state; unit-tested incl. reversal/skip/stop contracts;
model-independent; importable without I/O; incapable of trading (no network, no
order concepts in its vocabulary).

## 15. Research orchestrator

Explicit bounded loop (cap 6 iterations; runaway protection only, normal stop is
decision-value): load state → ensure fresh baseline → compile hinges → kernel
decides → RESEARCH invokes exactly one family interface → normalize + provenance
→ persist step → update state → loop; SKIP records reason and re-evaluates; STOP
finalizes; CLARIFY returns the question; CANNOT_RESOLVE finalizes honest
unresolved output. Cap hit → explicit incomplete state with trace, never faked
completion. No agent framework, no recursion, no autonomy.

## 16. Bitget adapter

One internal boundary: symbol discovery/mapping (live `isReality`/`isRwa`, never
R-stripping), request construction, timeouts (AbortController, per-call budget),
zod response validation, freshness stamping, normalization to market facts,
typed errors (P4 taxonomy), provenance capture, bounded safe retry (transient
network only). No order/trade methods in v1 adapter. Direct REST chosen over SDK
(trading-surface weight + observed version skew), over bgc subprocess (fragile),
over MCP (AI-host oriented): fewest moving parts for public reads P4 proved.

## 17. Research family interfaces

Common interface: `fetch(state, need) → normalized evidence + provenance`, one
family per orchestrator step, minimum evidence requested. `spot-structure`:
ticker, candles, orderbook, instrument metadata (P4 paths). `perp-positioning`:
stock-perp ticker, funding, OI, mark/index, perp candles. Registry is an explicit
two-entry map (family → module); future families follow the 6-step entry path
(proven → normalizer → topics/rules → branch validation → test extension →
registry), no plugin infrastructure.

## 18. Market fact normalization

Adapter payloads become bounded facts before semantics sees them: spreadStatus,
liquidityState, moveState, structureState, fundingState, oiState, dislocationState,
dataFreshness. Deterministic calculators own every measurable fact (code computes
spreads/levels/changes); the model explains facts, never computes them.

## 19. Thresholds/config

`config/` module: named thresholds (wide spread, extreme funding, surging OI,
stale cutoffs per evidence type), LOGIC_VERSION, semantic-rules version. Values
are placeholders with sane P4-informed initials; calibration in P10/P12/P16
against live data; behavior covered by parametric unit tests. Mechanism locked,
numbers explicitly not.

## 20. Freshness

Every evidence item carries source, symbol, observedAt, sourceTimestamp,
fetchedAt, ageMs, status (fresh/stale/missing). Policy location: freshness module
with per-type rules (ticker/candle/orderbook/positioning differ); exact cutoffs
refined in P10. Stale is displayable with marking; missing is never evidence.

## 21. Provenance

Decision-critical findings trace to endpoint family + symbol + timestamps
(user-facing: "Bitget Reality market data for RNVDAUSDT, observed 01:14 UTC");
full transport detail stays server-side for audit. No invented citations; weak
provenance blocks decision-critical use pending Director review.

## 22. Session state machine

AWAITING → CLARIFYING → CONTEXT → RESEARCHING → EVALUATING → STOPPED |
UNRESOLVED | FAILED (brief issued alongside STOPPED/UNRESOLVED; FAILED carries
retry). One authoritative state, refresh-safe via persisted row, resumable via
session id, invalid transitions rejected at the write boundary, duplicate submit
returns current state without new runs.

## 23. Persistence/data model

Two tables. `research_sessions`: id UUID pk, intent JSON, state JSON (sec 10
contract), status enum, read, logic_version, idempotency_key unique, brief JSON
nullable, created/updated timestamps. `research_steps`: id, session fk, ord,
kind (hinge/research/skip/stop/note), family nullable, request summary, result
summary, provenance JSON, started/finished timestamps. Ordered history, skips,
provenance, freshness, and brief reconstruction all served. No portfolio/account
schema. Anonymous UUID in httpOnly cookie maps browser to session; no signup, no
personal data; retention minimal per P7.

## 24. API/actions

Tiny surface: POST start (dilemma + idempotency key), POST continue/clarify
(session + payload + expected version), GET session (resume/refresh), POST
retry-step (safe cases only), GET stream (SSE progress). Each returns the
authoritative session state. Nothing else in v1.

## 25. Progress transport

SSE primary: GET stream emits state-transition events with human-readable status
("Checking whether the move is real..."); EventSource auto-reconnect plus
explicit retry-step action; session-get polling is the fallback and the refresh
path. No WebSockets. Stream never authoritative.

## 26. Idempotency

One active run per session enforced by idempotency_key unique constraint plus
version-checked transitions inside Drizzle transactions: duplicate start returns
the existing run; continue requires expected stateVersion, mismatch returns
current state with a refresh directive. Atomic transitions only.

## 27. Concurrency

Second tab/action sees the same authoritative row; concurrent continues serialize
on the version check (loser receives current state, no fork). No collaborative
editing, no locks beyond row compare-and-set.

## 28. Error/retry model

Typed server errors map P4 taxonomy: invalid-input, unsupported-asset,
unsupported-family, no-data, stale-data, upstream-bitget, model-error, timeout,
internal-validation. NO-DATA vs NEGATIVE-EVIDENCE enforced by types (absent data
cannot populate a finding struct). Bounded retries: transient Bitget timeouts,
model timeouts, network blips (max 2, backoff). Never retried: invalid symbol,
unsupported capability, validation failures. No infinite loops.

## 29. Observability

Structured JSON logs per request: requestId, sessionId, transition, hinge topic,
family, upstream latency/status, skip/stop reason codes, model latency, parse
failures, final status. Never: secret values, chain-of-thought, full user
histories. Logs support debugging, audit, and P16 measurement.

## 30. Final brief generation

Assembler renders P3 sec-14 sections from structured state first; model polishes
wording within fixed sections and may not add findings, sources, or numbers.
Prose failure still returns the complete structured readable brief: product truth
lives in state, never solely in a model response.

## 31. Privacy

Stored: dilemma text, structured interpretation, research/evidence state, session
id, timestamps. Never for core: wallet, identity, portfolio, email, balances.
P7 formalizes retention/deletion.

## 32. Performance/cost

Budgets: intent parse ≤12s, baseline ≤6s, hinge eval local (<100ms target),
research call ≤8s each, explanation ≤12s, typical full journey <60s (hard product
cap 90s; no SLA promises). Sequential only where decision-dependent; independent
baseline reads parallel. Cost control: deterministic calcs, compact prompts, one
family per step, concise outputs, no auto-everything, no token accounting theater.

## 33. Dependency policy

Standard library or framework capability first. Locked: next, react, zod,
drizzle-orm (+kit), @neondatabase/serverless, ai, @ai-sdk/openai-compatible,
vitest (+tsx dev). Each earns its place (framework, shared validation, typed
persistence, structured model output, tests). No agent/workflow/state-machine
frameworks, no utility sprawl; P9 justifies any addition in writing.

## 34. Module structure

`app/` (routes, components) / `server/api/` (handlers) / `domain/intent|market|semantics|kernel/` / `research/orchestrator|bitget|spot|perp/` / `model/` / `persistence/` / `brief/` / `config/` / `tests/`. Domain and research-family modules import nothing from HTTP/UI; kernel imports nothing but types.

## 35. Test architecture

Vitest: pure unit (compiler, kernel incl. P5 contracts, market calcs, brief
assembly); adapter tests (fixture-backed Bitget payloads, model-output fixtures);
orchestrator integration (in-memory or test DB); browser E2E later (P19).
Framework-free logic keeps suites fast and hermetic.

## 36. FR-01..FR-16 mapping

| FR | Component(s) | State/data | Proof |
|---|---|---|---|
| FR-01 NL input | app input + POST start + intent validation | dilemma, idempotency key | P13/P19 |
| FR-02 restatement | intent + session | asset/action/timing/uncertainty | P13/P19 |
| FR-03 live baseline | bitget adapter + spot family + orchestrator | ticker/candles/session facts | P10 |
| FR-04 hinge | semantics + kernel + app hinge view | candidates, selection trace | P12 |
| FR-05 research execution | orchestrator + family interfaces | per-family evidence | P11 |
| FR-06 evidence result | normalization + provenance + findings view | finding/time/source | P11 |
| FR-07 read update | kernel + session write | read, history | P12 |
| FR-08 adaptive next | orchestrator loop + kernel | updated state | P12/P16 |
| FR-09 skip | kernel + skip cards view | family/kind/reason | P12/P19 |
| FR-10 stop | kernel + stop view | reason + residue | P12 |
| FR-11 brief | brief assembler + brief view | brief JSON | P12/P13 |
| FR-12 failures | error model + handlers + recovery views | error category, preserved input | P15/P21 |
| FR-13 persistence/freshness | persistence + session-get + freshness marks | rows, timestamps | P15/P19 |
| FR-14 human-final | no order surface + notice copy | (absence enforced) | P13/P17 |
| FR-15 production journey | deployment + full chain | live URL | P18/P19 |
| FR-16 duplicate safety | idempotency keys + versioned writes | key/version columns | P13/P15 |

## 37. Failure walkthroughs

Happy path: chain sec 9 end to end. Ambiguous input: intent low-confidence →
CLARIFYING, one question, resume. Unsupported asset: adapter discovery miss →
plain coverage message + nearest alternative, no fake analysis. Ticker failure:
transient → bounded retry → FAILED/UNRESOLVED honestly. Orderbook unavailable:
family marked no-data, hinge reroutes or conditional read. Perp unavailable:
single-family mode → CANNOT_RESOLVE WITH CURRENT COVERAGE rather than faked
second source. Stale evidence: freshness-marked, never presented as fresh.
Model parse failure: retry once → CLARIFY/FAILED. Model prose failure:
structured brief returned regardless. Refresh mid-research: session-get resumes
or replays from persisted step. Duplicate submit: idempotency returns current
state. Second tab: version check serializes, loser refreshes. DB down: 503 with
safe message, input preserved client-side for retry.

## 38. Rejected complexity

Autonomous agents (no executor exists); microservices/queues/Kafka/Redis/K8s/buses
(single deployable suffices); agent frameworks (proven logic is functions, not
agents); vector/graph DBs (no retrieval problem); mandatory exchange auth
(product rule); browser-direct Bitget research (secret/cors/state chaos);
model-only hinge authority (P0/P5 evidence); deterministic-only NL (NL needs a
model); job queues/workers (bounded in-request loop suffices); WebSockets
(SSE covers progress); VPS-first (no advantage over serverless-first; fallback
only); Agent Hub transport (interface over equivalent data; direct REST is
simpler); bitget-signal dependency (unproven content); Prisma v8 RC (stability);
Python split-stack (no v1 need); MCP (AI-host oriented).

## 39. ADR summary

ADR-01 stack: Next.js single repo + TS + Postgres/Drizzle + Zod + Vitest (one
deployable, shared types, deadline speed) over split SPA+API. ADR-02 topology:
Vercel serverless + Neon primary (per-step model fits limits; streaming native),
single-host fallback; P18 proves DNS/streaming/timeouts. ADR-03 model boundary:
Qwen-primary OpenAI-compatible via narrow interface (credits + switchability),
model fenced to language tasks, kernel authoritative. ADR-04 hinge authority:
P5 kernel + P5B compiler pattern in deterministic code; model proposes phrasing
only. ADR-05 persistence: anonymous UUID sessions, two tables, versioned
compare-and-set (no accounts, minimal data). ADR-06 Bitget transport: direct
REST typed adapter (P4 paths; least weight, most control). ADR-07 progress: SSE
primary with session-get fallback (simplest visible progress).

## 40. Phase implementation handoff

P7: secret handling, retention/deletion, abuse/rate policy, prompt-injection
rules, dependency audit. P8: blueprint from states/copy/budgets herein. P9:
scaffold exactly sec 5/34/35 (no extra). P10: production data layer on proven
families only (plus retest protocol for new ones). P11: family modules behind
sec 17 interface. P12: kernel + compiler + orchestrator per secs 13-15/22.
P13: loop integration over sec 24 surface. P15: recovery hardening per sec 22/26.
P18: deploy sec 6, re-prove DNS, streaming, timeouts, env prerequisites (model
key, DATABASE_URL).

## 41. Unresolved implementation details

Exact Qwen workspace region/model name (needs owner console + credits; P9).
Neon project/branch setup (P9/P18). Vercel timeout tier confirmation (P18).
Numeric threshold calibration (P10/P12/P16). SSE reconnect edge cases (P13).
Rate-limit policy numbers (P7). None block P7/P8 start.

## 42. P6 pass checklist

1-4 stack/runtime/topology/provider chosen [DONE]. 5 authority bounded [DONE].
6-7 compiler/kernel explicit [DONE]. 8 transport selected [DONE]. 9 family
interfaces defined [DONE]. 10-11 normalization/state defined [DONE]. 12
persistence chosen [DONE]. 13 topology chosen [DONE]. 14 progress chosen [DONE].
15 errors mapped [DONE]. 16-17 idempotency/concurrency exist [DONE]. 18
freshness/provenance exist [DONE]. 19 brief reconstructable [DONE]. 20 secrets
clear [DONE]. 21 FR map complete [DONE]. 22 walkthroughs work [DONE]. 23 order
clear [DONE]. 24 rejection explicit [DONE]. 25 no code [DONE]. 26 P7 not started
[DONE].
