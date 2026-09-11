# CLINCH — Local Skills Registry

This registry records the exact locations, operational scope, target phases, and core governing rules of the required local skills located in `C:\Users\HomePC\Desktop\skill\`.

---

## Registered Local Skills

### 1. `hackathon-onboarding`
- **Skill Name in YAML:** `hackathon-onboarding`
- **Resolved Local Path:** `C:\Users\HomePC\Desktop\skill\hackathon-onboarding\SKILL.md`
- **Primary Purpose:** Authoritative ecosystem and hackathon rule discovery, judging rubric extraction, deadline verification with timezone, and clean environment verification.
- **Applicable Phase(s):**
  - **P1**: Hackathon Onboarding
  - **P25**: Final Compliance Pass
- **Key Rules for CLINCH:**
  - Understand before installing; verify before declaring ready.
  - Classify every hackathon rule as **Confirmed** (official link), **Inferred**, or **Unknown**. Never guess rules or deadlines.
  - Audit developer environment and execute real smoke tests before product construction.

---

### 2. `project-understanding`
- **Skill Name in YAML:** `project-understanding`
- **Resolved Local Path:** `C:\Users\HomePC\Desktop\skill\project-understanding\SKILL.md`
- **Primary Purpose:** Formulate a rock-solid mental model of the product in plain language before writing any code: actors, user journey, behind-the-scenes machinery, magic moment, and load-bearing assumptions.
- **Applicable Phase(s):**
  - **P2**: Product Understanding
  - **P3**: Scope Lock
- **Key Rules for CLINCH:**
  - "If you cannot explain the project simply, you do not understand it well enough to build it."
  - **Purpose first, technology second**: Classify all technical elements as *Load-bearing*, *Important*, *Convenience*, or *Decorative*. Cut decorative complexity.
  - Identify the single load-bearing assumption to be proven before building outward.
  - Define explicit non-goals to prevent scope creep.

---

### 3. `build-process`
- **Skill Name in YAML:** `build-process`
- **Resolved Local Path:** `C:\Users\HomePC\Desktop\skill\build-process\SKILL.md`
- **Primary Purpose:** Disciplined engineering execution from locked MVP to reproducible, demoable product; derisks builds by attacking the hardest component first and validating integrations against reality.
- **Applicable Phase(s):**
  - **P4 – P16**: Capability proof, Hinge feasibility, Architecture, Data layers, Hinge engine, Core loop, and Edge validation.
- **Key Rules for CLINCH:**
  - Build the risky core first (the Decision Hinge engine) and prove it before plumbing.
  - **Deterministic core, optional intelligence**: Rules decide; LLMs narrate/polish.
  - **Verify against reality**: Every integration gets a `doctor` self-check against live endpoints.
  - **Four states on every flow**: Loading, Empty, Success, and Error.
  - Ninety-second test: Ensure cold users can reach core value in ~90 seconds.

---

### 4. `design-skill`
- **Skill Name in YAML:** `veritable-ui-design`
- **Resolved Local Path:** `C:\Users\HomePC\Desktop\skill\design-skill\SKILL.md`
- **Primary Purpose:** Product-tailored UI/UX design and implementation with clear typography tokens, responsive layouts, intuitive actions, and zero generic template artifacts.
- **Applicable Phase(s):**
  - **P8**: UX + Design Blueprint
  - **P13**: Complete Core Loop UI
  - **P16**: Edge + Validation
  - **P19**: Clean-User E2E
- **Key Rules for CLINCH:**
  - The product determines the interface, not the template.
  - **No long dashes**: Zero en-dashes or em-dashes in any user-facing copy, headers, or buttons.
  - Progressive revelation: Value visible in the first 5–15 seconds; complete core loop within 90 seconds.
  - High readability: 14px+ readable body type, high contrast, clean component separation without excessive card-ification.

---

### 5. `project-edge`
- **Skill Name in YAML:** `project-edge`
- **Resolved Local Path:** `C:\Users\HomePC\Desktop\skill\project-edge\SKILL.md`
- **Primary Purpose:** Elevate a functional build into a winning hackathon submission by systematically crossing off rubric requirements, differentiating against alternatives, and proving adversarial robustness.
- **Applicable Phase(s):**
  - **P16**: Edge + Validation
  - **P23**: Submission Package
  - **P24**: Demo Video
  - **P25**: Final Compliance Pass
- **Key Rules for CLINCH:**
  - Treat the judging rubric as a flat yes/no checklist backed by verifiable evidence.
  - Own a distinct, sharp lane: Decision Hinge reasoning over generic LLM data aggregation.
  - Include adversarial testing: Show how CLINCH handles malformed queries, ambiguous market data, and stops unproductive research.
  - Fill all submission and feedback fields thoroughly.

---

### 6. `audit-skill`
- **Skill Name in YAML:** `project-audit`
- **Resolved Local Path:** `C:\Users\HomePC\Desktop\skill\audit-skill\SKILL.md`
- **Primary Purpose:** Full repository hygiene, mechanical lint/test validation, and claim-versus-reality verification before public release.
- **Applicable Phase(s):**
  - **P17**: Product Audit
  - **P25**: Final Compliance Pass
  - **P26**: Submission Lock
- **Key Rules for CLINCH:**
  - **"If a document states a fact, that fact is a test case."**
  - Zero debug leftovers (`TODO`, `FIXME`, `console.log`, temp files).
  - Verify every documented command, test count, endpoint, and URL against the live system.
  - Ensure zero secrets or unnecessary build artifacts exist in Git history.

---

### 7. `perfect-readme`
- **Skill Name in YAML:** `perfect-readme`
- **Resolved Local Path:** `C:\Users\HomePC\Desktop\skill\perfect-readme\SKILL.md`
- **Primary Purpose:** Construct an authoritative, highly credible README that convinces judges and users of product value within five minutes.
- **Applicable Phase(s):**
  - **P22**: README + Evidence
  - **P23**: Submission Package
- **Key Rules for CLINCH:**
  - **Proof before prose**: Top link bar with live site, demo video, and real output samples.
  - Problem-first opening: Quote the real trader's uncertainty before showing architecture.
  - Numbered pipeline describing actions, mechanisms, and concrete outputs.
  - Copy-paste runnable quickstart including health check (`doctor`) command.
  - Adversarial "How I tried to break it" table detailing edge cases, blind spots, and invariants.
