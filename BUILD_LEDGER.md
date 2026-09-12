# CLINCH â€” Master Build Ledger

## Project Overview
- **Product Name:** CLINCH
- **Hackathon:** Bitget AI Â· Genesis Season 2
- **Intended Track:** AI Trading Desk (Submission Lane: Open Theme)
- **Concept:** Decision Hinge Engine for Trading Decisions
- **Current Overall Status:** BUILDING
- **Current Active Phase:** P9 Product Foundation

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
| **P0** | **Director Lock** | PASS | Establish the auditable project foundation, control ledger, skill mappings, and authoritative source registry. | All control files created, skills verified, local git repo initialized, zero product code written, clean tree. | Local skills inspected; repo initialized; control files under Director correction review. P0 PASS accepted by Director; P1 authorized. |
| **P1** | **Hackathon Onboarding** | PASS | Verify official Bitget hackathon rules, dates, tracks, submission requirements, and environment readiness. | Official rules, track details, and toolchain smoke checks verified against primary sources. | P1 research in progress (P0 PASS accepted by Director). Evidence: P1_HACKATHON_ONBOARDING.md sections 1-22 (2026-09-11). S2 landing + S2 developer guide direct-read and CONFIRMED (tracks, Open Theme lane, prizes/stacking, judging, submission, 9/21 UTC+8 date). Cutoff hour + TBD links UNKNOWN. Ecosystem live-verified (bgc discover, npm). Conflicts C1-C6 preserved for P4/P25. Required-section map in artifact header. |
| **P2** | **Product Understanding** | PASS | Define the complete product mental model, Decision Hinge mechanics, core user journey, and non-goals. | Clear plain-language product specification, magic moment, and load-bearing assumptions documented. | P2 PASS accepted by Director; P3 authorized. Evidence: P2_PRODUCT_UNDERSTANDING.md (primary segment A, hinge/stop/skip defined, magic moment locked, 4 scenarios, brief, non-goals, assumption locked for P5). |
| **P3** | **Scope Lock** | PASS | Strictly define MVP boundaries, non-negotiable features, and cut criteria. | Scope document locked with explicit cut list, MVP boundary, and no speculative scope creep. | P3 PASS accepted by Director; P4 authorized. |
| **P4** | **Bitget Capability Proof** | PASS | Prove live access and payload shapes for required Bitget capabilities (exact endpoints and auth model to be verified, not assumed public/anonymous). | Live `doctor`-style call proofs returning verified payload structures without auth mocks. | P4 evidence: proof doc + proof/p4, two-path gate PASSED, no go-condition fired. |
| **P5** | **Hinge Feasibility Gate** | PASS | Prove feasibility of identifying the critical unanswered question that changes a trader's decision. | Decision Hinge behavior proven stable, inspectable, reproducible enough to trust, and testable against controlled real-market scenarios. P5 determines what combination of model reasoning, structured rules, deterministic scoring, or hybrid logic satisfies that requirement (candidate hybrid, not pre-locked). | P5 evidence: P5_HINGE_FEASIBILITY.md + proof/p5/ (15 runs: structured 15/15 clean, model-led 15/15, hybrid bounded, HYBRID direction for P6) + P5B: P5B_SEMANTIC_ACQUISITION.md + proof/p5b/ (15/15 incl. 3 frozen holdouts, zero SCF). |
| **P6** | **Architecture Lock** | PASS | Formulate technical pipeline, module boundaries, data flow, Decision Hinge architecture, and error boundaries. | Architecture document approved with strict module-by-job separation and offline fixture strategy. Architecture locked only after P5 evidence exists. | P6 evidence: P6_ARCHITECTURE_LOCK.md (Next.js single deployable + Neon/Drizzle + Qwen-compatible model interface + direct REST adapter; P6 PASS accepted by Director; P7 authorized). |
| **P7** | **Security & Trust Design** | PASS | Specify trust boundaries, core-usable-without-user-credentials rule, read-only account constraints, and credential handling. | Trust model verified: no private keys requested, no wallet needed, no user-supplied exchange credentials for core use, backend-to-Bitget auth model verified in P1/P4, API keys guarded, zero leakage. | P7 evidence: P7_SECURITY_TRUST_DESIGN.md (ownership via owner-cookie hash, CSRF/origin, allowlists, budgets, 30-day retention, SEC-01..15). |
| **P8** | **UX + Design Blueprint** | PASS | Design human-first, uncluttered interface adhering to veritable-ui-design with the four states and no long dashes. | Design blueprint locked with typography, token system, 4 states (loading/empty/success/error), and 90s journey. | P8 evidence: P8_UX_DESIGN_BLUEPRINT.md (guided workbench, Hinge/skip/stop treatments, tokens, copy, wireframes, P9 handoff). |
| **P9** | **Product Foundation** | COMPONENT PROVEN | Set up minimal, clean application runtime, directory structure, decision-state primitives (representation decided in P5/P6, not pre-locked), and test harness. | Application brings up with one command, test runner passes, clean baseline without dead scaffolding. | P9 COMPONENT PROVEN: Next 16.3.5 + React 19.3 + TS 5.9.3 + Zod 4.6.2 + Drizzle 0.45.2 + Vitest 5 (10 tests pass); dev 200, build OK, lint OK, typecheck OK; static fixture workspace; no secrets tracked. |
| **P10** | **Bitget Data Layer** | NOT STARTED | Implement only the real Bitget data capabilities proven necessary by P2-P5 and verified in P4. | Data layer fetches, validates, and normalizes live Bitget data with graceful error fallbacks. Every Bitget integration is load-bearing; no indiscriminate endpoint consumption. | Pending P9 completion. |
| **P11** | **Research Layer** | NOT STARTED | Implement research executors that query specific Bitget capabilities targeted to candidate decision hinges. | Targeted research modules execute against live endpoints and produce structured evidence. | Pending P10 completion. |
| **P12** | **Hinge Engine** | NOT STARTED | Build the Decision Hinge engine (architecture per P5/P6 lock, not pre-locked as purely deterministic) that selects the next question, skips irrelevant checks, or halts. | Engine passes unit test matrix with complex decision trees, stopping criteria, and skip rationale. | Pending P11 completion. |
| **P13** | **Complete Core Loop** | NOT STARTED | Connect UI to Hinge Engine and Bitget Data/Research layers for the full end-to-end user journey. | User inputs query -> hinge identified -> research performed -> brief rendered in UI with clear rationale. | Pending P12 completion. |
| **P14** | **Optional Bitget Account Personalization** | NOT STARTED | Provide optional, read-only Bitget exchange account context (least privilege) without breaking core use without user-supplied credentials. | Optional account connection integrates safely; core product remains 100% functional without connection. | Pending P13 completion. |
| **P15** | **Persistence & Recovery** | NOT STARTED | Persist research sessions, enable clean page refreshes, and support truthful session recovery. | Refreshed browser resumes active or completed research brief truthfully without corrupted state. | Pending P14 completion. |
| **P16** | **Edge + Validation** | NOT STARTED | Prove CLINCH's claimed edge via baseline comparative validation plus adversarial testing. Build a simple baseline AI Trading Desk that blindly runs all available/relevant research paths, then compare CLINCH against that baseline on: decision-critical information found, number of research/tool calls, time to actionable insight, unnecessary research avoided, blindspot rate, Hinge-routing stability, stop-decision stability, user comprehension, and ability to explain what matters, what was checked, what was skipped, why, and what could change the stance. Adversarial testing (malformed inputs, network disruptions, rate limits, malformed market data, unexpected queries; all 4 states) remains required. | Baseline comparative validation plus adversarial test suite passing; no target performance numbers locked in P0. | Pending P15 completion. |
| **P17** | **Product Audit** | NOT STARTED | Execute mechanical, repository, and claim-versus-reality audit following `project-audit` skill. | Zero leftover debug statements, clean linters/tests, every claim in docs matches running code. | Pending P16 completion. |
| **P18** | **Production Deployment** | NOT STARTED | Deploy application to production hosting with continuous availability and verified HTTPS access. | Public live URL accessible, zero local-only assumptions, verified functional in production environment. | Pending P17 completion. |
| **P19** | **Clean-User E2E** | NOT STARTED | Execute complete user journey from a clean browser/device with zero cached state or developer tooling. | Cold user completes full 90-second workflow from landing to final research brief without assistance. | Pending P18 completion. |
| **P20** | **Owner Manual UAT** | NOT STARTED | Director / Owner conducts interactive user acceptance testing against all functional criteria. | Owner approves all product flows, UX clarity, decision output quality, and performance. | Pending P19 completion. |
| **P21** | **Failure / Recovery UAT** | NOT STARTED | Test recovery from interrupted requests, expired sessions, Bitget API degradations, and invalid symbols. | System gracefully recovers, displays human errors, and preserves user input across failure modes. | Pending P20 completion. |
| **P22** | **README + Evidence** | NOT STARTED | Produce comprehensive, honest README following `perfect-readme` with live links, architecture, and adversarial table. | README complete with verified test counts, runnable copy-paste quickstart, proof links, and no em dashes. | Pending P21 completion. |
| **P23** | **Submission Package** | NOT STARTED | Assemble all hackathon submission metadata, track categorization, repo links, live demo links, and descriptions. | All submission fields drafted, verified against official hackathon criteria, and double-checked for completeness. | Pending P22 completion. |
| **P24** | **Demo Video** | NOT STARTED | Record a concise demo video that complies with the CURRENT OFFICIAL duration, format, hosting, and content requirements verified during P1 and rechecked during P25, demonstrating problem, product, magic moment, and live Bitget proof. | Video uploaded, accessible publicly, audio/visual verified, strictly showing real running product. | Pending P23 completion. |
| **P25** | **Final Compliance Pass** | NOT STARTED | Audit entire submission package against all Bitget AI Genesis Season 2 rules, restrictions, and rubrics. | 100% compliance with track rules, open-source requirements, sponsor criteria, and deadlines. | Pending P24 completion. |
| **P26** | **Submission Lock** | NOT STARTED | Freeze codebase, tag final release commit, and formally submit project on official hackathon platform. | Submission confirmed on platform before deadline with working URLs and confirmed receipts. | Pending P25 completion. |
| **P27** | **Absolute Final Acceptance** | NOT STARTED | Final Master Director acceptance gate after submission: all applicable completion gates must remain true, including real core product, real user-facing functionality, real external integration, production deployment, clean-user E2E, failure/recovery, security audit, repository audit, accurate README, owner manual UAT, hackathon compliance, truthful demo, submission materials, and external accessibility (submitted URLs, public repo, live deployment, video playback). | All listed gates verified PASS by clean outsider verification of submitted URLs, public repo, and live deployment. Only then overall state becomes FINISHED. | Pending P26 completion. |
