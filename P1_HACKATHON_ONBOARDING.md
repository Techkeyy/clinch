# CLINCH P1 — Hackathon Onboarding Research

Verification timestamp: 2026-09-11 (UTC). All web sources checked 2026-09-11;
second disambiguation pass 2026-09-11 ~22:55 UTC (sections 20-21 added, no S2 surface found).
Phase: P1 BUILDING. P0 PASS accepted by Director. No product code written. No P2 work.

Fact labels: [CONFIRMED] = read on a current official source (URL + date given).
[INFERRED] = derived from official sources, not directly stated.
[UNKNOWN] = not establishable from reachable authoritative sources (search paths recorded).
[CONFLICT] = two current official sources disagree (both preserved, P4 must test).

Headline finding: NO public official "Bitget AI Genesis Season 2" page, track list,
deadline, prize table, or submission portal could be verified on 2026-09-11. Everything
below about "Season 2 / AI Trading Desk / Open Theme / September 21" is therefore
[UNKNOWN] from the public-official-source standpoint. Season 1 (Base Camp S1, closed
June 30 2026) is fully documented and is used as [CONFIRMED] S1 fact plus [INFERRED]
prior for S2. The Director/user must supply the official S2 portal link (likely gated:
Telegram community, registration email, or bitget.com campaign page, which blocks
unauthenticated fetching). This is the single biggest P1 gap. See sections 3, 6, 17, 18.

---

## 1. Verification timestamp

- Research performed: 2026-09-11, ~21:30-21:45 UTC.
- Toolchain smoke checks run live on the build machine on the same date (section 16).

## 2. Source hierarchy (as applied)

- Tier 1 (facts): bitget-ai.gitbook.io hackathon docs, github.com/Bitget-AI/*,
  github.com/BitgetLimited/agent_hub, bitget.com/api-doc/*, bitget.com/support/*,
  bitget.com/academy/*, web3.bitget.com developer docs, bitget.com/activity-hub/*.
- Tier 2 (technical behavior): npm registry metadata + installed package contents
  (@bitget-ai/* versions resolved live), bgc CLI introspection output, skill markdown.
- Tier 3 (context only, never authority): blockchain.news, htx.com news, dgp.news,
  thecryptoupdates.com, twiscan X-mirror. Used only to cross-check S1 existence.

## 3. Hackathon facts

### Season 1 [CONFIRMED] (prior edition, closed)

- Exact official name: "Bitget AI Base Camp Hackathon S1" (gitbook title
  "Base Camp * Hackathon S1 EN"). Source: https://bitget-ai.gitbook.io/hackathon
  (checked 2026-09-11). Organizer: Bitget. Strategic sponsor: Alibaba Qwen.
  Media/ecosystem: Foresight Ventures / Foresight News.
- Status: ENDED. Duration May 27 - June 30, 2026. Registration May 27 - Jun 14 24:00.
  Submission window Jun 15 00:00 - Jun 25 24:00. Judging Jun 25-29. Awards Jun 30.
  All times UTC+8 [CONFIRMED, same source].
- Format: global, online [CONFIRMED]. Solo or team, teams up to 5, judged equally;
  UID submitted must match registration UID [CONFIRMED, gitbook Ch.2/FAQ].
- Total prize pool: 50,000 USDT [CONFIRMED]. Rewards paid to winners' Bitget accounts
  [CONFIRMED, activity-hub pages].
- S1 submission mechanism: Google Forms link shared via official social/community/
  registration email (S1 EN link https://forms.gle/CEGB6fRtuobD3bCj8)
  [CONFIRMED, gitbook Ch.3]. Registration via bitget.com campaign page with Bitget
  account (linked email) [CONFIRMED].
- S1 tracks: Trading Agent / Trading Infra / Stock AI Trading (+Open Innovation lane
  under Track 3 for early registrants) [CONFIRMED]. There was NO track named
  "AI Trading Desk", "Alpha Factory", or "Agentic Trading" in S1 [CONFIRMED by absence
  in the full track specification].
- S1 video rule: max 3 minutes; optional, REQUIRED only if the demo needs login;
  public tweet or YouTube accepted [CONFIRMED, per-track checklists].
- S1 judging: holistic across Depth of thesis / Runnability / Completeness /
  Novelty and potential. NO fixed weighting formula. "Bitget reserves the right of
  final interpretation" [CONFIRMED, Scoring Dimensions].
- S1 awards: 1st 6,600 USDT (all tracks judged together); 2nd 1,500 x3 (1/track);
  3rd 800 x3; Community Impact 500 x3; Participation +50/team (working demo +
  qualifying post) [CONFIRMED, prizes table]. No university/Rising Talent award, no
  People's Choice, no Demo Day in the S1 spec [CONFIRMED by absence].
- S1 eligibility gates: UID match, all links publicly accessible without login,
  thesis clearly stated, at least one verifiable usage record (except Open
  Innovation). Fail any = disqualified, no judging [CONFIRMED, General Rules].
- No real capital required; sim/paper-trading and backtest records accepted; backtest
  screenshots alone rejected (code or notebook required, judges may reproduce)
  [CONFIRMED, FAQ + checklists].

### Season 2 [UNKNOWN] (target event)

- Exact official name "Bitget AI Genesis Season 2": [UNKNOWN]. Note: S1-era
  activity-hub pages brand the program "Bitget AI Hackathon * Genesis Season 1",
  so "Genesis" is the program name and S2 naming is plausible but unverified.
- Season, organizer, status, start date, submission-open date, submission-close date,
  cutoff time, timezone, voting dates, winner date, reward pool, region restrictions,
  eligibility, team rules, KYC/account requirements, payout requirements: all
  [UNKNOWN] from reachable official sources.
- "September 21" deadline (any year/timezone): [UNKNOWN]. No cutoff time/timezone
  invented. Searched: web search (multiple queries, deep), gitbook llms.txt index
  (only S1 EN + S1 CN pages exist), DoraHacks (only 2024 Bitget x Solana event),
  HackerEarth (only 2023 U-30 event), bitget.com campaign/activity-hub pages
  (fetch blocked by transport error / bot protection), Bitget_AI X mirror (S1 posts
  only). Full search paths in section 17.
- [INFERRED] prior IF S2 follows S1 mechanics: expect UTC+8 times, UID-gated
  registration, Google-Form-style submission, public-links rule, 3-minute optional
  video. Do NOT treat as fact.

## 4. Track definitions

### S1 tracks [CONFIRMED] (only official track spec available)

- Trading Agent: AI agent that autonomously perceives market conditions, makes
  decisions, executes trades, manages risk. Any instrument (perps, spot, on-chain,
  prediction markets). Live/paper-trading log required (preferred).
- Trading Infra: infrastructure helping agents perform better or traders work more
  efficiently (tools, frameworks, dashboards, evaluation/benchmarking). Verifiable
  usage record required (API log, user records, reproducible sample I/O, or another
  developer integrated). Deployment link optional. NO trading execution required.
- Stock AI Trading: AI for tokenized US stocks on Bitget, or traditional US
  stocks/ETFs; macro/sentiment agents, backtest/deploy on US stock history,
  Fed-signal rebalancing. Paper-trading log required (preferred).
- Open Innovation (Track 3 sub-lane, early registrants only): project need NOT be
  US-stock-related but must state a clear connection to crypto trading or AI and use
  the registration UID. Usage record optional/preferred. This is the closest S1
  precedent for an "open theme" lane [CONFIRMED].
- Why CLINCH is currently "AI Trading Desk rather than Alpha Factory or Agentic
  Trading": CANNOT be answered from current rules because no official S2 track list
  exists publicly [UNKNOWN]. Against S1, CLINCH (pre-trade decision support, human
  executes) does NOT fit Trading Agent (autonomous execution + trade log expected);
  closest fits are Trading Infra (trader tooling, no execution required) and the
  Open Innovation lane (explicit non-conforming entry path). S2 track names
  Alpha Factory / Agentic Trading / AI Trading Desk are UNVERIFIED [UNKNOWN].

## 5. AI Trading Desk full specification

- Exact definition, sub-themes, Open Theme vs Wildcard naming, winner counts,
  single-lane rules, cross-award eligibility, demo structure, research workflow,
  integration depth, natural-language/data/Skill requirements, judging dimensions
  and weights, trade-execution mandates, human-final-decision stance, BUY/WAIT/AVOID
  permissibility, disclaimer rules: ALL [UNKNOWN] (no public S2 spec found).
- CLINCH FIT GATE (answered against S1 rules + current ecosystem only):
  1. Decision Hinge workflow allowed? No prohibition found in S1 Infra/Open
     Innovation rules [INFERRED fit, S2 unconfirmed].
  2. Human-final-decision model fit? S1 never mandates autonomy outside the Trading
     Agent track; Infra/Open Innovation accept non-executing tools [INFERRED fit].
  3. Open Theme/Wildcard lane real and available? S1 Open Innovation precedent is
     [CONFIRMED] real; S2 Open Theme/Wildcard is [UNKNOWN]/NOT CONFIRMED.
  4. Anything about CLINCH outside track rules? Nothing found, S2 rules unknown.
  5. Anything mandatory missing from the concept? Under S1 Infra rules: verifiable
     usage record + public repo + runnable demo would be mandatory at submission
     (P17-P19 already plan for this) [INFERRED].
- Product UNCHANGED. No S2 conflict exists to redesign around because no S2 rules
  are verified. Nothing marked BLOCKING FOR DIRECTOR on product substance; the
  S2-information gap itself is the Director item.

## 6. Prize structure

- S1 table [CONFIRMED] (see section 3). Stacking/exclusivity: not stated in S1 docs
  [UNKNOWN]; Community Impact scored independently with no effect on technical score
  [CONFIRMED]; Participation stacks with any placement by its stated condition
  [INFERRED].
- S2 overall pool, first/global prize, sub-theme awards, Open Theme/Wildcard awards,
  People's Choice, social/reach prize, university/Rising Talent award, Demo Day or
  post-hackathon benefits: ALL [UNKNOWN]. No Rising Talent/university requirement
  can be recorded; S1 had no such award [CONFIRMED by absence]. If the user has an
  S2 prize page, supply the link; P25 will re-verify.

## 7. Submission requirements

- S1 checklist [CONFIRMED]: project description (four-part structure incl. thesis;
  Part 4 AI-trading take optional), public GitHub repo or demo link (README must let
  another developer run it independently for Infra), per-track evidence (trade log /
  usage record), backtest optional with code, video max 3 min optional unless login
  required, engagement-tweet links for community awards, registration-UID match,
  everything publicly accessible without login.
- Open-source/license terms: GitHub "must be public"; no explicit license type
  (e.g. MIT) mandated in the S1 text inspected [CONFIRMED public-only; license type
  UNKNOWN]. No source-originality / pre-existing-code / code-age rule found in S1
  text [UNKNOWN]. No disqualifier list beyond the four baseline gates [CONFIRMED
  scope of what was found].
- S2 submission platform, fields, repo/license/video/hosting/screenshot/architecture/
  team/university/social/tag/deck requirements: ALL [UNKNOWN].

## 8. Judging rubric

- S1: four holistic dimensions, no fixed weights, Bitget final interpretation
  [CONFIRMED]. Runnability ordering explicit: live/paper trading > backtest > pure
  concept [CONFIRMED]. Honest self-assessment valued over exaggeration [CONFIRMED].
- S2 criteria/weights: [UNKNOWN].

## 9. Bitget ecosystem inventory (current, 2026-09-11)

- Agent Hub [CONFIRMED SHIPPED]: official open-source AI toolkit, dual-home repos
  https://github.com/Bitget-AI/agent_hub and https://github.com/BitgetLimited/agent_hub
  (gitbook links the BitgetLimited home; both live). MIT-licensed. Installer:
  @bitget-ai/bitget-agent-installer 3.0.0 (npm, live). Five packages, one job each:
  SDK (developers), CLI `bgc` (terminal AI), MCP (desktop AI), Skill (reasoning
  guide), Signal (market analysis, no key). Status: SHIPPED. Note per-package
  versions drift (SDK 3.3.0 / MCP 3.3.0 / Skill 3.2.1 / CLI 3.0.0 / Signal 1.2.0 /
  Installer 3.0.0, npm 2026-09-11); docs state cross-version drift is supported.
- Operation count [CONFLICT]: READMEs say "89 UTA v3 operations"; architecture.md
  says CATALOG_OPERATION_COUNT 109, SPEC 3.0.0; pkgstats mirrors 109. Likely stale
  README vs regenerated catalog; P4 `discover` output governs. Live `bgc discover`
  (2026-09-11) reports 7 domains (market, trade, account, funds, subaccount, loan,
  tax), 14 tools total. Preserved for P4.
- GetAgent [CONFIRMED SHIPPED]: AI trading assistant (50+ tools at launch),
  GetAgent Studio, MuleRun publish path. GetClaw [CONFIRMED SHIPPED per Mar 2026
  upgrade post + Apr 2026 co-creation news]: Telegram-first autonomous agent.
- Playbook: see section 13.
- Coming-soon inside bitget-signal README: top-trader-flow, derivatives-structure,
  large-flow-detect (Bitget-exchange-native signals) [CONFIRMED ANNOUNCED / NOT YET
  AVAILABLE].

## 10. Research skills inventory (bitget-signal 1.2.0, npm + tarball inspected)

- Exact set [CONFIRMED]: macro-analyst, market-intel, sentiment-analyst,
  technical-analysis, news-briefing. Install: npx @bitget-ai/bitget-signal
  --target claude|codex|openclaw|all; Node.js 20+; Python pandas+numpy ONLY for
  technical-analysis. MIT. No Bitget account, no API key [CONFIRMED, README+FAQ].
- Inputs/outputs per skill [CONFIRMED from SKILL.md + references]: trigger-phrase
  routed NL analysis; outputs are time-series/context briefs with output templates.
  Macro: Fed/FOMC/yields/cross-asset correlation. Market-intel: CoinGecko prices/
  trending/OHLCV-by-coin-ID, DeFi TVL/fees/yields, DEX pairs, derivatives
  positioning (top-trader L/S, OI, taker ratio), gas/mempool, 44+ RSS/Atom news feeds.
  Sentiment: Fear and Greed, L/S ratios, OI, funding, taker ratio, Reddit.
  Technical: 23 indicators/6 categories, local Python calc on Bitget public candles.
  News: 44 feeds + social trending + narrative synthesis, keyword routing.
- Data sources: NOT purely Bitget. Market-intel reference names CoinGecko, DEX
  aggregators, Reddit; MCP backend hostname is https://datahub.noxiaohao.com/mcp
  (third-party domain, in install.js + every SKILL.md) while README claims "Bitget's
  public MCP data service / maintained by Bitget" [CONFLICT - operator attribution
  unverified; P4 must assess trust implications]. Technical-analysis fetches
  https://api.bitget.com (official domain) public spot/mix candles [CONFIRMED].
- Explicit gaps [CONFIRMED, data-availability.md]: ETF net flows, exchange
  reserves, whale-wallet tracking, unlock schedules, AHR999, Pi Cycle, Coinbase
  premium, Puell, MVRV all NOT available (proxies or "inform user").
- rToken/tokenized-stock support: ZERO mentions of rToken/Reality/stocks except
  incidental words ("AI/semiconductor stocks move crypto", xueqiu feed, "differs
  from stocks") [CONFIRMED by tarball grep]. bitget-signal is crypto-only.
- Citations: skill instructs "Vendor Neutrality - present data as market data, never
  name the source" [CONFIRMED]. CLINCH's auditable source-cited brief CANNOT rely on
  skill prose for provenance; must cite at the transport layer (endpoint + time).
- Historical queries: supported where noted (OHLCV history by CoinGecko ID, kline
  history, funding/OI history) [CONFIRMED].
- Dynamic per-hinge invocation: YES, feasible. Skills are independent markdown
  prompts + one HTTP MCP server; a backend can invoke individual MCP tools or the
  public REST endpoints selectively instead of running all five [INFERRED from
  architecture; P4 must prove with a doctor call]. Full app-integration proof is P4.

## 11. Agent Hub / SDK / CLI / MCP inventory

- SDK @bitget-ai/bitget-agent-sdk 3.3.0 [CONFIRMED, npm]: TypeScript foundation,
  UTA v3 catalog, HMAC-SHA256 signing, client-side rate limiting, mock server,
  14-verb intent surface mountable into LLM tool frameworks. FOR custom developers;
  this is CLINCH's later integration layer (P4/P6), not a shell-out [INFERRED].
- CLI @bitget-ai/bitget-agent-cli 3.0.0 (`bgc`) [CONFIRMED + smoke-tested
  2026-09-11]: terminal surface for Claude Code/Codex/OpenClaw. Grammar
  `bgc <tool> [--action] [--params]`, `bgc discover`, `bgc raw --operationId`,
  global `--dry-run/--confirm/--read-only/--paper-trading`. Bundles SDK 3.1.0
  (skew vs standalone 3.3.0 noted). `discover` works WITHOUT credentials
  [CONFIRMED live]. `discover --domain market` shows ONE verb `market` (read-only,
  "no credentials required") fronting 16 reads: tickers, orderbook, kline +
  history, instruments, funding current/history, OI (+limit), recent public fills,
  position tier, discount rate, index components, margin loan, proof of reserves,
  risk reserve [CONFIRMED live output].
- MCP @bitget-ai/bitget-agent-mcp 3.3.0 [CONFIRMED, npm]: thin stdio adapter over
  the SDK for Claude Desktop/Cursor/Windsurf/ChatGPT. An AI-HOST integration, not
  the custom-app path [INFERRED].
- Skill @bitget-ai/bitget-agent-skill 3.2.1 [CONFIRMED, npm]: pure-markdown
  reasoning guide (trigger recognition EN+CN, v3 grammar, discover-first workflow,
  write-safety [CAUTION]+confirm, close-direction rules, demo-trading, error-code
  table, auth-setup). Must pair with CLI [CONFIRMED].
- `discover` = live self-describing surface (domains - verbs - actions - schemas);
  what it reports IS the CLI surface by construction [CONFIRMED, agent-cli README].
- UTA generation: v3 across SDK/CLI/MCP/skill 3.x line [CONFIRMED].
- Public market calls require NO user API credentials [CONFIRMED: market module
  table "No (public data)" + live market-verb description]. Private/account calls
  require user key + secret + passphrase env vars (or demo-key triple for
  --paper-trading sandbox) [CONFIRMED, agent-skill auth/demo docs].
- Safety: --read-only strips write tools; --paper-trading routes to demo env;
  write ops show [CAUTION] and wait for confirmation; local HMAC signing, no .env
  parsing [CONFIRMED]. Paper/dry-run relevance to CLINCH: LOW for research (CLINCH
  never trades), but --read-only is the correct posture for any P4 exploration.

## 12. Reality / rToken findings

- Product naming [CONFIRMED]: "Reality" = tokenized US stock pairs, symbol format
  r<STOCK>USDT (e.g. rAAPLUSDT), `isReality` flag on instruments. Lineup per academy
  (2026-08-05): rToken spot 600+ tokens 1:1 vs real stocks routed to US order books
  via Alpaca in hours + U.S. stock perps 250+ with funding; unified UTA; 24/7 incl.
  pre/after-hours. US stock OPTIONS launched July 2 2026 (separate product).
- Market data [CONFIRMED, Reality Trading Guide, api-doc]: instruments, ticker,
  candlesticks = PUBLIC (reused endpoints, REST+WS). Candles: market-type only;
  intervals 1m/5m/15m/1H/4H/1D; pre-2026-07-09 volume/turnover may be empty; 1m WS
  pushes omit volume/turnover.
- Depth/fills/trading [CONFLICT - the Director-flagged nuance, resolved as far as
  text allows]: Trading Guide + Place-Reality-Order endpoint page + June 30 support
  article (whitelisted, contact BD) say orderbook/fills/place/cancel are
  WHITELIST-only (guide: "All Reality-specific endpoints are currently only open to
  whitelisted users"; orderbook note: "currently only off-exchange depth... use the
  OrderBook Channel during non-trading hours"). BUT the Aug 11 support article says
  Reality stock spot API "fully opened... as of 11 August 2026 (UTC+8). No whitelist
  registration is required", body listing only place + cancel order. AND the Aug 26
  rToken FAQ says API supports "order book data (Level 2)" and "up to 30 req/s/UID"
  (vs 10/sec/UID in the Trading Guide). Newest-dated sources (Aug 11, Aug 26) claim
  openness; endpoint reference pages still claim whitelist. Resolution: which
  endpoint CLASSES opened is AMBIGUOUS - plausibly trading (place/cancel) opened
  while depth/fills pages lagged, or vice versa. P4 must test each class without
  credentials: tickers, candles, instruments, orderbook, fills. Do NOT design around
  whitelisted access.
- Weekend/close behavior [CONFIRMED, rToken FAQ]: in-hours orders route to
  NASDAQ/NYSE books via Alpaca at underlying price; weekends/holidays liquidity is
  internal to Bitget (depth/spread/formation may differ). rNVDA weekend dip story:
  researchable via public ticker/candles; depth unreliable off-hours [INFERRED].
- rToken feasibility for CLINCH: HIGH for read-only hinge research (public
  ticker/candles/instruments need no key); MEDIUM overall until P4 resolves the
  depth/fills conflict; trading access irrelevant (CLINCH never trades).

## 13. Authentication / access matrix

| Capability | Public / no auth | CLINCH service credential | User Bitget API credentials | Wallet | Whitelist | Status |
|---|---|---|---|---|---|---|
| bitget-signal 5 skills (via public MCP) | YES | none | none | no | no | CONFIRMED |
| UTA market verb (tickers, candles, funding, OI, public fills...) | YES | none | none | no | no | CONFIRMED (live discover) |
| Reality instruments/ticker/candles | YES | none | none | no | no | CONFIRMED (guide) |
| Reality orderbook/fills | ? | ? | ? | no | guide says YES | CONFLICT (guide vs Aug 11/26) |
| Reality place/cancel order | no | n/a (CLINCH never trades) | account API key | no | guide yes vs Aug-11 no | CONFLICT, irrelevant to CLINCH |
| UTA trade/account/funds/loan/tax verbs | no | operator key for P4 tests only | YES for end users of trading tools | no | no | CONFIRMED |
| Playbook (strategy create/backtest/publish) | no | Playbook API key via sub-account + Telegram admin | YES (sub-account under user UID) | no | admin-gated | CONFIRMED (gitbook Ch.4) |
| bitget.com campaign/registration pages | n/a (fetch blocked) | none | Bitget account for registration (S1) | no | no | CONFIRMED S1; S2 UNKNOWN |
- User-facing rule PRESERVED: normal CLINCH user provides NO wallet, NO exchange
  account, NO API key for core use. All CLINCH research paths verified so far
  (signal skills, market verb, Reality ticker/candles) need no user credential
  [CONFIRMED]. Backend/service credentials (operator key for P4, possible MCP/data
  service terms) are developer-side and compatible [INFERRED].
- No finding triggers the "every user must supply trading credentials" stop
  condition. No credentials requested, created, or stored in P1 [CONFIRMED clean].

## 14. Playbook relevance

- What it is [CONFIRMED]: AI quant strategy copilot (launched June 17 2026, academy
  guide June 30): NL idea - runnable strategy - backtest (PnL/drawdown/Sharpe/win
  rate) - deploy to 24/7 execution in user-authorized isolated sub-accounts; 10+
  house strategies; Agent/Trade Harness orchestration; builder path via
  @bitget-ai/getagent-skill 0.6.4 (npm live) + Playbook API key (sub-account under
  registered UID + Telegram admin). S1 example: community agent-47 Playbook agent.
- Classification: NOT NEEDED as a CLINCH integration. Paper test: remove Playbook
  and CLINCH's pre-trade hinge-research product is unchanged (Playbook generates,
  backtests, and EXECUTES strategies; CLINCH narrows a human's open decision and
  never trades). Backtest-as-evidence is not a hinge input P2-P5 currently needs.
  Revisit only if P2 scope demands strategy-quality evidence. Using it for badge
  value alone would be integration theatre.

## 15. Bitget Done vs Whitespace

- BITGET ALREADY SHIPS (verified, CLINCH must not duplicate): generic market lookup
  (tickers/candles/funding/OI), 23-indicator technical analysis, Fear and Greed +
  positioning sentiment, 44-feed news briefing + narrative synthesis, macro/Fed
  briefings, on-chain/TVL/ETF-proximate intel, NL strategy generation, backtesting
  with metrics, live/auto execution (Playbook/GetClaw), account/position querying,
  paper-trading sandbox, monitoring dashboards (S1 precedent).
- BITGET DOES NOT CLEARLY SHIP (not found in the official surfaces inspected):
  identifying WHICH unresolved fact could change a specific trader's decision;
  ranking the next research question by decision value; explicitly SKIPPING research
  whose outcomes would not change the action with stated rationale; HALTING on low
  marginal decision value; invalidation triggers tied to one user's stance ("what
  future data would flip this"); a brief organized around a decision hinge rather
  than asset coverage. Absence-of-docs is not proof of nonexistence; P2 will
  sharpen this into testable differentiation.

## 16. Environment audit (skill Part B, adapted: AI/API build, no chain/wallet needed)

- OS: Windows 11 Pro, build 22621. Shell: PowerShell 7.6.6. Git 2.53.0.windows.2.
  Node v24.14.0 (requirement: Node 20+ for signal/skill installer, 18+ older MCP
  doc - SATISFIED). npm 11.9.0 with live registry access. Python 3.14.3 present;
  pandas/numpy MISSING (needed only for technical-analysis skill - gap noted for
  P4, install then if needed). Docker 29.7.2 present (optional, not needed).
- Package availability [CONFIRMED live, npm view 2026-09-11]: sdk 3.3.0, mcp 3.3.0,
  skill 3.2.1, cli 3.0.0, signal 1.2.0, installer 3.0.0, getagent-skill 0.6.4.
- Smoke tests (non-destructive, no auth, no product code): `bgc --version` OK
  (cli 3.0.0 bundling sdk 3.1.0 - skew noted); `bgc discover` OK (7 domains,
  14 tools, introspection only, no network trade); `bgc discover --domain market`
  OK (1 read-only verb, 16 fronts, "no credentials required"). No installs beyond
  npx cache; no global config changed; no credentials touched.
- Classification: Installed - Git, Node 24, npm, Python 3.14, Docker. Missing -
  pandas/numpy (deferred to P4). Incompatible - none. Minimum stack for P4:
  Node 24 + npx + bgc (cached) + optional Python deps. No upgrades needed.
- Readiness: READY WITH WARNINGS (warnings: S2 portal unverified - not a machine
  issue; noxiaohao backend attribution; pandas missing; SDK version skew).

## 17. Conflicts and unknowns

- [CONFLICT C1] Reality whitelist: Trading Guide + endpoint pages + June 30 article
  (whitelist/BD contact) vs Aug 11 article (fully opened, no whitelist) vs Aug 26
  FAQ (L2 book supported, 30 r/s). P4 tests each endpoint class unauthenticated.
- [CONFLICT C2] Operation count: Agent Hub READMEs "89 UTA v3 ops" vs
  architecture.md CATALOG 109 / spec 3.0.0. P4 `discover` governs.
- [CONFLICT C3] Signal backend attribution: README "Bitget's public MCP data
  service, maintained by Bitget" vs backend hostname datahub.noxiaohao.com
  (third-party domain). Operator/ToS implication UNKNOWN; P4/P7 assess.
- [CONFLICT C4, minor] Node floor: signal/skill require Node 20+; older MCP doc
  says 18+. Moot (Node 24 installed).
- [CONFLICT C5, minor] S2 voting window: 9/22-9/28 (timeline table + landing page)
  vs 9/22-10/7 (guide audience section + step). Judge review 9/22-10/7 either way.
  No build impact; P25 notes the announced result date 10/8.
- [CONFLICT C6, minor] S2 named-topic count: Ch.II says 15 named sub-themes
  (matches 5x3 Ch.IV tables + landing "15 sub-themes"); form-field text says
  "18 named topics + 3 Open Themes". Open Theme path unaffected. P25 re-checks.
- [UNKNOWN U1] Entire S2 fact set: portal URL, tracks, dates, Sept-21 deadline +
  time/timezone, prizes + stacking, video rules, submission fields, judges/weights,
  KYC, eligibility. Search paths exhausted: web deep-search (6 query families),
  gitbook llms.txt, DoraHacks, HackerEarth, bitget.com (bot-blocked), X mirror.
  ACTION: Director/user supplies the official S2 link; P25 re-verifies all of it.
- [UNKNOWN U2] S2 Open Theme/Wildcard existence and CLINCH lane. S1 Open Innovation
  is the favorable precedent, not proof.
- [UNKNOWN U3] S2 license/originality/code-age rules; S2 demo-video duration (S1:
  max 3 min, conditional).
- [UNKNOWN U4] Reality depth/fills live behavior without whitelist; fee/rate-limit
  final numbers (10/s vs 30/s); rToken full instrument list method (instruments
  endpoint + isReality flag per guide - P4 proves).
- [UNKNOWN U5] bitget-signal MCP rate limits/ToS for backend-driven (non-AI-host)
  call patterns; historical-depth limits per skill.

## 18. Implications for CLINCH (no redesign - report only)

- Valid, keep: Decision Hinge concept; human-final-trader; no-wallet/no-account/
  no-user-key core; rNVDA/rToken story (public data path confirmed); hinge-first
  research using signal skills + market verb + Reality candles; P16 baseline plan.
- Adjust later, not now: lane naming must track the real S2 track list once known
  (S1 suggests Infra/Open-lane framing, never autonomous-agent framing); brief
  provenance must be transport-level (endpoint+timestamp), never skill prose;
  bitget-signal covers crypto ONLY so rToken evidence comes from Reality/UTA paths;
  depth-based hinges are P4-gated by C1.
- Director intervention needed: (1) supply the official Season 2 portal/rules link -
  P1 cannot verify the event publicly; (2) confirm whether CLINCH should still
  assume Sept 21/AI Trading Desk/Open Theme (all currently UNKNOWN); (3) note C3
  (third-party signal backend) for the P7 trust model. No product STOP condition
  met: nothing verified requires autonomy, trading credentials per user, or
  unavailable tooling.

## 19. P1 pass-gate checklist

1. S1 rules extracted from primary sources [DONE]; S2 rules [UNKNOWN, escalated].
2. AI Trading Desk exact requirements [UNKNOWN, escalated - no public spec].
3. Open Theme/Wildcard status [NOT CONFIRMED - S1 precedent only].
4. Deadline date [UNKNOWN - Sept 21 unverified]. 5. Time/timezone [UNKNOWN, none
   invented]. 6. Prizes/stacking [S1 DONE; S2 UNKNOWN]. 7. Submission map [S1 DONE;
   S2 UNKNOWN]. 8. Judging [S1 DONE (holistic, unweighted); S2 UNKNOWN].
9. Required integration depth [S1 DONE (Infra lane: runnable + usage record, no
   execution); S2 UNKNOWN]. 10. Ecosystem inventoried [DONE]. 11. Skills
   inventoried to SKILL.md level + tarball [DONE]. 12. SDK/CLI/MCP roles+versions
   [DONE + live smoke]. 13. rToken mapped with whitelist nuances [DONE + CONFLICT
   preserved]. 14. Credential matrix user-vs-service [DONE]. 15. Env meets
   requirements [DONE, gaps listed]. 16. Done-vs-whitespace [DONE]. 17. Contradictions
   recorded [DONE, C1-C4]. 18. No unsupported requirement stated as fact [DONE -
   S2 items labeled UNKNOWN]. 19. No product code [DONE]. 20. P2 not begun [DONE].

## 20. Season Disambiguation Audit (mandatory - second pass 2026-09-11)

Every major source encountered, with the season its CONTENT shows (not its URL),
current S2 relevance, and disposition. Rule applied: S1 content is historical context
only; no S1 rule, date, prize, track, video, form, or judging fact is used as S2
authority. Second-pass additions (2026-09-11 ~22:55 UTC): Arabic activity-hub page,
Skills Challenge article, repeat S2 deep-search - still no S2 surface.

| Source | Season shown in content | Current / relevant to S2? | Use |
|---|---|---|---|
| https://bitget-ai.gitbook.io/hackathon (full fetch incl. .md) | S1 (Base Camp S1, May 27-Jun 30 2026) | NO | Historical (S1 rules baseline + S1 Open Innovation precedent) |
| https://bitget-ai.gitbook.io/hackathon/llms.txt | S1 only (S1 EN + S1 CN pages) | NO | Historical (proves no S2 doc page published here) |
| https://www.bitget.com/activity-hub/hackathon (EN + AR + ES + PT + UK locales) | S1 ("Genesis Season 1", 50,000 USDT, May 27-Jun 30; AR page adds "Open track: the uncharted territory") | NO | Historical (S1 program naming "Genesis" + landing-page open-track precedent) |
| https://www.bitget.com/activity-hub/builder-os | S1 ("Hackathon S1 kini telah dibuka", Builder Base Camp program) | NO | Historical (long-term builder program context) |
| https://www.bitget.com/campaigns/d8a2a61fd63c4bc2a3c8198ec923da9a | S1 (prize table 6,600/1,500/800/500/50) | NO | Historical (registration via Bitget account + Telegram pattern) |
| https://github.com/Bitget-AI/agent_hub + /bitget-signal + /agent-sdk + /agent-cli + /agent-mcp + /agent-skill | Current (v3.x line, UTA v3; no season content) | YES | Authoritative for ecosystem/tooling (season-independent) |
| https://github.com/BitgetLimited/agent_hub | Current (same toolkit, alternate org home) | YES | Authoritative (gitbook-linked home) |
| https://www.bitget.com/api-doc/uta/reality-trading-guide + Place-Reality-Order page | Current (endpoint reference; whitelist wording possibly lagging Aug-11 opening) | YES with CONFLICT | Authoritative for endpoint classes; access column CONFLICT (C1) |
| https://www.bitget.com/support/articles/12560603887619 (2026-06-30) | Current at publish (whitelisted spot APIs) | SUPERSEDED by Aug-11 article | Historical for timeline; access claim discarded in favor of newer |
| https://www.bitget.com/support/articles/12560603891600 (2026-08-11) | Current (fully opened, no whitelist; body lists place+cancel only) | YES with CONFLICT | Authoritative for trading-endpoint opening; scope vs depth ambiguous (C1) |
| https://www.bitget.com/academy/bitget-rtoken-faq (2026-08-26) | Current (L2 book, 30 r/s, Alpaca routing, weekend internal liquidity) | YES with CONFLICT | Authoritative for product behavior; rate/access vs guide CONFLICT (C1) |
| https://www.bitget.com/academy/bitget-rtoken-stock-perps-api-guide (2026-08-05) | Current (600+ spot / 250+ perps lineup) | YES | Authoritative for lineup |
| https://www.bitget.com/academy/bitget-getagent-playbook-introduction-ai-trading-strategies (2026-06-30) | Current (Playbook launched Jun 17 2026) | YES | Authoritative for Playbook |
| https://www.bitget.com/support/articles/12560603890593 (2026-07-30 SDK/FAQ) | Current (SDK/CLI/MCP/signal suite) | YES | Authoritative for developer suite |
| https://www.bitget.com/blog/articles/bitget-building-agentic-trading-empower-users-trade-like-wall-street-pros (2026-03-13) | Current strategy (UEX, GetClaw, Agent Hub thesis) | YES (context) | Authoritative for ecosystem direction, not hackathon rules |
| https://www.bitget.com/blog/articles/bitget-agent-hub-ai-trading-upgrade (2026-03-09) | Current at publish (58 tools era, pre-UTA-v3) | SUPERSEDED on counts | Historical for evolution; counts discarded (C2) |
| https://www.bitget.com/support/articles/12560603881617 (Skills Challenge, Mar 27-Apr 10) | Separate micro-challenge, not a season | NO | Discarded for S2 (proves Bitget runs parallel small challenges) |
| https://www.bitget.com/news/detail/12560605377884 (2026-04-21 co-creation) | Pre-S1 plan (Q2 "world's first AI trading hackathon" = S1) | NO | Historical (S1 origin) |
| npm registry @bitget-ai/* + live `bgc discover` 2026-09-11 | Current (versions + surface introspection) | YES | Authoritative for versions/capabilities (Tier 2) |
| web3.bitget.com RWA market-data docs | Current (RWA/stockList/kline paths, reality source) | YES | Authoritative for wallet-side RWA API alternative |
| dorahacks.io (Bitget x Solana 2024 only) | 2024 event, unrelated | NO | Discarded (proves S2 is NOT on DoraHacks publicly) |
| bitget.hackerearth.com (U-30 2023) | 2023 event, unrelated | NO | Discarded |
| Botcamp Agent Builders Cup "Race for Bitget" (May-Sep 2026) | Third-party event with Bitget team slot | NO | Discarded for rules (context: parallel AI-trading competitions exist) |
| WEEX "AI Wars II" Sept-Oct 2026 (htx.com news) | Competitor event, unrelated | NO | Discarded (context only) |
| https://www.bitget.com/activity-hub/hackathon | S2 ("Genesis Season 2", 9/3-9/21, 3 tracks, full prize table, footer "Season 2 @ 2026") | YES | Authoritative for S2 event facts (direct-read 2026-09-11) |
| https://bitget-ai.gitbook.io/bitgetai_hackathons2 | S2 ("Base Camp Hackathon S2 EN", Ch.I-V) | YES | Authoritative for S2 rules/tracks/prizes/judging/submission (direct-read 2026-09-11) |
| Tier-3 press (blockchain.news, dgp.news, thecryptoupdates, twiscan) | S1-era reports | NO | Context only, never authority |

Stale-page handling: bitget.com campaign/activity-hub fetches via this environment
fail (transport error / bot protection), so landing-page content was verified through
the search provider's page rendering (AR/ES/PT/UK/EN snippets all show S1) rather
than direct fetch; recorded as S1/stale, NOT probed further to avoid convention
creep. No S1 date, prize, track, video, form, or judging element appears anywhere
in this artifact as an S2 requirement: every S2 cell reads UNKNOWN.

## 21. CLINCH-specific questions - explicit answers

1. Is AI Trading Desk confirmed for Genesis Season 2? NO - not confirmed. No public
   S2 track list exists. The name appears in no S1 spec and no S2 page found.
2. Is the human trader explicitly the final decision-maker? No S2 statement exists
   to confirm or deny. S1 Infra/Open lanes permit non-executing tools (INFERRED
   compatible, S2 unconfirmed).
3. Exact S2 AI Trading Desk sub-themes? UNKNOWN - no spec found.
4. Does Open Theme / Wildcard / equivalent exist inside AI Trading Desk? UNKNOWN for
   S2. S1 precedents: Track-3 Open Innovation lane (gitbook) + landing-page "Open
   track: the uncharted territory" (CONFIRMED real in S1, not proof for S2).
5. Is CLINCH eligible for that lane? CANNOT be determined until the S2 lane and its
   eligibility text exist. No verified disqualifier found for a CLINCH-shaped
   Infra/Open entry under S1 rules.
6. Exact S2 submission deadline date? UNKNOWN. "September 21" is UNVERIFIED.
7. Exact cutoff time? UNKNOWN - none published on any reachable official surface.
8. Governing timezone? UNKNOWN - none published (S1 used UTC+8; that is S1 fact,
   not inherited).
9. Time/timezone proven? NO - marked UNKNOWN per P0 correction rule.
10. S2 judging criteria specifically for AI Trading Desk? UNKNOWN.
11. Are weights published? For S2: UNKNOWN. (S1: explicitly NO fixed weights.)
12. What Bitget integration is actually required? For S2: UNKNOWN. (S1 Infra lane:
    runnable tool + verifiable usage record + public repo; no execution mandate.)
13. Must the app execute trades? No S2 mandate found. Under S1, only the Trading
    Agent track expected execution; Infra/Open did not.
14. Are BUY/WAIT/AVOID conclusions allowed while the human decides? No S2 text
    exists. No S1 prohibition found outside autonomous-execution expectations of
    the Trading Agent track; bitget-signal itself ships an "investment advice"
    disclaimer pattern CLINCH should mirror (P2/P8 concern, not a ban).
15. What current official Bitget research Skills exist? Exactly five in
    @bitget-ai/bitget-signal 1.2.0: macro-analyst, market-intel, sentiment-analyst,
    technical-analysis, news-briefing (CONFIRMED via repo + tarball + npm).
16. Can those Skills be invoked individually/dynamically? YES, feasible: independent
    prompts + one HTTP MCP backend + public REST fallbacks allow selective calls
    (INFERRED from architecture; P4 doctor proof required).
17. Do they require a user's Bitget API credentials? NO - none, no account
    (CONFIRMED README/FAQ/tarball).
18. What can CLINCH's backend access without end-user exchange credentials?
    Signal skills, UTA market verb (16 reads incl. funding/OI/public fills),
    Reality instruments/ticker/candles, public spot/mix candles via api.bitget.com
    (CONFIRMED). Reality depth/fills gated by C1 (P4 test).
19. What current Reality/rToken data can CLINCH realistically access? Ticker,
    candles (1m/5m/15m/1H/4H/1D, market-type), instruments with isReality flag -
    all public, no key (CONFIRMED). rNVDA weekend-dip research viable on these.
20. What remains whitelist-restricted? Per the Trading Guide + endpoint pages:
    Reality orderbook (REST+WS), platform fills, place/cancel order (CONFLICT -
    Aug-11/26 sources claim openness; P4 resolves per class).
21. Are there contradictory official docs about Reality API access? YES - C1
    (whitelist guide vs fully-opened Aug-11 announcement vs L2-supporting Aug-26
    FAQ; plus 10/s vs 30/s rate conflict). Both sides preserved; P4 tests reality.
22. What does Playbook already do? NL idea to runnable strategy, backtest with
    metrics, deploy to 24/7 execution in isolated sub-accounts, 10+ house
    strategies, Agent Harness orchestration (CONFIRMED). Relevance: NOT NEEDED.
23. What does Bitget already ship that CLINCH must NOT rebuild? Market lookup,
    23-indicator TA, sentiment/positioning, 44-feed news + narrative, macro briefs,
    on-chain/TVL intel, strategy generation, backtests, auto-execution,
    account querying, paper sandbox (all CONFIRMED shipped).
24. What part of Decision Hinge is not found in official Bitget surfaces?
    Decision-value-ranked next-question selection; skip-with-rationale; halt on low
    marginal value; stance-tied invalidation triggers; hinge-organized brief
    (not found in surfaces inspected; absence is not proof of nonexistence).
25. Does anything discovered force a product-direction change NOW? NO. No verified
   rule requires autonomy, per-user trading credentials, whitelisted access for
   CLINCH's read paths, or unavailable tooling. The S2 information gap constrains
   lane naming/scope confidence (P3 risk), not the concept. Product UNCHANGED.

## 22. S2 primary-source verification (direct reads 2026-09-11 ~23:00 UTC)

Method correction: bitget.com blocks unauthenticated fetching, so both S2 primary
sources below were read in full through a page-render proxy (r.jina.ai). Content is
the official page content, inspected end-to-end (landing page twice, developer guide
in full incl. excerpt-verified tail). This section SUPERSEDES the UNKNOWNs in
sections 3-8 wherever S2 facts are now confirmed. S1 remains historical only.

### S2 sources (both CONFIRMED current, content shows Season 2)

- S2 landing: https://www.bitget.com/activity-hub/hackathon ("Bitget AI Genesis
  Season 2 - Build What Trades Next", footer "Builder OS Hackathon Season 2 @ 2026
  Bitget", video asset dated 20260902). Sections: hero, counters, 30+ partners,
  judges (list soon + 26 figures), 3 tracks + sub-themes, rewards, timeline
  (9/3 launch, 9/21 deadline, 9/22-9/28 voting, 10/8 winners), tools (Playbook,
  Agent Hub, Developer docs), S1 showcase (700+ agents, Nocturne/NightDesk),
  footer links (GitHub, Documentation, Telegram, X).
- S2 developer guide: https://bitget-ai.gitbook.io/bitgetai_hackathons2 ("Base Camp
  Hackathon S2 EN"): Ch.I event (9/3-9/21 2026 UTC+8, global online, 50,000 USDT,
  Bitget organizer, Qwen sponsor, 7 university associations among partners);
  Ch.II prizes (participant + audience) with exclusivity/stacking table; Ch.III
  participation (timeline UTC+8, Google Form https://forms.gle/GyWZCMCPocgJdJon6,
  no separate registration, X-post mandate, S1-reuse bar); Ch.IV tracks + per-track
  materials + judging; Ch.V toolkit; submission FAQ.

### S2 hackathon facts [CONFIRMED]

- Exact name: "Bitget AI Base Camp Hackathon S2" / "Bitget AI Genesis Season 2"
  (program Genesis, edition S2). Theme: AI x US-stock trading incl. rToken/7x24.
- Organizer Bitget; strategic/token sponsor Alibaba Cloud Qwen; partners incl.
  Bitget Wallet, Foresight, Arbitrum, Solana, Tether Foundation, Kaito AI, Cysic,
  Wave, 706 + 7 university blockchain associations.
- Format global online. No separate registration: submission = participation.
  Max 2 themes per team, separate form submissions, independent projects, same UID.
- No-S1-reuse: direct ports/renames invalid; continuing S1 needs "substantive new
  additions" (+ "Are you an S1 participant" field). CLINCH is new: unaffected.
- Judges: list "announced soon" (Gracy, Filippo Dune, Henry Kite, Vlad Evedex +26).

### S2 tracks [CONFIRMED]

- Alpha Factory (quant strategies; AI builds, verifiability rules): Arbitrage,
  After-Hours Information Pricing, Cross-Market Correlation, rToken Factor
  Strategies, Cross-Asset Allocation/Rotation, Open Theme (top 1 per each of 2
  open slots). Requires: strategy code + backtest >=60d total (>=30d
  out-of-sample). Judging: pure quantitative (Sharpe, Sortino, max DD, turnover,
  OOS decay alert OS<0.5xIS, rolling 30d Sharpe stability).
- Agentic Trading (LLM is the decision-maker; sense, judge, execute with risk
  controls): Event-Driven, Market Sentiment, Earnings-Driven, Cross-Asset
  Execution, Factor Discovery, Open Theme (Custom). Requires: runnable Demo +
  event-decision-execution flow + paper log from competition period (>=2 weeks).
  Judging: 50% quant (paper Sharpe, max DD, win rate) + 50% judge (explainability,
  architecture, risk layer).
- AI Trading Desk (NL-driven AI research workbench; AI processes/invokes/presents,
  HUMAN TRADERS MAKE FINAL DECISIONS): Information Extraction and Signal
  Generation, Review and Self-Evolution, Decision Stress Testing, Personalized
  Research Workbench, Execution Assistance, Open Theme (AI-assisted tools for human
  traders; portfolio-copilot example). Requires: accessible Demo + ONE complete
  research task (question to actionable insight) + compliant X post. Judging: pure
  subjective - feature depth (data sources / Skill integration COUNT and
  effectiveness), research quality, LUI fluency, personalized thesis. No weights.
- Why CLINCH is AI Trading Desk, from current rules: hinge-first NL research with
  human-final fits Track 3 positioning verbatim; Alpha requires backtested
  executable strategy code (not CLINCH); Agentic requires LLM-placed orders with
  risk controls (prohibited by CLINCH's own no-execution rule). S1 reasoning
  replaced by this S2-anchored answer.

### Open Theme / Wildcard [CONFIRMED - CLINCH lane exists]

- Every track has 5 named sub-themes + 1 Open Theme (select "Open Theme" in form,
  describe direction + validation; no extra fields). Landing-page "Wildcard award
  500 x 6, two winners per track" = guide's "Open Theme Prize: 6 slots, 500 USDT,
  2 winners per track (top 1 per open slot), no tiers". CLINCH lane: AI Trading
  Desk Open Theme (eligible; no disqualifier found). Decision Stress Testing is the
  closest named alternative if Director prefers a named slot.

### Deadline [CONFIRMED date+timezone; time UNKNOWN]

- Submission window September 3-21, 2026 (UTC+8); "before 9/21"; judging/voting
  from 9/22; winners 10/8; payouts/Spotlight from 10/9. Date 2026-09-21 CONFIRMED.
  Timezone UTC+8 CONFIRMED for the window. Cutoff HOUR/minute: NOT published -
  UNKNOWN (assume end-of-day 9/21 UTC+8 at own risk; P25 re-verifies; submit early).
- Minor internal inconsistency [CONFLICT C5]: voting window shown as 9/22-9/28
  (timeline table, landing page) and 9/22-10/7 (guide audience section + step).
  Judge review 9/22-10/7. Does not affect build.

### Judging [CONFIRMED]

- AI Trading Desk: pure judge subjective scoring on feature depth (incl. Skill
  integration count/effectiveness), research quality, LUI fluency, personalized
  thesis. No numeric weights (weights concept does not apply). Description parts
  1-3 (thesis, target user, validation) carry the most weight. "All traders" as
  target user is explicitly rejected - P2 must name a concrete segment. Figures
  must be labeled observed/estimated/targeted; targets allowed.

### Prizes [CONFIRMED]

- 50,000 USDT pool; Grand 3,000 x1 (best overall); Theme 500 x15 (1 per named
  sub-theme); Open 500 x6 (2/track); University Special 500 x10 (fill "University
  Name"; mutually exclusive with main-track prizes); Best Spread 300 x3 (1/track,
  own/team reach only, no KOL/KOC ghost-posting, excluded if main prize won);
  Fan Favorite 300 x3 (top-voted per track; STACKS with everything); audience
  Lucky Draw 1,000 pool (50 x 20) + Prediction 1,000 (earliest 50 Grand-prize
  voters). Judge-side: highest tier only (Grand > Theme/Open > Spread).
  Multi-entry: evaluated/awarded separately.
- Beyond cash: Spotlight from 10/9, Demo Day (opt-in checkbox, all teams eligible,
  winners/high-scores prioritized; internships, beta access, investor intros),
  Playbook productization track (separate review, possible revenue share),
  Qwen credits (separate form, first 300 KYC teams, 30U) + K3 subsidy (form
  checkbox, 30U; both up to 60U).
- Rising Talent action for CLINCH: fill the full university name at submission;
  details of whose name (owner's) deferred to P23/P25. No action before submission
  except KYC only if Qwen credits wanted (optional, no judging effect).

### Submission requirements [CONFIRMED]

- Portal: Google Form https://forms.gle/GyWZCMCPocgJdJon6 (CN+EN, same fields).
- Required: 6-part project description IN the form (thesis highest weight; target
  user; validation; progress; deliverables; optional AI-trading take) + "Role of
  the LLM" field + materials link (Demo/code/video/docs/logs in ONE field) +
  compliant X post link (#BitgetHackathon + @Bitget_AI + substantive intro +
  retweet of official post; NO X post = invalid submission) + track/sub-theme
  selection. Optional: university, Demo Day checkbox, K3 checkbox.
- Invalid iff: missing X post, description, or accessible materials. Weak
  productization/validation lowers score but does not invalidate.
- NO published rule found on: video duration/host (video only ever optional
  material - S2 has no "2-3 minute" rule; P24 stance holds), repo
  visibility/license type (GitHub not even explicitly mandated for Track 3 -
  "accessible Demo" is; use public repo anyway, P25 confirms), code originality
  beyond the S1-reuse bar, disqualifiers beyond invalid-submission + S1-reuse.
- For AI Trading Desk specifically: NO trade execution, NO paper log, NO backtest
  required. BUY/WAIT/AVOID-style actionable conclusions: explicitly required
  ("actionable insight") with human-final; no disclaimer rule published (add one
  anyway in P8).

### S2 vs S1 firewall (explicit)

- S1 June dates, S1 track names, S1 prize table (6,600/1,500/800), S1 "max 3 min"
  video, S1 forms/links, S1 registration flow: all recorded historical only, none
  used above. Every fact in section 22 comes from the two S2 sources.
- Count ambiguity [CONFLICT C6, minor]: guide Ch.II says 15 named sub-themes;
  form-field text says "18 named topics + 3 Open Themes" (5x3=15 named per Ch.IV
  tables). Likely counting drift; does not affect CLINCH (Open Theme path
  unaffected). P25 re-checks.

### Reality/rToken under S2 (answers Q1-6 of Reality conflict)

- S2 theme is rToken-centric (after-hours pricing, rToken factors, 7x24 windows);
  guide mentions rToken 14x. No whitelist/access text in the S2 guide (0 hits):
  endpoint access still governed by api-doc/support/academy sources, so C1 stands
  unchanged for P4. Ticker/candles public vs depth/fills disputed - P4 tests.
- CLINCH rToken posture unchanged: HIGH read-only feasibility, depth P4-gated.

### Corrections to earlier P1 sections

- Sections 3-8 S2 UNKNOWNs are superseded by section 22 where confirmed.
- Remaining UNKNOWN after S2 reads: cutoff hour (time), TBD links (voting post,
  official X post, Qwen form link shown as forms.gle/2QeJpvGB5VpipqQ68 in one
  place and TBD in another - use submission-form flow), judges full list, C5
  voting-end date, C6 topic count, license-type silence (treated as no constraint,
  P25 confirms), full university-rules detail beyond the table.
- Q&A deltas to section 21: Q1 YES (AI Trading Desk confirmed S2 Track 3);
  Q2 YES (human-final explicit in Track 3 positioning); Q3 answered (5 named +
  Open listed above); Q4 YES (Open Theme in every track; Wildcard = Open Prize);
  Q5 YES eligible; Q6 2026-09-21 CONFIRMED; Q7 UNKNOWN (hour); Q8 UTC+8 window
  CONFIRMED; Q10 answered (focus areas above); Q11 N/A (subjective, no weights);
  Q12 Track 3 requires Demo + 1 research task + X post + description (no
  execution); Q13 NO execution required; Q14 YES allowed (actionable insight
  required; add disclaimer in P8).
