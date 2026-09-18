# CLINCH P3 — Scope Lock (v1 Product Contract)

## 1. State metadata

- Phase: P3 BUILDING (P0 PASS, P1 PASS, P2 PASS accepted by Director; P4-P27 NOT
  STARTED; overall BUILDING). Timestamp: 2026-09-11. No product code. No
  architecture chosen (no framework, database, model provider, or deterministic-vs-model
  decision anywhere in this document). No P4 work.
- Locked inputs: primary user (off-hours rToken retail trader, persona Maya; access
  open to all), rToken-centered v1, core promise, hinge definition, human-final rule,
  locked skip/stop/magic-moment, Bitget load-bearing as grounding plus proven research
  evidence (five Skills provisional pending P4), no-wallet/no-account/no-key core,
  AI Trading Desk Open Theme, 2026-09-21 UTC+8 submission (hour unknown).

## 2. Product contract

CLINCH v1 is a deployed web application where a normal user describes a tokenized
U.S.-stock trading decision in plain language and receives a concise, sourced
research brief organized around the Decision Hinge: the one unanswered question most
capable of changing their decision. The product researches hinges sequentially using
only P4-proven live Bitget capabilities, visibly skips what cannot matter, stops
when nothing left could matter, and leaves the decision to the human. Everything in
section 6 MUST SHIP is the contract. Everything in section 10 is refused. The test
for any proposed addition is: is it required for the locked promise to Maya? If not,
it does not enter the critical path.

## 3. Primary user

Unchanged from P2: self-directed retail traders considering tokenized U.S.-stock
trades outside normal U.S. market hours. Thesis and optimization target, never an
access gate. Secondary users use the identical core flow.

## 4. Supported asset boundary

Promised universe: Bitget Reality / rToken tokenized U.S.-stock instruments that P4
can dynamically discover and obtain sufficient read-only research context for. This
excludes hardcoding rNVDA (the interface accepts any P4-proven Reality instrument),
excludes promising every listed stock, excludes generic crypto as a core promise,
and excludes silent support for unproven classes. Canonical example rNVDA remains
the primary story and demo default, but the demo prompt describes the live observed
move; no market claim is ever hardcoded (never "rNVDA is down 4%" unless true at
demo time). If the live rNVDA context is unsuitable on demo day, the demo uses
another P4-proven Reality instrument with a genuinely suitable live decision; the
mechanism is locked, the anecdote is not. Non-Reality symbols entered by users get
the unsupported-asset state (plain coverage statement plus nearest supported
alternative), never fake analysis.

## 5. Core user flow

Open CLINCH; describe a tokenized U.S.-stock decision; CLINCH confirms
understanding; live Bitget-grounded baseline; Decision Hinge 1; research the most
decision-relevant unanswered question; evidence changes or confirms the read;
next hinge or explicit skip; repeat only while a question can materially matter;
explicit stop; concise brief; human decides. The production app implements this
genuinely, end to end, with no mocked step presented as live.

## 6. MUST SHIP capabilities

- FR-linked natural-language decision input (FR-01) with at most one necessary
  clarification (FR-02 restatement path).
- Live Bitget-grounded baseline for the contemplated instrument (FR-03).
- Decision Hinge presentation with its decision relevance stated (FR-04).
- Real research execution per selected hinge using P4-proven sources (FR-05),
  narrated as what is being checked and why.
- Evidence results with finding, relevance, observation time, and provenance where
  available (FR-06).
- Decision-state updates in user language after meaningful findings (FR-07).
- Adaptive next-hinge selection, never a fixed tool sequence (FR-08).
- Visible skip cards with reasons, in-product not logs-only (FR-09).
- Deliberate stop announcement with residual uncertainty (FR-10).
- Concise one-screen final brief with the section 14 content (FR-11).
- Truthful failure behavior across the section 6M case list (FR-12).
- Session persistence with honest freshness marking (FR-13, built in P15, scoped here).
- Human-final rule with research-support notice and no execution surface (FR-14).
- Clean production core journey: deployed, fast enough for the 90-second path,
  no developer tooling required (FR-15).
- Duplicate-submission safety: repeats never double-charge, double-render as new,
  or corrupt a brief (FR-16).

## 7. Conditional on P4

- Which Reality instruments beyond rNVDA are served (discovery proof decides).
- Which research capabilities back each hinge class (individual Skill usefulness,
  Agent Hub market reads, depth/fills only if accessible AND decision-useful).
- Citation strength per source (transport-level where vendor-neutralized; use in
  decision-critical output needs Director review if unprovable).
- Whether re-check can be one-tap convenience or manual fresh run.
- Whether any secondary scenario polish beyond the canonical path is supportable.
- Latency envelope confirming the 90-second journey is achievable.

## 8. Required later (final v1, not early core build)

Session persistence and refresh recovery (P15); freshness marking (P8/P15); retry
and interrupted-session states (P13/P15/P21); production deployment with HTTPS
(P18); responsive mobile usability plus accessibility basics (P8/P13); secure
service-credential handling with zero client-side secrets (P7/P9); rate and error
handling against live backends (P10/P11/P21); clean-user E2E (P19); owner UAT
(P20); repository and claim audits (P17); README plus evidence (P22); submission,
video, and compliance assets (P23-P26). None of these may be dropped for being
"later"; they are tracked requirements with owning phases.

## 9. Optional functionality

- One-tap re-check of stale briefs (downgrades to manual fresh run if unproven).
- Minimal price-context visual (P8 only if comprehension-tested; charts stay
  convenience, never required for conclusions).
- Worked example dilemmas on the landing state (convenience for onboarding).
- Demo Day checkbox, university-name field, K3 checkbox, X-post link field at
  submission time (P23; compliance conveniences, not product features).
- P14 account personalization: CUT FROM CRITICAL PATH (see section 12).

## 10. OUT OF V1

Autonomous order execution; trade placement; wallet connection of any kind; Bitget
Wallet flows; copy trading; portfolio manager, rebalancing, and full portfolio
analytics; strategy marketplace, strategy generation, and backtesting as product
features; paper-trading engine; agent marketplace; multi-agent debate room and
five-agent vote UI; social feed, public profiles, followers; alerts, price alerts,
push notifications; native mobile app; browser extension; Telegram bot; Discord
bot; voice interface; chart-heavy terminal and TradingView clones; generic crypto
or stock screeners; universal search; news terminal; automatic position sizing; tax
tools; P&L dashboard; execution routing; advanced account personalization; animated
visual spectacle; sponsor-logo feature theatre. OUT means out: re-entry needs a
Director decision, never a builder's "might be useful."

## 11. Scope matrix

| Capability / Feature | V1 Status | Why | Proof Phase | Cut Rule |
|---|---|---|---|---|
| NL decision input | MUST SHIP | Promise entry point | P13/P19 | Never cut |
| Decision restatement + max-1 clarification | MUST SHIP | Contract on what is decided | P13/P19 | Never cut |
| Live Bitget baseline (rToken context) | MUST SHIP | Grounds every hinge | P4 then P10 | Never cut; P4 no-go if unprovable |
| Hinge presentation with relevance | MUST SHIP | Core differentiator | P5/P12 | Never cut |
| Real per-hinge research execution | MUST SHIP | Promise fulfillment | P4 then P11 | Never cut; P4 no-go if unprovable |
| Evidence with time + provenance | MUST SHIP | Auditability, judging quality | P4/P11 | Never cut |
| Read updates (user language) | MUST SHIP | Decision tracking | P5/P12 | Never cut |
| Adaptive next-hinge selection | MUST SHIP | Anti-hardcode proof | P5/P12/P16 | Never cut |
| Visible skip cards | MUST SHIP | Magic moment | P12/P19 | Never cut |
| Deliberate stop + residue | MUST SHIP | Anti-noise promise | P5/P12 | Never cut |
| Concise final brief (sec 14) | MUST SHIP | Required proof artifact | P12/P13 | Never cut |
| Failure states (sec 6M list) | MUST SHIP | Director Standard truthfulness | P15/P21 | Never cut |
| Session persistence + freshness | REQUIRED LATER | P15 recovery promise | P15/P19 | Never cut, P15 owns |
| Human-final, no execution surface | MUST SHIP | Track + trust rule | P13/P17 | Never cut |
| Production core journey (90s, deployed) | MUST SHIP | Demo path reality | P18/P19 | Never cut |
| Duplicate-submission safety | MUST SHIP | Truthful state | P13/P15 | Never cut |
| rNVDA + further P4-proven Reality instruments | CONDITIONAL ON P4 | Asset boundary | P4 | Expand only with proof |
| Individual Skill integrations | CONDITIONAL ON P4 | Effectiveness over count | P4 | Use proven only; decorative out |
| Citation strength per source | CONDITIONAL ON P4 | No fake citations | P4 (+Director review if weak) | Downgrade source use if unprovable |
| One-tap re-check | OPTIONAL | Convenience | P4/P15 | First convenience cut |
| Minimal price visual | OPTIONAL | P8 comprehension test decides | P8 | Cut if not comprehension-positive |
| Example dilemmas on landing | OPTIONAL | Onboarding aid | P8/P13 | Cut if cluttering |
| P14 account personalization | OPTIONAL (cut from critical path) | Core complete without it | P14 only | Never enters core without Director |
| Submission-time fields (university, Demo Day, K3, X link) | REQUIRED LATER | Compliance, not product | P23 | Never cut, P23 owns |
| Execution, wallet, brokerage, portfolio tools | OUT OF V1 | Track/trust/scope violations | Never | Director reopen only |
| Backtesting/paper engine/strategy gen as features | OUT OF V1 | Wrong product, unneeded proof | Never | Director reopen only |
| Social, alerts, bots, extensions, native apps | OUT OF V1 | Scope creep carriers | Never | Director reopen only |
| Chart terminal, screeners, dashboards, P&L/tax | OUT OF V1 | Dashboard creep | Never | Director reopen only |
| Playbook integration | OUT OF V1 | Decorative for CLINCH | Never | Director reopen only |
| Spectacle, themes, widgets, extra asset classes | OUT OF V1 | Noise vs promise | Never | Director reopen only |

## 12. Functional requirement IDs

- FR-01 NL decision input. Accept: free-text dilemma accepted, no syntax; at most
  one necessary clarification.
- FR-02 Decision restatement. Accept: asset, action, timing, uncertainty shown;
  user confirms or corrects before research.
- FR-03 Live Bitget baseline. Accept: P4-proven live context (instrument, price,
  move, session) shown before hinge research.
- FR-04 Decision Hinge. Accept: current unanswered question plus why it matters
  plus what finding would change the decision, in retail language.
- FR-05 Real research execution. Accept: selected hinge researched through live
  P4-proven sources; user sees what is checked and why.
- FR-06 Evidence result. Accept: finding, relevance, observation time, provenance
  where available; no fabricated certainty.
- FR-07 Decision-state update. Accept: read updates visibly after meaningful
  findings in user language (representation internal to P5/P6).
- FR-08 Adaptive next hinge. Accept: consecutive runs on scenarios B and C select
  different first research classes; no fixed sequence.
- FR-09 Explicit skip. Accept: skipped path plus reason visible in product UI.
- FR-10 Deliberate stop. Accept: stop announced with reason; residual uncertainty
  shown.
- FR-11 Final brief. Accept: all section 14 content present on one low-noise screen.
- FR-12 Failure behavior. Accept: all section 6M cases behave per P2 trust model
  (truthful, input-preserving, retrying where possible).
- FR-13 Persistence and freshness. Accept: refresh preserves truthful state; old
  briefs marked old; stale never shown as fresh.
- FR-14 Human-final rule. Accept: no order surface exists; research-support notice
  present; stance language stays inside section 20 bounds.
- FR-15 Production core journey. Accept: deployed URL, unauthenticated cold user,
  decision to brief inside the 90-second budget, no dev tooling.
- FR-16 Duplicate safety. Accept: repeated submits yield one truthful state, no
  duplicated side effects or corrupted briefs.

## 13. Non-functional product requirements

Usable in current desktop and mobile browsers with no installs. Core value reachable
inside roughly 90 seconds on a cold run. Every error understandable with safe state
and retry. No secret or credential visible client-side or in URLs. Evidence
freshness always visible and never misrepresented. No mock or fallback ever
presented as live. Duplicate actions safe. Fully usable with zero personalization.
Production independent of the builder machine. Copy contains no long dashes in
visible text.

## 14. Final brief boundary

Default brief fits one low-noise screen with progressive reveal only if P8 proves
the need. Priority order: current read; why; decision-changing evidence; skipped
checks with reasons; unresolved uncertainty; what would change the read. Supporting
detail (full check list, timestamps, references, session note, disclaimer) follows
in compact secondary placement. Raw model or tool output never enters the primary
brief. A twenty-page dossier fails this boundary even if accurate.

## 15. Clarification boundary

At most one necessary clarification before research where practical, restricted to
decision-essential ambiguity: which asset, entering or exiting, now or a different
timeframe. Never requested for core research: wallet, balances, portfolio, age,
risk profile, preferences, credentials. A second question is permitted only when
the first answer leaves the decision genuinely unidentifiable; interrogation flows
fail this boundary.

## 16. Provenance boundary

No unsourced external claim appears as verified evidence. Provenance shown at the
strongest trustworthy level available (endpoint plus timestamp at minimum). Where
Bitget tooling vendor-neutralizes providers, P4 records the exact capture method;
decision-critical use of unattributable sources requires Director review before
shipping. Citations are never invented, padded, or borrowed from adjacent checks.

## 17. Financial-action boundary

CLINCH expresses a research read (leaning in, holding off, standing aside, cannot
resolve, final P8 wording). It never issues guaranteed buy or sell calls, profit
promises, "you should definitely" directives, or certainty claims. The human acts
separately at their own venue. This boundary is a release blocker: any copy
crossing it fails audit regardless of product quality.

## 18. Persistence / recheck boundary

Webpage refresh must restore truthful session state (P15 implementation). Stale
briefs reopen honestly dated with a fresh-run path reusing the decision context;
no continuous monitoring, no background daemon, no automated alerts. Live
re-research on a timer is OUT; user-initiated recheck is the entire scope.

## 19. Canonical scenario set (validation categories, P5 seeds)

A: weekend/off-hours rNVDA move (context-first, skip visible, stop, brief; facts
live). B: price-structure-first quiet drift (news openly skipped). C: macro or
sentiment-first event context (capability per P4). D: cannot-resolve thin-evidence
case (honest wait with unlock conditions). Categories fixed; no scenario-specific
production branches; market anecdotes never hardcoded.

## 20. Demo path (mandatory, unmocked)

Cold user opens live app; enters a genuine decision; sees restatement; receives
live Bitget context; sees the Hinge and why it matters; watches real research;
watches findings redirect the investigation; sees at least one explicit skip; sees
deliberate stop; receives the concise brief; remains the sole decision-maker.
Twelve beats, zero mocks.

## 21. Full-v1 completeness (beyond demo path)

Truthful failures, persistence, refresh and recovery, unsupported-input handling,
production deployment, clean-user E2E, owner UAT, security review, repository and
claim audits, accurate README and evidence, submission and compliance assets. Demo
path working is necessary and not sufficient.

## 22. Cut order

NEVER CUT: NL input; Hinge; decision-value next selection; live Bitget grounding;
real resolving research; visible skip; stop logic; concise brief; human-final rule;
clean production core journey; truthful errors; recovery sufficient against fake
completion. CUT FIRST: animations; decorative charts; extra themes; history
browsing; account personalization; social; complex onboarding; nonessential
integrations; extra asset classes; advanced analytics; dashboard widgets; one-tap
re-check; example dilemmas if cluttering. CUT ONLY WITH DIRECTOR REVIEW: research
capability beyond the proven minimum; re-check convenience; secondary scenario
polish. Deadline pressure never justifies cutting a NEVER-CUT item; if the minimum
real product stops fitting the journey, escalate instead.

## 23. P4 proof target list

Reality discovery: dynamic instrument discovery; verify rNVDA plus others without
hardcoding. Ticker: live fetch without user credentials; freshness fields. Candles:
working intervals; off-hours returns; usable timestamps and session semantics.
Depth: accessible without whitelist or auth; decision-useful if yes. Fills/trades:
accessible, fresh, hinge-useful. Agent Hub market reads: exact live reads and
rToken-decision usefulness. bitget-signal: each relevant Skill tested alone for
independent invocation, exact output, currency, attributability, genuine rToken
hinge relevance, and whether crypto orientation is cross-market signal or noise.
Provenance: truthful citation method per source. Latency: useful calls inside the
90-second budget. Failures: unavailable vs unsupported vs negative evidence
distinguishable. Credentials: no-user-credential set vs service-auth set; flag any
core capability impossible without user exchange credentials.

## 24. P4 go / no-go rules

P4 returns DIRECTOR REVIEW if: Reality baseline unreliable; only one meaningful
research path exists; outputs cannot truthfully support hinge reasoning; every
useful source needs user exchange credentials; rToken evidence misses latency;
provenance too weak for decision-critical claims; canonical rNVDA workflow depends
on inaccessible data; Bitget-native evidence adds too little versus generic model
reasoning. Gaps are escalated, never patched with unrelated third-party systems.

## 25. P5 boundary

P4 proves what evidence and capabilities exist. P5 proves whether CLINCH reasons
about decision value reliably on fixtures including section 19 seeds. P5 never
compensates for missing integrations; P4 never proves the hinge algorithm.

## 26. Definition of done (product level, Director Standard aligned)

Normal user opens deployed CLINCH, states a decision in normal language, receives
real Bitget context, sees the Decision Hinge, gets real targeted research with an
adaptive next step, sees an explicit skip, sees a deliberate stop, receives a
truthful brief, and decides as a human; plus recovery, freshness, security, clean
production, real E2E, owner UAT, accurate docs, and hackathon compliance. UI
existing, logic existing, one API working, or one demo working each equal
incomplete on their own.

## 27. Unresolved issues

P4-dependent: instrument list, capability mapping, citation method, latency
confirmation, credential split. P8-dependent: read wording, microcopy, freshness
visuals, minimal-visual verdict. P15-dependent: persistence mechanics. P25 watch:
cutoff hour, TBD links, judges list, license silence. No open issue blocks P4
start; go/no-go rules convert P4 findings into decisions.

## 28. P3 pass checklist

1. Asset scope explicit (Reality-proven universe, rNVDA canonical not hardcoded)
[DONE]. 2. Every major feature classified with exactly one of five statuses [DONE,
sec 11]. 3. MUST SHIP set complete (FR-01 to FR-16) [DONE]. 4. Optionals fenced
off critical path [DONE]. 5. Personalization outside critical scope [DONE, sec 12].
6. Execution out [DONE]. 7. Generic crypto expansion out [DONE]. 8. Chart creep
controlled as convenience [DONE, matrix + sec 9/22]. 9. Brief boundary
explicit [DONE]. 10. Provenance expectations explicit [DONE]. 11. Session/recovery
in final v1 [DONE]. 12. Two-plus distinct paths required conceptually [DONE, sec 8].
13. Exact paths P4-dependent [DONE]. 14. Four scenario categories intact [DONE].
15. rNVDA canonical, truthful, swappable [DONE]. 16. P4 question list exact [DONE].
17. Go/no-go criteria exist [DONE]. 18. P4/P5 boundary clean [DONE]. 19. Stable FR
IDs with acceptance language [DONE]. 20. Done matches Director Standard [DONE].
21. Deadline cut order exists [DONE]. 22. No architecture chosen (no framework, store,
model, or logic lock in this artifact) [DONE]. 23. No product code [DONE]. 24. P4
not begun [DONE].
