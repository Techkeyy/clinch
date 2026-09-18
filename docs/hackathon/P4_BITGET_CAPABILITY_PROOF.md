# CLINCH P4 — Bitget Capability Proof

## 0. State metadata

- P4 BUILDING (P0-P3 PASS; P5-P27 NOT STARTED; overall BUILDING). Probed 2026-09-11
  ~22:57-23:15 UTC (Friday; US equities closed 20:00 UTC, so all observations are
  OFF-HOURS). Zero credentials used, zero writes, zero orders. No product code:
  `proof/p4/probe.ps1` is a proof-only single-request runner; no app, routes,
  adapters, or dependencies created.
- Environment finding (affects all reads): this host's default DNS resolver times
  out on `*.bitget.com` (api + www) while 8.8.8.8 resolves them fine
  (api.bitget.com -> Cloudflare 104.18.14.166/15.166) and `datahub.noxiaohao.com`
  resolves on BOTH resolvers. Cause: selective local-resolver filtering of
  bitget.com, not Bitget blocking. All api.bitget.com probes used a per-command
  `curl --resolve` override; machine config untouched. Production must re-verify
  DNS (P18). `bgc` network calls fail from this host for the same reason (its
  introspection/`discover` works offline); the exact v3 paths `bgc` calls were
  proven by direct REST instead (bgc's own error line names them, e.g.
  `GET /api/v3/market/instruments`).
- Symbol correction: canonical Reality spot form is UPPERCASE with R prefix and no
  separator: `RNVDAUSDT` (P1-P3 wrote `rNVDA`/`rNVDAUSDT`; V2 accepts lowercase
  input and returns uppercase). RWA perps drop the R: `NVDAUSDT` on USDT-FUTURES
  (`symbolType: stock`, `isRwa: YES`).

## 1. Reality discovery — CORE-PROVEN

- Method: `GET /api/v3/market/instruments?category=SPOT` (UTA v3, anonymous,
  ~1.8s, code 00000). Sample: `proof/p4/sample-instruments-spot-reality.json`;
  symbol list: `proof/p4/reality-symbols.json`.
- Result: 1761 SPOT instruments; `isReality` field present with values yes/no;
  1173 yes, ALL `status: online`, ALL matching `R[A-Z]{1,6}USDT`.
- `RNVDAUSDT` present. Also verified present: RTSLAUSDT, RAAPLUSDT, RMSFTUSDT,
  RSPYUSDT, RQQQUSDT, RAMDUSDT, RMETAUSDT.
- Futures: `GET /api/v3/market/instruments?category=USDT-FUTURES` (787 rows):
  NO `isReality` field; instead `isRwa` YES/NO with 321 YES (sample:
  `proof/p4/sample-instruments-fut-rwa.json`); `NVDAUSDT` present
  (`symbolType: stock`, maker 0.0002, taker 0.0006).
- Answers: rNVDA discoverable as RNVDAUSDT (spot) + NVDAUSDT (perp). Flags real
  (`isReality`/`isRwa`). 1173 + 321 discoverable, all online, no hardcoding needed.
  Fields that matter: symbol, category, status, isReality/isRwa, pricePrecision,
  minOrderQty, symbolType.
- Hinge use: discovery itself is BASELINE plumbing (find the tradeable symbol),
  proven live.

## 2. Reality ticker — CORE-PROVEN (BASELINE + RESEARCH)

- `GET /api/v3/market/tickers?category=SPOT&symbol=RNVDAUSDT` (874/899/951ms over
  3 runs; RAAPLUSDT 810ms): code 00000. V3 fields: lastPrice 218.24-218.26,
  openPrice24h, high/lowPrice24h (220.01/218.05), bid1/ask1Price + Size
  (218.22/218.24, sizes in hundreds), price24hPcnt -0.00091, volume24h,
  turnover24h, platformTurnover24h, ts 1789167738062 (fresh, matches probe time).
  Files: `proof/p4/ticker-RNVDAUSDT*.json`, `ticker-RAAPLUSDT.json`.
- V2 cross-check `/api/v2/spot/market/tickers?symbol=rNVDAUSDT` (1488ms): same
  picture (lastPr 218.22, bid/ask, 24h change -0.00086). Note: V2 `openUtc`/
  `changeUtc24h` returned "0" (off-hours UTC-day artifact, recorded).
- FR-03 verdict: YES, truthfully powers the baseline (price, move, spread depth
  hint, freshness). Product role: BASELINE + RESEARCH (move size feeds
  continuation/exhaustion hinges).

## 3. Reality candles — CORE-PROVEN (BASELINE + RESEARCH)

- `GET /api/v3/market/candles?category=SPOT&symbol=RNVDAUSDT&interval=<1m|5m|15m|1H|4H|1D>&limit=5..10`:
  ALL SIX guide intervals succeed (806-1033ms each), 7-column rows
  [ts,o,h,l,c,vol,turnover], no gaps/dupes/malformed in samples. RAAPLUSDT 1D
  also succeeds. Futures `NVDAUSDT` 1H candles succeed (734ms).
- Off-hours observation (native closed, Friday ~23:00 UTC): 1m prints through
  23:02, 5m/15m/1H through 23:00, 4H through 20:00; 1D bars stamped 16:00 (native
  close boundary). Continuous post-close prints = internal liquidity, thin but
  live. Pre-2026-07-09 volume caveat not re-tested (history depth is P10 concern).
- Hinge classes served: stabilization vs continued selling (candle direction +
  volume into the close), price structure (levels from 1H/4H), volatility
  expansion (ranges). NOT called "technical analysis": raw structure only; the
  indicator layer is unevaluated and unneeded for these hinges.

## 4. Depth — CORE-PROVEN (RESEARCH, off-hours caveat)

- `GET /api/v3/market/orderbook?category=SPOT&symbol=RNVDAUSDT&limit=20`
  (1562ms, 00000): 20 asks + 20 bids with sizes, fresh ts 1789167781492
  (e.g. ask 218.24x1.26, bid 218.20x0.90, sizeable lots deeper). File:
  `proof/p4/depth-RNVDA.json`.
- Doc-conflict impact: the general v3 orderbook serves RNVDAUSDT with NO auth and
  NO whitelist. The guide's "whitelist required" refers to a Reality-specific
  depth endpoint/class this product does not need.
- Hinge use: thin-liquidity and one-sided-pressure hinges (spread/sizejoins the
  *"is this move supported"* question). Caveat: off-hours internal liquidity per
  rToken FAQ; depth shape may differ in-hours (P10 notes session dependence).

## 5. Fills — AVAILABLE-NOT-USEFUL (stale rToken flow)

- `GET /api/v2/spot/market/fills?symbol=RNVDAUSDT&limit=10` (1699ms, 00000):
  10 rows with tradeId/side/price/size/ts, BUT newest print 09-08 00:00 UTC =
  ~95h stale at probe time (~231 vs current ~218).
- Control `symbol=BTCUSDT` (1000ms): 5 rows, max age 85 SECONDS. Endpoint healthy;
  rToken flow specifically thin/stale. v3 `recent-fills`/`trades` paths guessed:
  40404 (wrong paths, not a product signal).
- Verdict: accessible yet decision-useless for live hinges (stale flow; candles
  carry the live structure). NOT integrated. Recheck in P10 if in-hours flow
  ever matters.

## 6. RWA-perp positioning — CORE-PROVEN (second RESEARCH PATH)

- `GET /api/v3/market/tickers?category=USDT-FUTURES&symbol=NVDAUSDT` (839ms):
  lastPrice 218.49, bid/ask, volume, PLUS indexPrice 218.3176, markPrice 218.48,
  **fundingRate 0.000149**, **openInterest 70316.16**. Standalone OI endpoint also
  live (911ms). Futures 1H candles live. File set: `fut-ticker2/oi/candles.json`.
- `RNVDAUSDT` under USDT-FUTURES correctly absent (25100 "does not exist"):
  perp namespace uses unprefixed symbols, proven via discovery, not assumed.
- Standalone funding-rate paths tried (`/api/v3/market/funding-rate`,
  `/api/v2/mix/market/funding-rate`): 40404; rate obtained inside futures ticker
  instead. No capability gap, only path knowledge.
- Hinge use: crowding/positioning hinges (elevated funding + rising OI into an
  event = coin-flip entry; index-vs-mark dislocation). Materially distinct from
  Path 1 (positioning vs price structure).

## 7. Doc-conflict resolution (per class)

| Capability | Docs claim | Live anonymous result | Final P4 |
|---|---|---|---|
| instruments (spot) | isReality flag, public | 1761 rows, flag real, 1173 yes | CORE-PROVEN |
| instruments (futures) | RWA lineup (academy) | 787 rows, isRwa YES x321 incl NVDAUSDT | CORE-PROVEN |
| ticker (spot/fut) | public | fresh both, fut adds funding/OI/mark/index | CORE-PROVEN |
| candles (all 6 guide intervals) | public, market-type | all succeed + off-hours prints | CORE-PROVEN |
| orderbook (general v3) | guide: Reality-specific depth whitelist-only | 20x20 live, no auth | CORE-PROVEN (general path; Reality-specific endpoint unneeded) |
| fills (V2 public) | guide: fills whitelist-only | accessible but 95h stale on rToken | AVAILABLE-NOT-USEFUL |
| place/cancel orders | whitelist vs Aug-11 open (C1) | NOT TESTED (out of scope: no execution, no auth attempted) | UNTESTED, irrelevant to core |

## 8. Agent Hub / bgc

- `bgc` 3.0.0 (bundles SDK 3.1.0) verified live: `--help` lists intent verbs +
  meta; `discover` works offline (7 domains, 14 tools); market verb schema
  confirms public auth + 16 fronts. Network calls from this host fail ONLY on
  host DNS (proven: identical v3 paths succeed via direct REST; bgc's own error
  names `GET /api/v3/market/instruments`, the path proven live in section 1).
- Product question: bgc adds a semantic verb layer over the SAME v3 operations
  proven here; no additional data value demonstrated beyond interface. For a
  custom backend, direct proven paths suffice; bgc remains the AI-host/terminal
  route and the P6 surface option. Classification: CONTEXT-PROVEN (interface
  value, data-equivalent, live-network unexecuted from this host for DNS reasons).

## 9. bitget-signal scorecard (MCP `market-data-mcp` v1.26.0, session handshake proven)

| Skill (tool tested) | Executes? | Direct rToken? | Cross-market useful? | Current? | Provenance | Latency | Hinge | Classification |
|---|---|---|---|---|---|---|---|---|
| technical-analysis (`technical_analysis` rsi) | YES (BTC 40.51 neutral) | NO ("No OHLCV data for RNVDAUSDT/4h") | NO for rToken structure | n/a | n/a | 0.8s | none | AVAILABLE-NOT-USEFUL (rToken) |
| news-briefing (`news_feed` search+latest) | YES (empty sets) | NO (Nvidia: 0 items) | NO (Bitcoin control also 0) | NO data | feeds named | ~21s then empty | none | UNAVAILABLE-as-observed (backend empty tonight; retest, do not integrate) |
| macro-analyst (`macro_indicators`, `rates_yields`) | YES (empty sets) | NO | UNPROVEN (FRED empty; Fed RSS fetch fails) | NO data | FRED named | ~21s then empty | none | UNAVAILABLE-as-observed |
| sentiment-analyst (`sentiment_index`) | TIMEOUT (30s ping only) | NO (crypto-only by schema) | NO (strict: crypto positioning is noise for rToken) | NO data | n/a | >30s | none | UNAVAILABLE-as-observed + AVAILABLE-NOT-USEFUL in kind |
| market-intel (not separately called; shares crypto/on-chain backends) | schema only | NO (tarball: zero rToken) | UNPROVEN, likely NO | unknown | mixed 3rd-party | unknown | none | CONFLICT (usefulness unproven; P10 retest or drop) |
| cross_asset (NVDA/QQQ attempt) | arg-shape error then 30-70s timeout/error | intended YES | UNPROVEN | NO data | Yahoo named | >30s | none | UNAVAILABLE-as-observed |
| tradfi_news (company/news NVDA) | YES (empty `{"error":""}`) | intended YES | UNPROVEN (Finnhub key missing server-side, presumably) | NO data | Finnhub named | ~16s then empty | none | UNAVAILABLE-as-observed |

- Session mechanics proven: initialize -> `mcp-session-id` -> notifications ->
  tools/list (19 tools) -> tools/call. Wrong action names produce clean
  `Unknown action` errors (macro `calendar`, TA `composite`); correct enums taken
  from live schemas. Individual invocation: YES, each tool callable alone.
- Honesty note: one session, one night. "UNAVAILABLE-as-observed" = backends
  empty/slow tonight (RSS/FRED/Yahoo/key-dependent), NOT proof of permanent death.
  P10 retests before any integration; nothing from this surface enters v1 now.

## 10. Other Bitget capabilities

- `crypto_price` (FreeCrypto), `global_data` (forex/weather/wiki), `backtest`
  (VectorBT), `derivatives_sentiment` (Binance-based), `defi_analytics`,
  `dex_market`, `network_status`, `social_trending`, `cn_market`,
  `global_assets`, `crypto_derivatives`, `crypto_market`: inspected via live
  schemas; none rToken-suitable on description (crypto-only, wrong venue, or
  backtest/execution-adjacent). Not called (no hammering rule + no hinge case).
  No S2-specific rToken data tooling beyond Reality/UTA found on surfaces tested.

## 11. Distinct research paths — GATE: PASSED

- Path 1 (price/market-structure from Reality spot data): ticker + 6-interval
  candles + 20-level depth, all live anonymous fresh. Serves continuation,
  exhaustion, structure, thin-liquidity hinges.
- Path 2 (rToken derivatives positioning): futures ticker (funding, OI, mark,
  index) + futures candles + standalone OI. Serves crowding, event-risk,
  dislocation hinges. Genuinely different evidence (positioning vs price).
- Selectivity: independent endpoints, individually callable, combinable per hinge.
- NOT counted: bgc wrappers of the same v3 paths; per-interval candle variants;
  fills (stale duplicate); crypto sentiment as rToken signal.

## 12. Hinge usefulness (concrete)

- "Has the off-hours decline continued enough to show persistent selling?"
  Path 1 (1m/15m continuation + volume) -> remain holding off vs stabilization
  reopens timing research.
- "Is the move supported or thin air?" Path 1 depth (spread/size/one-sided book)
  -> supported dip-buy candidate vs step-aside.
- "Is positioning too crowded to enter before the event?" Path 2 (funding
  elevation + OI build) -> wait-for-event vs proceed-with-trigger.
- "Spot vs perp dislocation?" Path 1+2 (218.24/26 spot vs 218.48 mark,
  index 218.32) -> dislocation hinge when spreads widen.

## 13. Provenance

- Reality v3/v2 REST: STRONG (official api.bitget.com, endpoint + symbol +
  server ts + requestTime captured per file; user-showable as "Bitget market
  data, observed <time>").
- RWA-perp fields: STRONG (same transport, funding/OI/mark/index in-ticker).
- MCP TA crypto: ACCEPTABLE transport, IRRELEVANT content for rToken.
- MCP news/macro/sentiment tonight: UNUSABLE (no data returned).
- bgc interface: ACCEPTABLE (official tool, data-equivalent, network unexecuted
  here). No WEAK decision-critical source is proposed for v1.

## 14. Latency + 90-second feasibility: YES

- Observed: discovery ~1.8s (one-time; cacheable), tickers 0.8-1.0s (5 samples),
  candles 0.7-1.0s each, depth 1.6s, futures ticker/OI 0.7-0.9s, MCP-TA 0.8s,
  MCP-data tools ~16-30s-then-empty (excluded from budget: unused).
- Illustrative conservative sequence: discovery cached 0s + baseline ticker 1s +
  Path-1 candles batch (3 calls, sequential) 3s + Path-2 futures ticker 1s +
  depth 2s = ~7s transport for a two-path hinge cycle; even tripled with
  model-side reasoning headroom, the 90-second journey stays feasible. Worst
  single observed (useful): 1.7s. Classification: YES.

## 15. Failure taxonomy (observed signatures)

- INVALID INPUT: unknown symbol -> `40034 "Parameter ZZZZUSDT does not exist"`.
- UNSUPPORTED: R-prefixed symbol on USDT-FUTURES -> `25100 "Trading pair ...
  does not exist"`; rToken in TA backend -> `{"error":"No OHLCV data for ..."}`.
- BAD PARAM: unknown interval -> `40020 "Parameter 2H error"`; unknown category
  -> `40034` with naming message (distinguish by message, not code).
- WRONG ROUTE: `40404 "Request URL NOT FOUND"` (guessed v3 fills/trades/funding
  paths).
- NO DATA (valid, empty): MCP news/macro/rates/tradfi calls returning
  `{"error":""}` or empty item sets with 00000-style envelopes.
- SERVICE/UPSTREAM FAILURE: MCP 16-30s latencies resolving to empty; Fed RSS
  explicit fetch failure; sentiment/cross_asset timeouts (SSE ping only).
- ENV/NETWORK: host DNS timeout on bitget.com (local resolver; 8.8.8.8 fine);
  SDK NetworkError after retries.
- NEGATIVE EVIDENCE: not yet observed as a distinct signal (a researched-and-
  absent finding differs from empty-backend; P5/P11 design must preserve the
  distinction; backends tonight could not supply either).

## 16. Credential matrix (live-verified)

| Capability | Anonymous works | Service auth possible | End-user creds required | Whitelist | Core-compatible |
|---|---|---|---|---|---|
| Reality discovery/ticker/candles/depth (v3) | YES (proven) | n/a (none needed) | NO | NO (general paths) | YES |
| RWA-perp ticker/OI/candles/funding-in-ticker | YES (proven) | n/a | NO | NO | YES |
| V2 fills (rToken: stale) | YES | n/a | NO | NO | YES but unused |
| MCP handshake/tools-list/TA-crypto | YES (proven) | n/a | NO | NO | YES but unused for rToken |
| MCP news/macro/sentiment content | NO DATA tonight | unknown | NO (no key asked) | NO | n/a |
| bgc write/trade verbs | UNTESTED (rightly) | operator key (P4 refuses) | YES by design | n/a | N/A (no execution) |
| Reality place/cancel | UNTESTED | n/a | n/a | disputed (C1) | N/A |

No core path needs user credentials. No secret encountered, requested, or stored.

## 17. Final capability matrix

| Capability | Live? | Core-auth? | rToken direct? | Hinge useful? | Provenance | Latency | Product role | P4 class |
|---|---|---|---|---|---|---|---|---|
| Reality discovery (v3 instruments) | YES | YES | YES (1173) | YES (symbol truth) | STRONG | ~1.8s | BASELINE | CORE-PROVEN |
| Reality ticker (v3) | YES | YES | YES | YES (move/spread) | STRONG | ~0.9s | BASELINE + RESEARCH | CORE-PROVEN |
| Reality candles x6 intervals | YES | YES | YES | YES (structure) | STRONG | ~0.9s | BASELINE + RESEARCH | CORE-PROVEN |
| Reality depth 20x20 | YES | YES | YES | YES (liquidity hinges) | STRONG | 1.6s | RESEARCH | CORE-PROVEN |
| RWA-perp ticker+funding+OI+mark/index | YES | YES | YES (321) | YES (crowding) | STRONG | ~0.9s | RESEARCH | CORE-PROVEN |
| RWA-perp candles | YES | YES | YES | YES (perp structure) | STRONG | 0.7s | RESEARCH | CORE-PROVEN |
| V2 public fills (rToken) | YES stale 95h | YES | YES | NO (stale) | STRONG | 1.7s | NOT USED | AVAILABLE-NOT-USEFUL |
| bgc market interface | offline YES; net blocked by host DNS | YES | via same v3 | interface only | ACCEPTABLE | n/a live | NOT USED (P6 option) | CONTEXT-PROVEN |
| MCP TA (crypto) | YES | YES | NO (proven) | NO for rToken | ACCEPTABLE | 0.8s | NOT USED | AVAILABLE-NOT-USEFUL |
| MCP news/macro/sentiment/rates/tradfi | handshake YES; content EMPTY tonight | YES (no key asked) | intended, unproven | UNPROVEN | UNUSABLE tonight | 16-30s empty | NOT USED | UNAVAILABLE-as-observed |
| market-intel et al (uncalled) | schema only | unknown | NO per tarball | UNPROVEN | WEAK (mixed 3rd-party) | unknown | NOT USED | CONFLICT (retest or drop in P10) |
| Orders/trading verbs | UNTESTED | n/a | n/a | n/a (no execution) | n/a | n/a | NOT USED | AUTH-GATED (by design, out of scope) |

## 18. Go / no-go

No Director-review condition fired: baseline reliable and fresh; 1173+RWA
instruments dynamically discoverable; rNVDA works end to end (spot + perp);
timestamps fresh; TWO materially distinct paths proven and selectively callable;
zero user-credential needs; provenance STRONG on all used sources; 90s feasible
(~7s transport per two-path cycle); failures distinguishable; zero fixture proof.
rNVDA depends only on proven-open general paths (Reality-specific privileged
endpoints unneeded). MCP content gap is contained: v1 does not need it.

## 19. Implication for P5

P5 MAY PROCEED on Reality spot structure + RWA-perp positioning as the two
evidence families. P5 must NOT assume news/macro/sentiment-tool availability;
hinge fixtures must be answerable from price-structure and positioning evidence
until P10 re-proves the MCP backends.
