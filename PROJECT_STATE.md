# CLINCH â€” Project State

## 1. Identity & Context
- **Project Name:** CLINCH
- **Hackathon:** Bitget AI Â· Genesis Season 2
- **Intended Track:** AI Trading Desk
- **Intended Submission Lane:** Open Theme
- **Current Phase:** P0 â€” Director Lock
- **Current Phase Status:** BUILDING
- **Current Overall Product Status:** BUILDING
- **Last Verified Timestamp:** 2026-09-11T16:52:00+01:00

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
1. Bitget market-data capabilities needed for the Decision Hinge flow are reachable for CLINCH's backend in a form usable for the core experience without the user supplying exchange credentials — TO VERIFY IN P1/P4 (exact endpoints, public vs service-authenticated, payload shapes).
2. The hackathon accepts submissions under the AI Trading Desk / Open Theme track that focus on intelligent pre-trade decision support.
3. Windows host machine contains standard Node.js and Git toolchains capable of local development and deployment.

### Unresolved Questions (To be resolved in P1)
1. Exact submission deadline date, time, and timezone on the official Bitget hackathon portal.
2. Specific interfaces and capabilities exposed by Bitget Agent Hub and Bitget AI Skills.
3. Precise open-source license requirements and judging rubric weighting.

### Active Blockers
- None.
