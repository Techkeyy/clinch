# CLINCH — Authoritative Source Registry

This document establishes the official source categories and primary references for the **Bitget AI · Genesis Season 2** hackathon. 

> **Phase Boundary Note:** P0 defined the taxonomy. P1 (researched 2026-09-11, see
> `P1_HACKATHON_ONBOARDING.md`) verified each entry below. Season 1 facts are
> CONFIRMED; Season 2 items are UNKNOWN - no public official S2 page found.

---

## 1. Hackathon Overview & Platform Sources

| Category | Primary Official Target / URL | Verification Scope for P1 | Verification Status |
| :--- | :--- | :--- | :--- |
| **Official Hackathon Portal** | S1: https://bitget-ai.gitbook.io/hackathon (Bitget AI Team, verified 2026-09-11) - S1 Base Camp May 27-Jun 30 2026, 50,000 USDT, UTC+8 | Hackathon overview, official schedule, organizer statements | [CONFIRMED] S1. S2 portal [UNKNOWN] - gitbook index lists S1 only; bitget.com campaign pages bot-blocked |
| **Submission Platform** | S1: Google Forms via official social/community/registration email (verified 2026-09-11) | Official submission form fields, team limits, required assets | [CONFIRMED] S1 mechanism. S2 platform [UNKNOWN] |
| **AI Trading Desk Track** | No public S2 track spec found (verified 2026-09-11); S1 spec has Trading Agent / Trading Infra / Stock AI Trading + Open Innovation, no AI Trading Desk | Track scope, permissible agent architectures, focus areas | [UNKNOWN] S2. S1 tracks [CONFIRMED] |
| **Submission Deadlines & Timezone** | S1: Jun 25 24:00 UTC+8 (verified 2026-09-11). "September 21" S2 deadline unverified | Exact submission cutoff date, hour, minute, and UTC/local timezone | [CONFIRMED] S1. S2 date/time/timezone [UNKNOWN], nothing invented |
| **Judging Rubric & Weights** | S1: thesis / runnability / completeness / novelty, holistic, NO fixed weights, Bitget final interpretation (verified 2026-09-11) | Exact weighting of technical execution, Bitget integration, originality, UX | [CONFIRMED] S1. S2 rubric [UNKNOWN] |
| **Prize Structure & Eligibility** | S1: 1st 6,600 (all tracks); 2nd 1,500 x3; 3rd 800 x3; Community Impact 500 x3; Participation +50/team; solo ok, teams to 5, UID match (verified 2026-09-11) | Track prize pool, bonus criteria, feedback rewards, payout terms | [CONFIRMED] S1. S2 prizes/stacking/Rising Talent [UNKNOWN] |

---

## 2. Bitget Technical Documentation & Developer Ecosystem

| Category | Primary Official Target / URL | Verification Scope for P1 | Verification Status |
| :--- | :--- | :--- | :--- |
| **Bitget Developer Portal** | https://www.bitget.com/api-doc/ (Bitget, verified 2026-09-11; includes Reality Trading Guide + UTA v3 refs) | Public market data, ticker, orderbook, candlestick, trade streams | [CONFIRMED] current; endpoint-class access partly [CONFLICT] (see Reality row) |
| **Bitget Agent Hub** | https://github.com/Bitget-AI/agent_hub + https://github.com/BitgetLimited/agent_hub (Bitget, verified 2026-09-11); installer @bitget-ai/bitget-agent-installer 3.0.0 (npm, live) | Agent registry, skill interfaces, agent orchestration protocols | [CONFIRMED] SHIPPED. Op count [CONFLICT]: READMEs say 89, architecture.md catalog says 109 |
| **Bitget Research Skills** | https://github.com/Bitget-AI/bitget-signal (Bitget, verified 2026-09-11); @bitget-ai/bitget-signal 1.2.0, MIT; 5 skills macro/market-intel/sentiment/technical/news; backend https://datahub.noxiaohao.com/mcp | Research tools, market sentiment indicators, data aggregators | [CONFIRMED] SHIPPED, crypto-only, no key. Backend attribution [CONFLICT] (third-party hostname vs "maintained by Bitget") |
| **Bitget UTA (Unified Trading Account) API** | UTA v3 via @bitget-ai/bitget-agent-sdk 3.3.0 / CLI 3.0.0 `bgc` (npm + live discover 2026-09-11: 7 domains, 14 tools; market verb public, 16 reads) | Account balance, position modes, margin info, market queries | [CONFIRMED] SHIPPED. Live-call proof deferred to P4 |
| **rToken / Reality Protocol Docs** | Reality Trading Guide (api-doc) + support 2026-06-30 (whitelist) + support 2026-08-11 (fully opened, no whitelist) + academy rToken FAQ 2026-08-26 (L2 book, 30 r/s) - all Bitget, verified 2026-09-11 | Token standards, reality protocol specifications, oracles | [CONFIRMED] product + public ticker/candles. Depth/fills/trading access [CONFLICT], P4 must test per class |
| **API Authentication & Permissions** | agent_hub README module table + agent-skill auth-setup/demo-trading refs (verified 2026-09-11): market verb public; trade/account/funds/loan/tax need user key+secret+passphrase; --read-only/--paper-trading supported | Public endpoints vs authenticated endpoints, read-only permissions | [CONFIRMED] |

---

## 3. Submission Artifact & Compliance Rules

| Category | Requirement Type | Verification Scope for P1 | Verification Status |
| :--- | :--- | :--- | :--- |
| **Repository Requirements** | S1: GitHub must be public with runnable README; all links login-free (verified 2026-09-11). License type / originality / code-age rules not found | License terms, commit history rules, repository visibility | [CONFIRMED] public-only. S2 specifics [UNKNOWN] |
| **Deployment Requirements** | S1: deployment link optional for Infra; demo must be real and runnable (verified 2026-09-11) | Live Application Hosting | [CONFIRMED] S1. S2 live-URL rule [UNKNOWN] |
| **Demo Video Rules** | S1: max 3 minutes; optional unless demo needs login; tweet/YouTube accepted (verified 2026-09-11) | Record a concise demo video that complies with the CURRENT OFFICIAL duration, format, hosting, and content requirements verified during P1 and rechecked during P25 | [CONFIRMED] S1. S2 duration/host [UNKNOWN] |
| **Prohibited Elements** | S1 baseline gates only: UID match, public links, stated thesis, verifiable usage record (verified 2026-09-11) | Plagiarism, closed-source blackboxes, fake API mocks, rule violations | [CONFIRMED] scope found. S2 disqualifiers [UNKNOWN] |

---

## 4. Source Verification Protocol (Governing P1)

When P1 begins, all entries in this registry must be classified using the standard three-tier verification label:
- `[CONFIRMED]`: Verified directly on the official source with timestamp and exact link.
- `[INFERRED]`: Strongly implied by official documentation, but not explicitly stated.
- `[UNKNOWN]`: Information not yet found; documented with exact search paths attempted.
- `[CONFLICT]`: Two current official sources disagree; both preserved, P4 tests reality.

Third-party summaries, blog posts, and secondary aggregator articles are strictly prohibited from serving as authoritative sources.
