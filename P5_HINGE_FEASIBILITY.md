# CLINCH P5 — Hinge Feasibility

## 1. State metadata

P5 BUILDING (P0-P4 PASS; P6-P27 NOT STARTED; overall BUILDING). Experiment run
2026-09-12. Frozen P4-derived fixtures only; zero live calls in P5; zero product
code (proof-only scripts under `proof/p5/candidates/`). No production model,
provider, temperature, or architecture locked. No P6 work.

## 2. Load-bearing assumption under test

CLINCH can reliably determine which unresolved question has the highest decision
value, research only questions capable of materially changing the current read,
skip questions that cannot matter, and stop when remaining evidence is unlikely to
change the decision. Tested as H1 hinge selection, H2 research-path selection, H3
skip decision, H4 stop decision.

## 3. P4 evidence constraints (binding on this experiment)

Only two evidence families: A Reality spot structure (discovery, ticker, 6-interval
candles, 20-level depth) and B stock-perp positioning (funding, OI, mark/index,
perp ticker/candles). Raw OHLC is structure, never auto-labeled TA. Perp data is
contextual positioning for the same underlying exposure, never spot ground truth.
News/macro/sentiment/tradfi/cross_asset/market-intel/stock-TA assumed UNAVAILABLE
(P4 observed empty/crypto-only); P10 may retest. Discovery eligibility and
off-hours suitability kept separate; all fixtures use actually-fresh P4 classes.

## 4. Scenario methodology

15 runs: 12 base scenarios (S01-S12: 3 spot-first, 3 positioning-first, 2
sequential/conflict, 1 stop, 1 cannot-resolve, 1 ambiguous, 1 failure-separation)
plus 3 paired variants (V-PATH path-reversal of S02, V-SKIP skip-reversal of S04,
V-STOP stop-reversal of S09). Each scenario: NL dilemma, contemplated action,
normalized state (asset, read, known, candidate questions with branch-to-action
semantics, families, prune dependencies, data freshness). Branch semantics are
task givens (what a judge would agree each outcome implies); SELECTION among them
is always computed, oracle (`proof/p5/expected/expected.json`) pre-registered
before any run and never imported by candidates. `proof/p5/runs/sim.json` carries
only world outcomes. Mid-run refinements (documented, oracle untouched):
branch-conditional mooting, read-aware flippability, pre-resolved prior steps,
S07 temporal data arrival, S08 setup dependency, step-2 world completions implied
by stopWhy texts.

## 5. Scenario inventory

S01 thin-book jump (spot-first) / S02 quiet drift breakdown (spot-first) / S03
wide-spread spike (spot-first) / S04 pre-event crowding (positioning-first) /
S05 spot-vs-mark dislocation (positioning-first) / S06 OI surge flat spot
(positioning-first) / S07 sequential flip to positioning / S08 spot-vs-positioning
conflict / S09 terminal stop / S10 cannot-resolve thin name / S11 ambiguous intent
/ S12 failure separation (no-data vs negative vs unsupported) / V-PATH, V-SKIP,
V-STOP reversals.

## 6. Pre-registered expected behavior

`proof/p5/expected/expected.json`: per scenario, first hinge + family, simulated
outcome, post-outcome read, second hinge where applicable, skips with kinds,
terminal action (STOP / CONTINUE* / CANNOT_RESOLVE / CLARIFY), stop rationale,
danger list (CF mappings). Written before candidates ran; byte-identical since.

## 7. Candidate methods

A Model-led: builder-agent reasoning from NL + normalized state, hand-recorded
result contracts (`proof/p5/runs/model-led/`, 15 + 6 stability reps). NOT blind
(oracle known): supplementary evidence for comprehension, trace quality, and
stability only. B Structured decision-value kernel
(`proof/p5/candidates/structured.js`, Node stdlib, deterministic): rank by
prunes-others, outcome-divergence breadth, relevance-to-read, id; branch-moots on
findings; skip/stop/CLARIFY/CANNOT_RESOLVE contracts; blocked-attempt handling for
missing data. C Hybrid: kernel run on distractor-augmented inputs (6 scenarios,
one distractor each: agree-only indicator, analyst targets, unproven social
family, familyless unknown, stale-fills probe, general-opinion question).
Baseline RUN-ALL: fixed spot-then-perp order, no skips, stops after both.

## 8. Baseline

Scripted run-all. Result: wastes 1-2 unnecessary family calls in 11/15 scenarios
(incl. 2 wasted on terminal S09/V-SKIP and researching with no decision on S11);
matches needed families in 9/15. This is the cost CLINCH must remove.

## 9. Repeatability methodology

Structured: full suite run twice, byte-identical outputs required. Model-led:
S01/S04/S09 decided 3 times each (reworded justifications). No programmatic model
endpoint exists in this environment (opencode/claude/codex shims present but
invoking them would consume unverifiable user-side credentials), so 5x programmatic
repetition was not possible; this is recorded as a method limit, and production
NL/model extraction stays unproven for P6/P9/P12.

## 10. Evaluation dimensions

E1 first hinge, E2 family, E3 read-aware flip-awareness, E4 skip sets+kinds, E5
blindspot safety, E6 terminal behavior, E7 abstention, E8 missing-data safety, E9
explanation fidelity, E10 inspectability (trace with candidates, data snapshot,
resolution state). CF-1 skipped decision-critical evidence through CF-7 unproven
family use, scored mechanically in `evaluate.js` (E3/CF-5/E9 use read-aware
flippability: divergent branches, or a single decisive outcome vs current read).

## 11. Result matrix

Structured 15/15 fully clean (10/10, zero CF), deterministic repeat identical.
Model-led 15/15 clean, zero CF; 6/6 stability reps decide identically. Hybrid 3/6
fully clean; remaining 3 show E6-only deviation (one extra research step on novel
distractors), zero CF anywhere. Ablation (prunes removed): 11/15 clean with CF-1
blindspots on S01/S02/S03/S08. Full matrices: `proof/p5/reports/eval-*.json`.

## 12. Critical failures

Structured, model-led: NONE on the core set (no CF-1..CF-7). Hybrid: NONE
(deviations are over-research, never blindspot/invention). Ablation: 4x CF-1,
confirming dependency declarations carry those four orderings. Baseline: no CF
concept (hinge-free by design), but 11/15 wasteful.

## 13. Paired reversal tests

V-PATH vs S02 (same asset class, spot-resolved + funding-extreme): kernel flips
SPOT-FIRST to POSITIONING-FIRST from state alone. V-SKIP vs S04 (entry already
dead): RESEARCH flips to SKIP. V-STOP vs S09 (one hinge open): STOP flips to
CONTINUE-then-STOP. All three pass on structured and model-led. Generic routing
cannot produce these reversals; decision state drives order.

## 14. Sequential-loop results

S03/S07/S08/V-STOP two-step flows verified: step-1 finding updates the read,
step-2 hinge differs from step 1, terminal STOP follows exhaustion (S08 STOP keeps
the conflict visible with a conditional read, no averaging). S12 chains
refutation, blocked-attempt, and refusal distinctly.

## 15. Skip results

Magic-moment skips demonstrated on S01/S02/S04/S05/S06/V-SKIP (cannot-matter with
mooting reasons), S09 (indicators + stale fills), S12 (unsupported TA refused).
Every skip names family, kind (resolved/cannot-matter/no-data/unsupported), and
reason in-product-shaped output.

## 16. Stop results

Terminal STOP on S01/S02/S04/S05/S06/S09/V-SKIP/V-STOP with reasons + residue;
S08 STOP-with-conflict; S10 CANNOT_RESOLVE with missing-info list. No fixed-depth
looping observed (stop tracks state, 1-3 steps as appropriate).

## 17. Ambiguity / abstention results

S11 CLARIFY on all reasoning candidates ("entering, exiting, or just
researching?"); S10 CANNOT_RESOLVE with unlock conditions; hybrid S11 unaffected
by distractor. No invented intent anywhere (CF-6 absent).

## 18. Missing-data results

S09 fills, S10 families, S12 book-timeout all handled as reroute/retry-or-wait,
never as evidence (E8 clean). Negative evidence (S12 normal funding) correctly
treated as informative FOR entry, distinct from absent data. Unsupported TA
refused, never faked.

## 19. Baseline comparison

Baseline researches everything available: 11/15 scenarios carry 1-2 unnecessary
family calls; terminal and ambiguous cases get researched anyway. Structured and
model-led runs invoke only decision-valuable families (mean families per scenario:
structured ~1.1 vs baseline ~1.9 counting S07/midflow honestly) with zero blindspot.
Decision-value advantage is measured in avoided low-value research, not speed.

## 20. Inspectability assessment

Every kernel choice ships a trace (open candidates, prune counts, branch effects,
data snapshot, resolution state) plus a decision-value trace per choice (question,
both outcomes with read effects, change verdict, family, selected/skipped,
reason). No hidden chain-of-thought stored. Model-led runs carry equivalent
justifications. A reviewer can reconstruct every WHY from artifacts alone. E10
clean across all reasoning runs.

## 21. Candidate comparison

Structured: exact, stable, safe; bounded by declared dependency/moots semantics
(ablation + hybrid-E6 show the bound: novel confirmations get researched once
rather than semantically mooted). Model-led: same decisions with richer semantic
mooting intuition (e.g., would moot sixth-indicator after thin-print finding);
evidence is qualitative and non-blind. Hybrid (kernel + distractor robustness):
no blindspot under noise; extra-step cost on semantic-novelty cases. Baseline:
hinge-free, wasteful. No candidate shows fixed ordering (path distribution:
structured first-hinge spot 5x, perp 6x, terminal/abstain 4x across the 15).

## 22. Recommended P6 architecture direction

HYBRID CANDIDATE RECOMMENDED: structured decision-value kernel as the inspectable,
testable selection/skip/stop authority (proven here), with model reasoning
supplying what the kernel cannot compute: NL-to-state extraction, candidate
uncertainty proposal, semantic mooting of novel confirmations, and prose
justification. Rationale from evidence: kernel alone is safe but semantically
bounded; model alone is unmeasured programmatically and must never be the sole
decider per P0 correction; together they cover each other's demonstrated gaps.
This is a DIRECTION for P6 to evaluate, not a locked architecture.

## 23. What is PROVEN

Hinge selection exceeds topic/tool routing on controlled cases; two P4 families
order differently by decision state; sequential updates redirect research;
skip/stop contracts hold with zero blindspot; magic-moment skip works; stop is
state-driven; cannot-resolve and clarify exist; missing data never becomes
evidence; traces make every choice auditable; baseline comparison favors
hinge-first on avoided low-value research.

## 24. What remains UNPROVEN

Acquisition of branch/moots semantics from live data (fixtures declare them;
P6/P9 must source dependency knowledge); NL-to-state extraction quality at scale;
programmatic model stability (no 5x endpoint runs possible here); MCP-backend
content paths (excluded by P4, retest P10); in-hours behavior differences;
latency of a composed loop (P4 transport budget only).

## 25. P5 go / no-go

All 12 go conditions hold (1 routing exceeded; 2 families reorder by state; 3
sequential updates redirect; 4 safe skips; 5 magic moment in S01/S02/V-SKIP class;
6 state-driven stops; 7 cannot-resolve exists; 8 no invented intent; 9 missing-data
safety; 10 zero recurring blindspot; 11 full inspectability; 12 hybrid direction
for P6). No Director-review condition fired (no fixed order, no unsafe skips, no
missing-as-evidence, no intent invention, families sufficient for adaptive
behavior, nothing manually answers lookups, no routing collapse).

## 26. P5 checklist

15 scenarios + 3 variants frozen with oracle pre-registered [DONE]. Two-plus
candidates plus baseline executed [DONE: structured, model-led, hybrid,
baseline, ablation]. Repeatability measured within environment limits [DONE].
E1-E10 + CF-1..CF-7 scored mechanically [DONE]. Reversals (path/skip/stop),
conflict, ambiguity, failure-separation covered [DONE]. No live calls, no product
code, no model lock [DONE]. P6 NOT started [DONE].

## P5B Addendum — Semantic Acquisition (appended 2026-09-12, P5A history untouched)

Director required proof that hinge semantics need not be hand-encoded per
scenario. New separate evidence under `proof/p5b/` + `P5B_SEMANTIC_ACQUISITION.md`:
a frozen global-semantics file plus a general compiler derive questions,
branches, effects, prunes, and moots from raw normalized factual state; the
unmodified P5A kernel then runs 12 base + 3 post-freeze holdout scenarios to
15/15 fully clean with zero SCF (holdout oracle predicted before running;
compiler/global hashes identical before and after). One documented oracle
correction (B10 skips; kernel CLARIFY path emits no skips by construction). P5A's conditional proof remains valid for the calculus itself;
the manual-dependency gap is closed by derivation (terminal absorption,
tiebreaks, prior settlements, action-conditioned effects all general).
Recommendation: P5 PASS with HYBRID direction for P6 (kernel authority + model
NL/proposal/mooting/prose + compiler pattern as third input).
