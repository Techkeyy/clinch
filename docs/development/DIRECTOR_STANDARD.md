# CLINCH — Director Standard & Finished-Product Governance

## 1. The Master Completion Standard

A finished product is one where a normal intended user can open the real deployed CLINCH application, complete the entire promised workflow through the normal product interface, have the real underlying systems perform the claimed work, recover appropriately from ordinary failures or interruptions, receive the correct result, and do all of this without the builder secretly completing the workflow through scripts, terminals, manual API calls, database edits, or hidden infrastructure.

---

## 2. What Does NOT Constitute Completion

Do not confuse any of the following with product completion:
- **Code exists:** Source files in a repository do not prove a functional system.
- **Tests pass:** Automated test suites test specific assertions, not total product reality.
- **Frontend renders:** Visual components on a screen do not mean data flows correctly.
- **API returns 200:** HTTP success codes can return empty or malformed payloads.
- **Individual integration works:** Isolated endpoint calls do not equal an end-to-end user loop.
- **Backend works:** Headless services without frontend connection leave the user with nothing.
- **Local demo works:** "Works on my machine" fails on clean environments and remote deployments.
- **README says it works:** Prose documentation is not execution proof.
- **Mocks work:** Mocked fixtures verify logic but do not prove external compatibility.
- **One test account works:** Fragile, hardcoded credentials that fail for any other user.
- **Builder says PASS:** Unverified claims without verifiable evidence are disallowed.

---

## 3. Governing Engineering & Build Rules

### A. Real User Journey
- The primary user journey must be complete and reachable in ~90 seconds from arrival to value.
- No crypto wallet connection is required for core use.
- No Bitget exchange account connection is required for core use.
- No user-supplied Bitget exchange API credentials are required for the core experience.
- Core CLINCH must be usable without the user connecting a wallet or supplying a Bitget exchange account. P1/P4 will verify the official authentication model required between CLINCH's backend and Bitget services.

### B. Real Integrations & Truthful State
- External integrations must talk to live Bitget APIs / services unless running in explicit, clearly labeled offline fixture test modes.
- Never fake success in the UI. A UI showing a confirmation for something that did not happen is unacceptable.
- Never hide mocks behind production-looking UI or claim an integration worked when a fallback was secretly used.
- When an external call fails, handle the failure transparently, translate machine errors to plain human language, and allow recovery.

### C. UI & UX Standards (`veritable-ui-design`)
- Every user-facing flow must implement all four fundamental states:
  1. **Loading**: Clear progress indication of what work is occurring without freezing the UI.
  2. **Success**: Unmistakable confirmation of what changed, what was found, and what comes next.
  3. **Empty**: Clear explanation of why no data is present and actionable steps to begin.
  4. **Error**: Plain-language description of what failed, what remains safe, and how to retry.
- **No long dashes**: Never use em dashes or en dashes in visible UI text. Use commas, colons, or concise phrasing.
- Typography, contrast, and layout must remain comfortable, responsive (desktop & mobile), and accessible.
- Avoid default generic hackathon templates (no gratuitous gradients, glowing orbs, decorative pills, or fake activity feeds).

### D. Architectural Simplicity & Decision Hinge Trust Properties (Provisional until P5/P6)
- Keep architecture simple and modular (one clear job per stage/module).
- CLINCH's Decision Hinge behavior must be stable, inspectable, reproducible enough to trust, and testable against controlled scenarios. P5 determines what combination of model reasoning, structured rules, deterministic scoring, or hybrid logic satisfies that requirement. P6 locks the resulting architecture only after P5 evidence exists.
- Candidate hybrid (NOT locked): a model may identify hypotheses, evidence, or unresolved questions; structured/deterministic logic may score whether information could change the action. The exact division of responsibility is intentionally unresolved until P5.
- Do not lock the LLM as purely narrative unless P5 proves that is the best architecture. Do not mandate deterministic logic everywhere unless P5 evidence requires it.
- Never over-engineer, add unnecessary defensive bloat, or introduce speculative abstractions.

### E. Security & Least Privilege
- Zero credentials, secret keys, or private environment variables committed to git.
- If optional Bitget exchange account context is added (Phase P14), it must be:
  - Strictly optional (core product works without it).
  - Least privilege (read-only queries).
  - Never requesting withdrawal, transfer, or execution permissions.
- Public wallet keys vs private keys vs exchange API keys must be strictly handled with appropriate trust boundaries.

### F. Codebase & Repository Hygiene (`project-audit`)
- Zero leftover debug statements (`console.log`, `TODO`, `FIXME`, temporary debug scripts) in release commits.
- Git repository must remain clean, lightweight, and free of accidental build artifacts or large blobs in history.
- Working tree must be clean with all dependencies and environment variables documented.

### G. Documentation Accuracy (`perfect-readme` & `project-edge`)
- **Rule: If a document states a fact, that fact is a test case.**
- Test counts, module tables, endpoint lists, and sample outputs in the README must match actual project output exactly.
- Command examples in documentation must be copy-paste runnable.
- Clearly document known limitations and non-goals; do not pretend unbuilt features exist.

### H. Hackathon & Submission Compliance (`hackathon-onboarding`)
- Adhere strictly to all Bitget AI Genesis Season 2 official guidelines, track criteria, and deadlines with timezone.
- Video demonstrations must showcase the real deployed application solving the stated problem.
- Clean-user E2E and Owner UAT verification are mandatory before declaring release or submission readiness.

---

## 4. Standardized Status Terminology

### Phase States (Strict Enumeration)
1. `NOT STARTED`
2. `BUILDING`
3. `COMPONENT PROVEN`
4. `INTEGRATION PROVEN`
5. `BLOCKED`
6. `UAT READY`
7. `UAT PASS`
8. `PASS`

### Overall Product States (Strict Enumeration)
1. `BUILDING`
2. `UAT READY`
3. `RELEASE READY`
4. `SUBMISSION READY`
5. `FINISHED`

No alternative or improvised status terms are permitted in any project control files.
