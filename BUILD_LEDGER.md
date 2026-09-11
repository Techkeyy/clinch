# CLINCH â€” Master Build Ledger

## Project Overview
- **Product Name:** CLINCH
- **Hackathon:** Bitget AI Â· Genesis Season 2
- **Intended Track:** AI Trading Desk (Submission Lane: Open Theme)
- **Concept:** Decision Hinge Engine for Trading Decisions
- **Current Overall Status:** BUILDING
- **Current Active Phase:** P0 â€” Director Lock

---

## State Terminology Standards

### Allowed Phase States
- `NOT STARTED`: Phase has not begun.
- `BUILDING`: Active implementation or execution of phase tasks.
- `COMPONENT PROVEN`: Isolated component verification completed.
- `INTEGRATION PROVEN`: Verified working against real external systems and dependencies.
- `BLOCKED`: Work cannot proceed due to an explicit blocker or dependency.
- `UAT READY`: Ready for user acceptance testing / review.
- `UAT PASS`: Passed user acceptance testing criteria.
- `PASS`: Phase objectives completely verified, auditable, and formally locked.

### Allowed Product States
- `BUILDING`: Development and verification phases active.
- `UAT READY`: End-to-end user testing ready across all promised flows.
- `RELEASE READY`: Deployed and verified in production environment.
- `SUBMISSION READY`: Documentation, submission package, and compliance verified.
- `FINISHED`: Absolute final acceptance achieved.

---

## Master Build Ledger (P0 â€“ P27)

| Phase | Name | Status | Purpose | Pass Condition | Blockers / Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P0** | **Director Lock** | PASS | Establish the auditable project foundation, control ledger, skill mappings, and authoritative source registry. | All control files created, skills verified, local git repo initialized, zero product code written, clean tree. | Local skills inspected; repo initialized; control files created. |
| **P1** | **Hackathon Onboarding** | NOT STARTED | Verify official Bitget hackathon rules, dates, tracks, submission requirements, and environment readiness. | Official rules, track details, and toolchain smoke checks verified against primary sources. | Pending P0 Director approval. |
| **P2** | **Product Understanding** | NOT STARTED | Define the complete product mental model, Decision Hinge mechanics, core user journey, and non-goals. | Clear plain-language product specification, magic moment, and load-bearing assumptions documented. | Pending P1 completion. |
| **P3** | **Scope Lock** | NOT STARTED | Strictly define MVP boundaries, non-negotiable features, and cut criteria. | Scope document locked with explicit cut list, MVP boundary, and no speculative scope creep. | Pending P2 completion. |
| **P4** | **Bitget Capability Proof** | NOT STARTED | Prove live access and payload shapes for required Bitget public market data, research skills, or Agent Hub APIs. | Live `doctor`-style call proofs returning verified payload structures without auth mocks. | Pending P3 completion. |
| **P5** | **Hinge Feasibility Gate** | NOT STARTED | Prove feasibility of identifying the critical unanswered question that changes a trader's decision. | Deterministic decision-state evaluation tested against real market scenarios. | Pending P4 completion. |
| **P6** | **Architecture Lock** | NOT STARTED | Formulate technical pipeline, module boundaries, data flow, deterministic decision core, and error boundaries. | Architecture document approved with strict module-by-job separation and offline fixture strategy. | Pending P5 completion. |
| **P7** | **Security & Trust Design** | NOT STARTED | Specify trust boundaries, public-by-default access, read-only account constraints, and credential handling. | Trust model verified: no private keys requested, no wallet needed, API keys guarded, zero leakage. | Pending P6 completion. |
| **P8** | **UX + Design Blueprint** | NOT STARTED | Design human-first, uncluttered interface adhering to veritable-ui-design with the four states and no long dashes. | Design blueprint locked with typography, token system, 4 states (loading/empty/success/error), and 90s journey. | Pending P7 completion. |
| **P9** | **Product Foundation** | NOT STARTED | Set up minimal, clean application runtime, directory structure, deterministic state primitives, and test harness. | Application brings up with one command, test runner passes, clean baseline without dead scaffolding. | Pending P8 completion. |
| **P10** | **Bitget Data Layer** | NOT STARTED | Implement resilient data ingestion clients for Bitget public market feeds, orderbook, ticker, and analytics. | Data layer fetches, validates, and normalizes live Bitget data with graceful error fallbacks. | Pending P9 completion. |
| **P11** | **Research Layer** | NOT STARTED | Implement research executors that query specific Bitget capabilities targeted to candidate decision hinges. | Targeted research modules execute against live endpoints and produce structured evidence. | Pending P10 completion. |
| **P12** | **Hinge Engine** | NOT STARTED | Build the deterministic Decision Hinge engine that selects the next question, skips irrelevant checks, or halts. | Engine passes unit test matrix with complex decision trees, stopping criteria, and skip rationale. | Pending P11 completion. |
| **P13** | **Complete Core Loop** | NOT STARTED | Connect UI to Hinge Engine and Bitget Data/Research layers for the full end-to-end user journey. | User inputs query -> hinge identified -> research performed -> brief rendered in UI with clear rationale. | Pending P12 completion. |
| **P14** | **Optional Bitget Account Personalization** | NOT STARTED | Provide optional, read-only Bitget exchange account context (least privilege) without breaking core unauthenticated use. | Optional account connection integrates safely; core product remains 100% functional without connection. | Pending P13 completion. |
| **P15** | **Persistence & Recovery** | NOT STARTED | Persist research sessions, enable clean page refreshes, and support truthful session recovery. | Refreshed browser resumes active or completed research brief truthfully without corrupted state. | Pending P14 completion. |
| **P16** | **Edge + Validation** | NOT STARTED | Exercise adversarial inputs, network disruptions, rate limits, malformed market data, and unexpected user queries. | Adversarial test suite passing; all 4 states gracefully handled across all user flows. | Pending P15 completion. |
| **P17** | **Product Audit** | NOT STARTED | Execute mechanical, repository, and claim-versus-reality audit following `project-audit` skill. | Zero leftover debug statements, clean linters/tests, every claim in docs matches running code. | Pending P16 completion. |
| **P18** | **Production Deployment** | NOT STARTED | Deploy application to production hosting with continuous availability and verified HTTPS access. | Public live URL accessible, zero local-only assumptions, verified functional in production environment. | Pending P17 completion. |
| **P19** | **Clean-User E2E** | NOT STARTED | Execute complete user journey from a clean browser/device with zero cached state or developer tooling. | Cold user completes full 90-second workflow from landing to final research brief without assistance. | Pending P18 completion. |
| **P20** | **Owner Manual UAT** | NOT STARTED | Director / Owner conducts interactive user acceptance testing against all functional criteria. | Owner approves all product flows, UX clarity, decision output quality, and performance. | Pending P19 completion. |
| **P21** | **Failure / Recovery UAT** | NOT STARTED | Test recovery from interrupted requests, expired sessions, Bitget API degradations, and invalid symbols. | System gracefully recovers, displays human errors, and preserves user input across failure modes. | Pending P20 completion. |
| **P22** | **README + Evidence** | NOT STARTED | Produce comprehensive, honest README following `perfect-readme` with live links, architecture, and adversarial table. | README complete with verified test counts, runnable copy-paste quickstart, proof links, and no em dashes. | Pending P21 completion. |
| **P23** | **Submission Package** | NOT STARTED | Assemble all hackathon submission metadata, track categorization, repo links, live demo links, and descriptions. | All submission fields drafted, verified against official hackathon criteria, and double-checked for completeness. | Pending P22 completion. |
| **P24** | **Demo Video** | NOT STARTED | Record concise, structured 2-3 minute demo video demonstrating problem, product, magic moment, and live Bitget proof. | Video uploaded, accessible publicly, audio/visual verified, strictly showing real running product. | Pending P23 completion. |
| **P25** | **Final Compliance Pass** | NOT STARTED | Audit entire submission package against all Bitget AI Genesis Season 2 rules, restrictions, and rubrics. | 100% compliance with track rules, open-source requirements, sponsor criteria, and deadlines. | Pending P24 completion. |
| **P26** | **Submission Lock** | NOT STARTED | Freeze codebase, tag final release commit, and formally submit project on official hackathon platform. | Submission confirmed on platform before deadline with working URLs and confirmed receipts. | Pending P25 completion. |
| **P27** | **Absolute Final Acceptance** | NOT STARTED | Post-submission verification of repository accessibility, live deployment stability, and video link playback. | Clean outsider verification of submitted URLs, public repo, and live deployment. Product marked FINISHED. | Pending P26 completion. |
