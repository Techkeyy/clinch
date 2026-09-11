# CLINCH â€” Project State

## 1. Identity & Context
- **Project Name:** CLINCH
- **Hackathon:** Bitget AI Â· Genesis Season 2
- **Intended Track:** AI Trading Desk
- **Intended Submission Lane:** Open Theme
- **Current Phase:** P1 Hackathon Onboarding
- **Current Phase Status:** BUILDING
- **Current Overall Product Status:** BUILDING
- **Last Verified Timestamp:** 2026-09-11T23:11:38+01:00
- **P1 Evidence:** `P1_HACKATHON_ONBOARDING.md` (researched 2026-09-11)

---

## 2. Product Concept â€” The Decision Hinge

Most AI trading research tools attempt to gather every available piece of market data, overwhelming the trader with unfocused summaries.

**CLINCH** takes the opposite approach by identifying:
> *"What is the most important unanswered question that could actually change this trader's decision?"*

It targets that single uncertainty ("the Decision Hinge"), executes real research using Bitget capabilities, updates the decision state, determines the next critical unknown if one remains, deliberately skips research paths that cannot alter the conclusion, and halts when additional research has diminishing value.

**Core Value Proposition (provisional; architecture locked only in P6 after P5 evidence):**
- **Hinge Evaluation (candidate, not locked):** CLINCH's Decision Hinge behavior must be stable, inspectable, reproducible enough to trust, and testable against controlled scenarios. P5 determines what combination of model reasoning, structured rules, deterministic scoring, or hybrid logic satisfies that requirement. Candidate hybrid: a model may identify hypotheses, evidence, or unresolved questions; structured/deterministic logic may score whether information could change the action. Exact division of responsibility is intentionally unresolved until P5.
- **Auditable Research Brief:** Transparent summary showing current stance, evidence found, what was checked, what was skipped and why, and what future data would invalidate the stance.
- **Human in the Loop:** The trader remains the final decision-maker. CLINCH is an intelligent research copilot, NOT an autonomous execution bot.

---

## 3. Locked Core User Journey (15 Steps)

1. **User opens CLINCH:** Clean, accessible interface loads instantly.
2. **No Crypto Wallet Required:** Core product never prompts for a Web3 wallet connection.
3. **No Bitget Account Required:** Core CLINCH must be usable without the user connecting a wallet or supplying a Bitget exchange account. P1/P4 will verify the official authentication model required between CLINCH's backend and Bitget services.
4. **Natural Language Input:** Trader describes their trading dilemma (e.g. *"rNVDA fell about 4% this weekend. I'm considering buying the dip."*).
5. **Entity & Intent Extraction:** CLINCH identifies the target asset, intended trade action, and core uncertainty.
6. **Market Context Retrieval:** CLINCH queries live Bitget market feeds for baseline price, volume, and volatility.
7. **First Decision Hinge Identification:** CLINCH determines the highest-leverage unanswered question.
8. **Research Capability Selection:** CLINCH selects the exact Bitget research tool/feed best equipped to resolve that hinge.
9. **Live Research Execution:** Real research call is executed against live data.
10. **Evidence Presentation:** CLINCH presents structured findings with clear evidence.
11. **Decision State Update:** The system updates the decision state.
12. **Next Hinge, Skip, or Halt:** CLINCH determines whether another hinge exists, explicitly skips irrelevant checks with documented rationale, or stops if the decision is settled.
13. **Comprehensive Research Brief Generated:** Output provides:
    - Current research stance (e.g., Bullish / Bearish / Stand Aside)
    - Core rationale
    - Key empirical evidence
    - Completed checks
    - Skipped checks and why they were skipped
    - Residual uncertainties
    - Invalidation triggers (what future events would alter the view)
14. **Human Decision:** Trader takes informed action.
15. **Truthful Session Recovery:** Persisted sessions reload cleanly across browser refresh or return.

---

## 4. Wallet vs. Account Integration Rule

### Core CLINCH (Strictly Locked)
- **Zero Web3 Wallet Connection:** No MetaMask, Bitget Wallet, or private key prompt.
- **Zero Mandatory Exchange Credentials:** Core CLINCH must be usable without the user connecting a wallet or supplying a Bitget exchange account. P1/P4 will verify the official authentication model required between CLINCH's backend and Bitget services.

### Optional Later Personalization (Phase P14 Only)
- If P14 is authorized and Bitget APIs support read-only exchange account data (e.g., positions, margin mode):
  - Requires explicit user opt-in.
  - Least privilege: strictly read-only access (no withdrawal, no order placement permissions).
  - Core product must remain 100% usable if account connection is declined or absent.

---

## 5. Current Assumptions, Unknowns, and Blockers

### Known Assumptions
1. [PARTLY CONFIRMED BY P1] Bitget market-data capabilities needed for the Decision Hinge flow are reachable for CLINCH's backend without the user supplying exchange credentials: bitget-signal skills (no key), UTA market verb (16 public reads, live discover 2026-09-11), Reality ticker/candles/instruments (public per Trading Guide). Reality depth/fills access is [CONFLICT], P4 must test per endpoint class.
2. [CONFIRMED BY P1 S2 READS] CLINCH lane: AI Trading Desk Open Theme (S2 guide: Open Theme in every track, 2 winners/track x 500 USDT; Track 3 = NL research workbench, human-final, Demo + 1 research task, no execution). Deadline 2026-09-21 (UTC+8 window; cutoff hour UNKNOWN, submit early).
3. [CONFIRMED BY P1] Windows host carries Git 2.53.0, Node v24.14.0 (20+ required), npm 11.9.0 with registry access, Python 3.14.3 (pandas/numpy missing, deferred to P4), Docker 29.7.2. bgc 3.0.0 smoke-tested. No upgrades needed.

### Unresolved Questions (P1 outcome 2026-09-11)
1. [PARTLY OPEN] S2 cutoff hour on 9/21 (date + UTC+8 window CONFIRMED; hour unpublished - submit early), TBD links (voting/X posts), judges full list. P25 re-verifies all.
2. [RESOLVED BY P1] Agent Hub (SDK 3.3.0 / CLI 3.0.0 / MCP 3.3.0 / skill 3.2.1 / installer 3.0.0) + bitget-signal 1.2.0 (5 skills, crypto-only, no key, third-party MCP hostname flagged). See P1 doc sections 9-11.
3. [PARTLY OPEN] S2 license/originality/judging rules UNKNOWN (S1: public repo + runnable README, holistic unweighted judging). S2 video duration/host UNKNOWN (S1: max 3 min, conditional).
4. [NEW - for Director] S2 portal found and verified; cutoff hour + TBD posts + judges list remain for P25. P2 may proceed on the CONFIRMED AI Trading Desk Open Theme lane.

### Active Blockers
- None.
