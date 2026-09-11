# CLINCH — Authoritative Source Registry

This document establishes the official source categories and primary references for the **Bitget AI · Genesis Season 2** hackathon. 

> **Phase Boundary Note:** P0 defined the taxonomy. P1 (researched 2026-09-11, see
> `P1_HACKATHON_ONBOARDING.md`) verified each entry below. S2 landing + S2 developer
> guide direct-read 2026-09-11 (section 22): tracks, Open lane, prizes/stacking,
> judging, submission, 9/21 UTC+8 date CONFIRMED. Cutoff hour + TBD links UNKNOWN.

---

## 1. Hackathon Overview & Platform Sources

| Category | Primary Official Target / URL | Verification Scope for P1 | Verification Status |
| :--- | :--- | :--- | :--- |
| **Official Hackathon Portal** | S2: https://www.bitget.com/activity-hub/hackathon (Bitget, direct-read 2026-09-11: Genesis Season 2, 9/3 launch, 9/21 deadline, 10/8 winners) + S1 gitbook historical | Hackathon overview, official schedule, organizer statements | [CONFIRMED] S2 landing. S1 gitbook historical only |
| **Submission Platform** | S2: Google Form https://forms.gle/GyWZCMCPocgJdJon6 (S2 guide Ch.III-IV, direct-read 2026-09-11); submission = participation, max 2 themes, same UID | Official submission form fields, team limits, required assets | [CONFIRMED] S2 mechanism + fields |
| **AI Trading Desk Track** | S2 guide Ch.IV Track 3 (direct-read 2026-09-11): NL research workbench, human-final, Demo + 1 research task; 5 named sub-themes + Open Theme (2 winners/track) | Track scope, permissible agent architectures, focus areas | [CONFIRMED] S2 spec + Open lane |
| **Submission Deadlines & Timezone** | S2: 2026-09-21, window 9/3-9/21 UTC+8 (S2 guide Ch.I/III, direct-read 2026-09-11). Cutoff hour unpublished | Exact submission cutoff date, hour, minute, and UTC/local timezone | [CONFIRMED] date + UTC+8 window. Hour [UNKNOWN] |
| **Judging Rubric & Weights** | S2 Track 3: pure subjective - feature depth (Skill count/effectiveness), research quality, LUI fluency, thesis; parts 1-3 weigh most; no numeric weights (S2 guide Ch.IV) | Exact weighting of technical execution, Bitget integration, originality, UX | [CONFIRMED] S2 focus, weights N/A |
| **Prize Structure & Eligibility** | S2 (guide Ch.II + landing, direct-read 2026-09-11): pool 50,000; Grand 3,000 x1; Theme 500 x15; Open 500 x6; University 500 x10 (fill name; excl. main winners); Spread 300 x3; Fan Favorite 300 x3 (stacks); Demo Day opt-in; Qwen/K3 credits | Track prize pool, bonus criteria, feedback rewards, payout terms | [CONFIRMED] S2 prizes + stacking |

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
| **Repository Requirements** | S2: "accessible Demo" required for Track 3; materials link takes Demo/GitHub/video/docs/logs; description must live IN the form (S2 guide Ch.IV, direct-read 2026-09-11). No license-type or originality rule beyond S1-reuse bar | License terms, commit history rules, repository visibility | [CONFIRMED] S2 fields. License silence = no constraint (P25 confirms) |
| **Deployment Requirements** | S1: deployment link optional for Infra; demo must be real and runnable (verified 2026-09-11) | Live Application Hosting | [CONFIRMED] S1. S2 live-URL rule [UNKNOWN] |
| **Demo Video Rules** | S2: video only ever OPTIONAL material (Demo/code/video/docs/logs field; Track 3 "Demo + optional screen recording"). No duration/host rule published (S2 guide, direct-read 2026-09-11). S1 max-3-min conditional is historical | Record a concise demo video that complies with the CURRENT OFFICIAL duration, format, hosting, and content requirements verified during P1 and rechecked during P25 | [CONFIRMED] S2 silence = no constraint. P25 re-checks |
| **Prohibited Elements** | S1 baseline gates only: UID match, public links, stated thesis, verifiable usage record (verified 2026-09-11) | Plagiarism, closed-source blackboxes, fake API mocks, rule violations | [CONFIRMED] scope found. S2 disqualifiers [UNKNOWN] |

---

## 4. Source Verification Protocol (Governing P1)

When P1 begins, all entries in this registry must be classified using the standard three-tier verification label:
- `[CONFIRMED]`: Verified directly on the official source with timestamp and exact link.
- `[INFERRED]`: Strongly implied by official documentation, but not explicitly stated.
- `[UNKNOWN]`: Information not yet found; documented with exact search paths attempted.
- `[CONFLICT]`: Two current official sources disagree; both preserved, P4 tests reality.

Third-party summaries, blog posts, and secondary aggregator articles are strictly prohibited from serving as authoritative sources.
