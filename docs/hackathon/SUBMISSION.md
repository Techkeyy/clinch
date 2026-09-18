# CLINCH — Submission Package (copy-ready, S2 Google Form)

## A. Project Name

CLINCH

## B. Track

AI Trading Desk

## C. Sub-theme

Open Theme

## D. Project Description (paste as one long-form answer)

1. Thesis. Tokenized US stocks trade 7x24 while the underlying companies do not, so off-hours prices keep printing on thin internal liquidity and most visible "moves" are decision-useless noise. Existing AI trading tools respond with more information: more signals, more charts, more sentiment. CLINCH's hypothesis is that one unanswered question, the Decision Hinge, carries almost all of a trading decision's value, and that a desk which finds that question, researches only it with live market evidence, and stops when further research cannot matter will beat dashboard overload. The hinge-first loop with selective evidence and an explicit stop rule is the custom mechanism no named sub-theme describes, which is why this enters Open Theme.

2. Target user and product value. Retail holders and watchers of Bitget tokenized US stocks: spot rToken positions roughly $100 to $5k, a few entry/wait/exit decisions per month, concentrated in NVDA/TSLA/AAPL-class names, often deciding off-hours. They lose money acting on thin-move noise and lose time triaging dashboards. CLINCH gives them one evidence-backed read (slightly favorable, better to wait, no clear advantage, or not enough evidence yet), the completed evidence, what was deliberately skipped and why, and what to watch next. A Decision Watch then monitors exactly one state change and notifies once via Telegram; the human always makes the trade and CLINCH never executes anything.

3. Validation data and key metrics (labeled). OBSERVED: live catalog of 1,653 tokenized stocks where every visible stock passes the researchability contract (1,653 visible, 1,653 researchable, 0 broken); 223 automated tests passing; a full production research brief completed end to end (META: dilemma to hinge to evidence to stopped brief); guest-to-account claim of 8 research rows in one call with 2 foreign rows correctly rejected; a live Tesla Decision Watch processed every ~10 minutes across a ~24-hour soak with zero false transition alerts; Telegram linking, confirmation receipt, and companion flows verified in production. ESTIMATED: none claimed. TARGET: 25 external trial users and 5 retained weekly watchers in the first month after submission; distribution via the required X launch post, Bitget builders community, and Demo Day if invited.

4. Progress. Built and deployed: deterministic research kernel (hinge, selective families, stop rule), live Bitget Reality discovery plus ticker/candles/depth plus RWA-perp positioning, Qwen language understanding, Clerk OTP auth with guest-to-account claim, Neon persistence, durable VPS Decision Watch worker with exclusive leases and deduped Telegram dispatch, Telegram companion (home, watches with pause/resume/stop, recent research, deep links). Fixed in production: catalog integrity (META end-to-end), Clerk cookie-namespace desync, claim idempotency. Not built: trade execution (never planned), a duplicated research engine inside Telegram (companion only), WhatsApp adapter (dispatcher is channel-neutral). Next: demo video recording, then distribution.

5. Deliverables. Live demo: https://clinch-nine.vercel.app. Code: https://github.com/Techkeyy/clinch. README with architecture, quickstart, adversarial table, and known limits. Demo video link added after recording. This file plus FINAL_HACKATHON_COMPLIANCE.md as process evidence.

6. Take on AI Trading (optional). The scarce resource in AI trading is not signal volume but attention triage: most agent demos celebrate autonomy while quietly moving the diligence burden onto the user. CLINCH bets the winning shape is a skeptical assistant with a stop rule, judged on what it refused to research as much as what it found.

## E. Role of the LLM

Qwen (`qwen3.8-max` via the sponsored Chat Completions-compatible gateway) interprets the trader's natural-language dilemma (asset, action, timeframe) so the deterministic kernel can work from clean intent. All financial logic, support checks, reads, hinge selection, skip decisions, and stop decisions live in deterministic, tested code; Qwen never decides whether an asset is supported, never classifies evidence, and never trades. No Qwen credits were consumed beyond normal gateway usage for intent parsing during development and production research.

## F. Submission Materials

- Live app: https://clinch-nine.vercel.app
- GitHub: https://github.com/Techkeyy/clinch
- README.md in repo root (architecture, quickstart, proof tables)
- Demo video: link added after recording (script: DEMO_SCRIPT.md)

## G. X Post Draft (owner posts manually; must quote-tweet the official status)

Post as a quote-tweet of https://x.com/Bitget_AI/status/2100519318824055159 :

"Meet CLINCH, my AI Trading Desk entry for #BitgetHackathon. You describe the trade; it finds the ONE question that would change your decision, researches it with live Bitget rToken data, and stops when more research won't matter. Human decides. Bot never trades. Try it live: https://clinch-nine.vercel.app @Bitget_AI"

Requirements check: contains #BitgetHackathon and @Bitget_AI, substantively introduces the product, quotes the required status, links the live demo. Not a pure retweet.

## H. University

No verified institution in project records. Owner fills the University Name field only if eligible, otherwise leaves blank. Do not invent.

## I. Demo Day

Recommend CHECKING "Apply for Demo Day": open to all teams, zero cost, priority for winners and high-scoring projects, connects to internships, beta access, and investors. Owner makes the final call.
