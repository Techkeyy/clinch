# CLINCH P5B — Semantic Acquisition Gate

## 1. Why P5B was required

P5A proved the decision-value kernel conditional on hand-declared prune/moot
semantics, and its own ablation showed four CF-1 blindspots without them. P5B
answers whether those semantics can be DERIVED from raw normalized decision state
by reusable mechanism, with zero per-scenario answer encoding.

## 2. Raw input contract

`proof/p5b/raw/*.json`: asset, action (enter-now/exit-now/unclear), read, context,
spot facts (move/spread/book/drift/support), positioning facts
(funding/oi/dislocation), events catalyst, per-family data freshness, resolved
topic list, known observations, narrative. No hinges, families-to-use, prunes,
moots, scores, or oracle labels. 12 base + 3 post-freeze holdouts.

## 3. Forbidden leakage audit

Mechanical grep over `global-semantics.json`, `compiler/compile.js|run.js`
(final evaluator excluded from candidacy path; its one scenario mention was a
comment, removed): ZERO scenario-ID references. Prunes/moots in generated output
trace to global DAG + terminal-outcome rules via per-question derivation logs.
Global rules contain no scenario IDs. SCF-1/SCF-2/SCF-3: absent by construction
and audit.

## 4. Global semantics

`proof/p5b/global-semantics.json` v1: 2 proven families; topic-family map;
spot-before-overlay tiebreak (tie-only); R-ABSORB-TERMINAL (stand-aside absorbs
all branch effects); R-NO-EVIDENCE; dependency DAG (crowd-timing depends on
move-reality + structure-direction; dislocation depends on move-reality);
terminal outcome classes (thin-artifact, breakdown, mirage); 4 firing templates
(T-REALITY, T-STRUCT, T-CROWD, T-DISLOC) with factual applicability clauses and
per-action effect tables; T-UNRESOLVED fallback. All scenario-independent.

## 5. Compiler approach

Structured semantic compiler (`proof/p5b/compiler/compile.js`): match templates
to facts, compute branch effects against current read/action (terminal
absorption), pass through prior settlements, derive prunes/moots from the global
DAG + terminal flags, emit P5A-schema packages with derivation traces. Question
ids encode the documented tiebreak. The FROZEN P5A kernel runs unmodified on
generated packages. No model endpoint used (same environment constraint as P5A:
no safe programmatic access); P5B therefore passes on the structured compiler
per the brief's allowance. Hybrid-with-model remains a P6 production option, not
a P5B requirement.

## 6. Generated semantics

12/12 base packages contain the decision-relevant topics with effect-resolved
branches (e.g., B06b's crowding branches both collapse to stand-aside via
R-ABSORB-TERMINAL, producing the skip without any hand label). Derivation logs
name template + facts + effect rule per question.

## 7. Holdouts (post-freeze, compiler untouched — hashes verified identical)

H-A (B01 + healthy book/spread + extreme funding): SPOT-FIRST flips to
POSITIONING-FIRST. H-B (fully-checked evening + new extreme print): STOP flips
to RESEARCH positioning. H-C (B03 + exit-now action): positioning-first with
exit-favoring branches (crowded→exit-now, calm→wait). All three predicted in
oracle BEFORE running; all three pass 9/9 with zero SCF. No global/compiler edit
after freeze (SHA256 match, sec 9).

## 8. Reversals

Path: B02 spot-first vs B05 positioning-first (same capabilities, state differs).
Skip: B06a RESEARCH positioning vs B06b SKIP positioning (same path, read differs
via terminal absorption). Stop: B07a CONTINUE (open event hinge) vs B07b STOP
(all settled). No scenario-specific dependency configuration anywhere.

## 9. Cannot-resolve

B09: T-UNRESOLVED fires (nothing else matches, read undecided, data missing) →
CANNOT_RESOLVE with missing families named. B10: unclear action → CLARIFY. No
fake stance.

## 10. Results

Base 12/12 fully clean (SA1-SA8, SA10 9/9, zero SCF). Holdouts 3/3 clean.
SA9 holdout behavior confirmed on all three mutations. One documented oracle
correction: B10 expected skips emptied (kernel CLARIFY path emits no skips by
construction; expectation was spec error). Original oracle hash preserved below;
correction history in git.

## 11. Critical failures

SCF-1/2/3 absent (audit + hashes). SCF-4 absent (6 spot-first, 5 perp-first,
3 terminal/abstain across 15). SCF-5/6/7/8 absent. No recurring issues.

## 12. What P5A proved (unchanged, historical)

Kernel conditional on declared semantics: selection, ordering, sequential
update, safe skip/stop, abstention, missing-data safety, inspectability,
baseline advantage. Remains valid evidence for the calculus itself.

## 13. What P5B proved

A reusable, inspectable semantic layer derives sufficient structured decision
relationships (questions, branches, effects, prunes, moots) from normalized
factual state for the P5A kernel to operate with zero per-scenario answer
encoding — including terminal absorption, tiebreaks, prior settlements, and
action-conditioned effects, verified on frozen holdouts.

## 14. What remains unproven

Production English parsing; final model choice/prompts; live data
normalization; in-hours behavior; composed-loop latency; MCP-content paths.
(P6/P9/P10/P12 ownership.)

## 15. Final P5 recommendation

PASS (P5A conditional proof + P5B acquisition proof jointly satisfy the gate).
Phase stays BUILDING; Director marks PASS.

## 16. P6 direction

HYBRID CANDIDATE RECOMMENDED (unchanged): structured kernel as selection/skip/stop
authority; model layer for NL extraction, uncertainty proposal, semantic mooting
of novel confirmations, prose. P5B adds the semantic-compiler pattern as a third
proven element for P6 to evaluate.

## 17. Hashes

Oracle pre-run: 7A3BC200CC51F796B6794EBBD41543227318358BAB55C2B22BAD3B294029ECE5.
B10 correction applied after (spec error, documented here + git history).
Freeze (pre-holdout): compile.js F462E6A5A74D0CEF3D0219933E480FA6694D9D2FF7710AAE7AC73AAAD8E530AF;
global 2F9506BA3FF805DDDA88375E5D993794894EB570B5AEB9D701EAC1CD175A69CA;
post-holdout re-hash identical.

## 18. Evidence files

`proof/p5b/global-semantics.json`; `proof/p5b/compiler/compile.js|run.js|evaluate.js`;
`proof/p5b/raw/` (15); `proof/p5b/packages/` (15 generated); `proof/p5b/expected/expected.json`;
`proof/p5b/runs/` (base 15 + sim.json); `proof/p5b/reports/eval-base.json`.
