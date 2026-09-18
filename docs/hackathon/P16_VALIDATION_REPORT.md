# CLINCH P16 Validation Report

Date: 2026-09-13
Status: INTEGRATION PROVEN
Harness: `tests/p16-validation.test.ts`

## Executive result

CLINCH was compared with a deliberately simple run-all baseline on 30 frozen controlled scenarios. The corpus contains the 15 P5A scenarios and the 15 P5B semantic-acquisition scenarios. Both policies consume the same frozen fixture state and simulated evidence outcomes.

| Measure | Run-all baseline | CLINCH | Result |
| --- | ---: | ---: | --- |
| Research-family calls | 54 | 25 | 29 fewer calls, 53.7% reduction |
| Unnecessary family calls | 31 | 2 | 29 fewer unnecessary calls |
| Rounds to first actionable evidence | 54 | 22 | 32 fewer rounds in this controlled proxy |
| Terminal contracts | 30/30 | 30/30 | Same pre-registered terminal behavior |
| Explanation contracts | not applicable | 30/30 | Every route had inspectable rationale and skip reasons |
| Blindspots | not applicable | 0/22 eligible | No available decision-critical family was skipped |

The blindspot denominator is 22 because eight fixtures intentionally have no available decision-critical family to research: clarification, already-settled, or unavailable-data cases. They remain in the 30-case terminal and determinism totals.

These measurements demonstrate decision-value behavior on frozen fixtures. They do not claim a wall-clock latency improvement on live Bitget or a completed human comprehension study.

## Controlled comparison

The baseline is the proof repository's run-all policy: fixed order `spot-structure` then `perp-positioning`, call each family whose fixture is marked `fresh`, and stop after the available families. It does not select a hinge, stop early, or explain skips.

CLINCH replays the production `domain/kernel` selection and outcome transition functions. A route call is counted only when the production kernel selects a research family and the scenario provides a simulated outcome. The replay preserves the production skip, stop, clarify, and cannot-resolve actions.

Decision-critical families are pre-registered rather than inferred from the measured call count. For P5A they come from the oracle's first and second family fields. For P5B they come from the compiler-generated question IDs in the frozen simulated outcomes. An available critical family is one whose fixture is marked `fresh`.

The time proxy is the number of research rounds before the first actionable evidence. It intentionally avoids claiming stable network latency from a sub-millisecond pure-kernel replay. The live product still has separate transport and UI verification in the P13 and P15 evidence.

## Frozen corpus

The following files are read-only inputs to the harness. The P5A corpus has 15 scenarios. The P5B corpus has 15 raw semantic cases: `B01-B10` and `H-A-H-C`.

- P5A scenarios: `proof/p5/scenarios/scenarios.json`
- P5A expected outcomes: `proof/p5/expected/expected.json`
- P5A simulated outcomes: `proof/p5/runs/sim.json`
- P5B raw cases: `proof/p5b/raw/` (15 files)
- P5B expected outcomes: `proof/p5b/expected/expected.json`
- P5B simulated outcomes: `proof/p5b/runs/sim.json`

Recorded SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `proof/p5/scenarios/scenarios.json` | `2eb353566bcdef781c17260a86c76595ed45f401c19cdd3570aada4fdd68e562` |
| `proof/p5/expected/expected.json` | `0985689f63b5c992558c6a7044ed13183ecc5b513400445e3e766b7078e3736f` |
| `proof/p5/runs/sim.json` | `7d81c299dd16c2d810819b2fd87c59891f2cf671103dd69d3bf9c9144a257377` |
| `proof/p5b/expected/expected.json` | `b24736a7a6b93b32e8d9743d5d97d066aa128e4a453ff277f7431fffb4c19b5e` |
| `proof/p5b/runs/sim.json` | `1bc1c01eb0b51d6de6cd4ec640a4e7c3e3ed64a2a8420ac3ce167f676f96efd2` |

## Stability and explanation checks

Each of the 30 scenarios was replayed five additional times. Route signatures, selected hinges, selected families, terminal actions, and skip entries remained identical. The 30/30 terminal result is therefore also stable across the repeated deterministic replays.

The explanation contract requires a non-empty reason on every kernel step, a hinge and family for every selected research action, and a non-empty family, kind, and reason for every skip. All 30 scenarios passed this contract. This is a mechanical proxy for the product's ability to explain what matters, what was checked, what was skipped, why it was skipped, and what remains uncertain. It is not a substitute for owner UAT or a statistically powered user study.

## Adversarial matrix

The same harness includes seven adversarial tests:

1. Malformed ticker and depth payloads are rejected before normalization.
2. Invalid input, unsupported route, and HTTP 429 rate-limit envelopes become typed upstream failures.
3. Transport timeout becomes `UPSTREAM_FAILURE`, never evidence.
4. Missing instrument mapping and missing market data do not create a decision.
5. Unexpected or incomplete intent produces `CLARIFY` rather than invented action.
6. Unsupported research families are marked unsupported rather than called.
7. Model-tier failure falls back to deterministic intent extraction.

The full existing suite also covers stale and malformed research, no-data handling, ownership and rate limits, the four UI states, persistence recovery, and mobile browser journeys. The production check is still read-only and human-final: no order execution, wallet, or user Bitget credentials are involved.

## Verification command

```text
npx vitest run tests/p16-validation.test.ts --reporter verbose
```

Observed result: 1 test file passed, 14 tests passed. The controlled comparison and all seven adversarial cases passed.

## Limits and next gate

P16 proves the controlled decision-value and adversarial gates requested by the build ledger. It does not prove production deployment, external Qwen credentials, Neon connectivity, public HTTPS availability, or owner acceptance. Those remain later gates. P17 is the next phase and must audit the repository, claims, security boundaries, visible copy, and release hygiene before any production action.