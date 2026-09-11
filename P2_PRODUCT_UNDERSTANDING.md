# CLINCH P2 — Product Understanding

## 1. Verification / state metadata

- Phase: P2 BUILDING (P0 PASS, P1 PASS accepted by Director; P3-P27 NOT STARTED; overall BUILDING).
- Timestamp: 2026-09-11. No product code written. No architecture locked. No P3 work.
- Governing skill: `project-understanding` (read in full; phases applied: 0 one sentence,
  1 problem story, 2 before/after, 3 actors, 4 journey, 5 magic moment, 6 boxes,
  10 AI roles, 12 core loop, 13 state, 14 trust, 15 load-bearing assumption,
  17 non-goals, 18 end-to-end story, 19 three levels, 20 test questions; chain-specific
  phases skipped per the skill's own rule, CLINCH has no chain component).
- P1 constraints preserved: AI Trading Desk Track 3, Open Theme lane, human-final,
  no wallet/account/key for core use, 2026-09-21 (UTC+8, hour unknown) deadline,
  subjective judging (feature depth incl. Skill count/effectiveness, research quality,
  LUI fluency, personalized thesis), concrete target segment required.

## 2. Product in one sentence

CLINCH helps self-directed traders considering tokenized stock trades outside normal
market hours decide what to do by finding the one unanswered question most capable of
changing their decision, researching it with live Bitget data, and stopping when more
research would no longer matter.

## 3. Primary target user

Selected: **Candidate A: self-directed retail traders considering tokenized U.S. stock
trades outside normal U.S. market hours** (evenings, weekends, holidays, pre-market;
rToken / Stock+ contexts on Bitget).

Evaluation of candidates:

| Criterion | A (off-hours rToken) | B (news/macro prosumer) | C (portfolio-conscious) |
|---|---|---|---|
| Pain intensity | Highest: must act on partial info while prices move | High but diffuse | Medium: entries can usually wait |
| Frequency | High: every weekend, earnings, macro week | Event-driven, spiky | Occasional per position |
| Bitget-native fit | Exact S2 thesis (7x24 rToken) | Good, less S2-specific | Weakens S2 story |
| Multi-source need | Yes: price action, news, macro, sentiment, technicals | Yes | Moderate |
| Hinge improvement | Highest: time pressure plus partial data makes ranking decisive | High | Lower urgency |
| Demo clarity | Excellent (rNVDA weekend dip) | Good | Harder to stage in 90 seconds |
| Adoption realism | Real: 24/7 access creates the exact confusion CLINCH resolves | Real | Real but slower loop |
| Judging fit | Personalized thesis writes itself from S2 theme | Generic | Risks portfolio-platform scope creep |

Why A wins: the pain (deciding while the market moves on incomplete information) is
the precise situation where ranking questions by decision value beats reading
everything. It is Bitget-native to the point of being the edition theme, it demos in
one weekend chart plus one question, and it keeps scope on single decisions rather
than portfolios. B is adjacent and served automatically. C is served for single-entry
decisions but portfolio management stays a non-goal.

Persona anchor: Maya, 34, trades U.S. tech on Bitget after her day job and on
weekends. Sunday evening: rNVDA is down 4% since Friday close. She has thirty minutes
before the week starts moving. She opens five tabs, reads three contradictory takes,
checks RSI, and is no closer to knowing whether the dip is buyable or the start of
something. Her problem is not lack of data. It is not knowing which question to
answer first.

## 4. Secondary users / access model

Secondary users: news-driven retail traders (B), single-entry portfolio thinkers (C),
curious crypto natives holding their first rToken, and judges evaluating the demo.
Primary user is a design thesis, NOT an access restriction: anyone can open CLINCH and
use the full core flow with no wallet, no account, and no credentials. We optimize
wording, examples, defaults, and the demo around Maya; nothing checks who she is.

## 5. Core problem

A trader considering a tokenized-stock trade outside normal market hours faces more
information than decision. Prices keep moving on partial and conflicting signals while
the native market is closed. Existing tools either dump every indicator on screen or
wait for the trader to already know which question to ask. The trader cannot tell
which unanswered question would actually change their decision, so they either
over-research until the moment passes or act on an assumption they never checked.
Both failure modes cost money and confidence.

## 6. Core promise

CLINCH finds the one unanswered question most capable of changing your trading
decision, researches it with live Bitget data, shows you what it checked, what it
skipped and why, and stops when more research would no longer matter. You decide.

## 7. Before vs after

Before: Maya sees rNVDA down 4% on Sunday. She opens price charts, two news sites, a
sentiment dashboard, and a screener. Each says something plausible. Forty minutes
later she has twelve facts, three of them contradictory, no ranking, and a
deadline: futures open soon. She buys because the RSI "looks oversold," never
checking whether the drop was NVDA-specific or a sector-wide repricing on tariff
news. If it was sector-wide, her entry logic was wrong from the start.

CLINCH intervenes: it asks what she is considering, establishes baseline context,
names the make-or-break question first (is this NVDA-specific or market-wide?),
researches exactly that, updates the read, answers the next hinge (is there support
nearby if she waits for Monday?), visibly skips what cannot change the answer, and
stops with a brief she can act on.

After: Maya spends the same thirty minutes but every minute answers a question that
could change her action. She walks away with a read (lean in, hold off, or stand
aside), the two findings that earned it, the checks deliberately skipped and why,
and the one future event that would flip the read. The difference is not more
information. It is that every piece of information arrived with a decision attached.

## 8. Decision Hinge definition

A Decision Hinge is the currently unanswered question whose plausible answers point
to materially different actions. It is always phrased as a question, never as data.
Example: "Is this 4% drop specific to NVDA, or is the whole semiconductor basket
repricing on weekend news?" If the answer is "NVDA-specific," Maya's dip-buy thesis
survives and the next question is about entry timing. If the answer is "sector-wide
on tariff headlines," the thesis breaks and the next question is whether to stand
aside entirely. Same user, same chart, opposite actions depending on one answer.
That is what makes it a hinge.

What qualifies: an unresolved question with at least two plausible answers that lead
to different actions (proceed vs wait, proceed vs avoid, enter now vs enter later at
a named trigger, thesis intact vs thesis broken, enough evidence vs need more).

What does NOT qualify: an interesting fact with no action attached (all-time-high
trivia); a fifth confirmation of an already settled point; another oscillator reading
when the decision no longer depends on momentum; a longer explanation of a known
cause; a news digest with no stated decision consequence; any check whose every
plausible outcome leaves the current read unchanged (that check is skip material,
not hinge material).

Routing vs hinge, made explicit. A generic router says: "This sounds like news, call
news." It matches topic to tool. CLINCH says: "News matters first because if the
drop is sector-wide on tariff headlines, the dip-buy thesis breaks and Maya should
stand aside, while the RSI cannot change anything until that question is settled."
Topic matching asks what something IS. Hinge reasoning asks what finding would CHANGE
and works backward to the cheapest check that could produce it. The router optimizes
coverage. CLINCH optimizes decisions per unit of research.

"Change the decision" means, conceptually: a reasonable trader in Maya's position
would do something materially different on learning the answer. Proceed becomes wait
or avoid. Enter-now becomes enter-only-if a named trigger prints. The thesis is
declared broken. Or the read stays but its basis shifts enough that the invalidation
trigger must be rewritten. Borderline relevance does not count. P5/P6 decide how to
represent this internally; P2 fixes only the meaning.

## 9. What counts / does not count as a hinge

Counts: NVDA-specific vs sector-wide cause; whether a support level with real
standing exists before Monday; whether positioning is so crowded that a bounce is
likely to fail; whether an approaching event (earnings, Fed, tariff deadline) makes
any entry before it a gamble rather than a trade; whether the rToken price is
dislocated from the native quote beyond normal off-hours spread.

Does not count: reciting the 4% drop (that is context, already known); computing a
sixth indicator that agrees with the first five; summarizing weekend headlines with
no link to Maya's action; re-checking a settled hinge "to be thorough"; any research
whose result arrives after the decision window it was meant to serve.

## 10. Stop / skip concepts

CLINCH stops researching when the plausible outcomes of the remaining available
checks are unlikely to materially change the current read. Plainly: when everything
left to check would only confirm, decorate, or arrive too late, CLINCH says so and
stops. This is a product rule, not an optimization: endless research is the failure
mode CLINCH exists to remove.

A further step is justified only when: a live hinge exists (two plausible answers,
different actions), a Bitget capability can plausibly resolve or shrink it, and the
answer could arrive while it still matters. A path is skipped when every plausible
outcome leaves the read unchanged, when the question is already settled by stronger
evidence, or when the data cannot exist yet (native market closed with no proxy).
Skips are shown, never silent: each names the check and the one-line reason.

Stopping leaves honest residue. CLINCH names what remains unknown, states the read
as conditional ("leaning in, provided no tariff headline before Monday open"),
publishes the invalidation trigger ("a sector-wide down open beyond 1.5% flips this
to stand aside"), and timestamps everything against the market clock. Uncertainty is
displayed as structure, not as apologetic vagueness.

## 11. Complete user journey

Entry: Maya opens the deployed CLINCH link on her phone. First screen: one line on
what CLINCH does, one input box, three example dilemmas (rNVDA weekend dip first).
No signup, no wallet button, no API key field, no settings maze. Value is visible in
seconds: the examples teach the shape of a good question.

Input: Maya types or taps: "rNVDA fell about 4% this weekend. I'm considering buying
the dip." No symbols to memorize, no timeframe pickers required. If she names no
action, CLINCH asks one clarifying question (buy, wait, or avoid framing), because a
hinge needs a decision to hinge on.

Understanding: CLINCH restates in one line: "You are considering buying rNVDA after
a 4% weekend drop, ahead of Monday's open. Correct?" Maya confirms or corrects with
one tap. This visible restatement is the contract: everything downstream must serve
this decision.

Baseline context: CLINCH pulls live Bitget context (rNVDA quote, move size, session
note that the native market is closed and liquidity is internal) and shows it as a
compact strip: price, change, session, data time. No endpoint names, no raw JSON.

Hinge 1: CLINCH presents the make-or-break question in plain words: "First we need
to settle this: is the drop specific to NVDA, or is the whole chip basket repricing?
Your dip-buy only makes sense if it is mostly NVDA." One sentence of why this
question outranks everything else.

Research: under the hinge, CLINCH narrates live work as checks begin: "Checking
sector context first, because a sector-wide cause breaks the dip thesis." Each check
shows what is being asked and which capability answers it, in user words ("weekend
semiconductor price action", "tariff headlines since Friday"). Loading states never
freeze the screen; partial findings stream in labeled as partial.

Result: the finding lands attached to the hinge: "Sector-wide: the basket is down
3 to 5% on tariff headlines. The drop is mostly not NVDA-specific." The read updates
visibly: from undecided to "holding off", with the reason one line long.

Re-evaluation: the hinge resolves against the dip-buy. CLINCH says so plainly and
pivots: the new hinge is "does anything about Monday's open still favor an entry,
or is standing aside the trade?" The user watches the reasoning turn, not just the
conclusion change.

Next hinge: because tariff headlines drive the read, the next check is news/macro
depth (what exactly was announced, is more expected before open), not RSI. Order
follows decision value, and the UI says that out loud each time.

Skip: technicals appear as a deliberate skip card: "Skipped: momentum indicators.
Reason: with a sector-wide tariff cause unresolved, no RSI value would change the
hold-off read. Revisit after the open if the cause clears." The skipped check is
visible, reasoned, and reversible.

Stop: when the remaining checks (a fifth indicator, older headlines, unrelated
coin sentiment) cannot move the read, CLINCH stops and says why: "Further checks
available, none likely to change the hold-off before Monday's open. Stopping here
is the product working, not giving up."

Final brief: one screen. Decision restated. Current read with one-line reason. The
two or three findings that earned it, each with source and time. Checks completed.
Checks skipped with reasons. Open questions. The invalidation trigger. Data
timestamp and session note. A disclaimer that this is research support, not
financial advice, and that Maya decides.

Human action: Maya waits for Monday, or sets her own alert at her broker. CLINCH
places nothing, sizes nothing, executes nothing. The loop ends at her judgment.

Refresh and return: the brief persists. Reopening later shows the same brief with
its original timestamp marked stale-or-fresh against current market time, plus a
one-tap "re-check now" that reruns the hinges against fresh data instead of
pretending the old read is still live. No database talk; the promise is simply that
her work is still there and honestly dated.

Behind the scenes, conceptually: input parsing (asset, action, uncertainty) runs
first; baseline market context grounds the decision in live data; hinge selection
picks the highest decision-value unresolved question; capability matching chooses
the Bitget research source that can resolve it; sequential execution returns
evidence; the read updates; skip/stop logic prunes the remaining plan; the brief
compiler assembles stance, evidence, skips, residue, and triggers. The user never
sees these boxes, only their effects: a question, a reason, a finding, a skip, a
stop, a brief.

## 12. Behind-the-scenes conceptual journey

(described functionally, no implementation): Understander turns free text into
decision, asset, and uncertainty. Grounder fetches live baseline context. Hinge
Finder proposes candidate unresolved questions and ranks them by whether plausible
answers change the action. Researcher runs exactly one check at a time through the
matched Bitget capability. Evaluator attaches each finding to its hinge and updates
the read. Pruner marks remaining checks as run, skipped with reason, or moot. Stop
Judge halts when no remaining check can plausibly move the read. Brief Writer
renders the full accounting. Memory keeps the brief and its evidence honestly dated
across visits.

## 13. Magic moment

LOCKED: CLINCH visibly refuses a plausible research check and explains why in one
line: "Skipped momentum indicators. Neither an overbought nor oversold reading
would change the hold-off while the tariff cause stands." This stays the magic
moment because it is the whitespace made visible: no aggregator can show it, it
lands within seconds of research starting, it proves hinge reasoning actually
governed the run (a hardcoded sequence could never skip), and judges remember
restraint more than volume. Requirement it imposes: skip cards must appear early in
the demo, which means the demo scenario needs a genuine early skip, not a staged one.
Alternative considered (the stop announcement) is strong but slower; it becomes the
second memorable beat, not the first.

## 14. Four scenario walkthroughs (P5 seeds)

Scenario 1, weekend rNVDA decline (canonical): input as above. Hinge 1:
NVDA-specific vs sector-wide. Research: sector basket context plus weekend tariff
news. Finding: sector-wide, thesis breaks, read moves to hold off. Hinge 2: is
there any Monday-open setup left worth timing? Research: event calendar (nothing
scheduled before open that overrides tariffs). Skip: momentum indicators (cannot
move the read), on-chain flows (irrelevant to single-name equity logic, stated).
Stop: remaining checks decorative. Brief: hold off, two findings, two skips with
reasons, trigger (sector opens flat or green flips to reassess entry timing).

Scenario 2, technicals first (no-news grind): rAVGO bled 6% over two quiet weeks,
no headlines, funding and sentiment neutral. Hinge 1: is this exhaustion or the
start of a leg down? Nothing in news can answer a newsless drift, so CLINCH says
that and leads with technical structure (6-category indicator read plus support
levels from candle history). News is the visible skip ("no scheduled catalyst;
headlines cannot resolve a newsless drift"). Finding: breakdown through support
with expanding volume. Hinge 2: is there a level below where the structure repairs?
Research: deeper support mapping. Stop when levels are mapped. Brief: avoid chasing,
with the repair level as trigger. This scenario exists to prove ordering is earned,
never hardcoded.

Scenario 3, sentiment and macro lead (event week): rTSLA into a Fed decision with
positioning at extremes and funding stretched. Hinge 1: does positioning make any
pre-event entry a coin flip regardless of direction? Research: sentiment and
positioning plus macro calendar first. Finding: crowded long into a binary event.
Technical pattern is skipped openly ("a clean triangle cannot survive the event
volatility either way"). Hinge 2: what post-event confirmation would justify entry?
Brief: wait for the event, with confirmation triggers defined in advance. Proves
CLINCH can recommend patience as an insight, not as failure.

Scenario 4, insufficient data (honest no-action): an obscure small-cap rToken with
thin утверждена data, conflicting single-source rumor, native market closed, no
usable history. Hinge 1 (is there any verifiable cause?) returns: no reliable
source. CLINCH does not invent a read. Brief: "cannot resolve," listing what was
attempted, why each source failed, what future evidence would unlock the decision
(first native session, verified company statement), and an explicit wait
recommendation. Proves the product prefers truthful uncertainty over confident
noise, and gives P5 a negative-case seed.

## 15. Product / user states

Empty/initial: examples teach the question shape; no dead dashboard. Input
understood: one-line restatement awaiting confirm-or-correct. Researching: live
check list with reasons; never a frozen spinner. Hinge identified: the current
make-or-break question plus why it outranks the rest. Evidence returned: finding
attached to its hinge, source and time shown. Decision state updated: read moves
with the reason visible. Next hinge: new question appears with its rationale.
Research skipped: skip card with reason, reversible. Stopped: halt statement with
why further checks lack value. Final brief ready: complete one-screen accounting.
Partial result: findings labeled partial until their check completes. Source
unavailable: named outage with what was lost and the fallback question. Unsupported
asset/input: plain statement of coverage plus nearest supported alternative.
Ambiguous intent: exactly one clarifying question, never an interrogation. Recoverable
error: what failed, what is safe, how to retry, input preserved. Resumed session:
old brief shown with freshness marking plus one-tap re-check.

## 16. Final research brief

Information architecture, in order: 1. the decision as restated and confirmed.
2. current read (leaning in, holding off, standing aside, or cannot resolve) in one
line with its reason. 3. the findings that earned it (two to four, each with source
and timestamp). 4. checks completed (compact list). 5. checks skipped, each with its
one-line reason. 6. open questions that survive. 7. what would change the read
(invalidation triggers as observable events). 8. data timestamp plus session note
(native open/closed, liquidity caveat). 9. source references where available.
10. research-support disclaimer plus human-decides line. Holds to less-noise
philosophy: findings capped, skips one line each, no indicator tables, no raw
dumps, no generic market overview. Anything not serving the decision is cut.

## 17. Non-goals

Autonomous trading bot: excluded because Track 3 forbids nothing but rewards
nothing for execution, and execution would convert the human-final promise into a
liability machine. Generic AI stock chatbot: excluded because chat without hinge
discipline is the aggregator CLINCH exists to replace. Generic five-agent debate:
excluded because parallel opinions without decision ranking multiply noise; one
hinge at a time beats five voices. Indicator dashboard: excluded because screens
of gauges answer no question; indicators appear only as findings inside a hinge.
Backtesting platform: excluded because Track 3 requires none and history serves
only as scenario context for stress reasoning. Copy trading: excluded, execution
adjacent, wrong track. Wallet dApp: excluded, core forbids wallet prompts entirely.
Brokerage: excluded, CLINCH never touches orders or money. Portfolio-management
platform: excluded to protect scope; single decisions only, portfolio angles stay
examples not features. Financial-advice certainty machine: excluded; reads are
conditional, triggers explicit, disclaimer permanent. Universal market intelligence
terminal: excluded; coverage breadth is the enemy, decision depth is the product.
Strategy marketplace: excluded; no strategies are listed, shared, or sold. Generic
research summarizer: excluded as the central anti-goal; summarization without skip
and stop logic is exactly the product being refused.

## 18. Bitget conceptual role

Reality and rToken data: supplies the decision ground. Weekend price action on the
actual contemplated asset, session awareness (native closed, internal liquidity),
and candle structure for timing hinges. Without it the S2 story collapses and every
scenario becomes hypothetical crypto chat. bitget-signal Skills: supply the
per-hinge research muscle. News/macro for cause hinges, sentiment/positioning for
crowding hinges, technicals for structure hinges, market-intel for flow context.
Each maps to a hinge class, which is what makes the Skill count load-bearing rather
than decorative. Agent Hub: the later execution surface for capability plumbing in
P4/P6 (discover, market reads, read-only posture); conceptually the toolbox the
researcher reaches into, method undecided. Playbook: NOT needed. It generates,
backtests, and deploys executable strategies; CLINCH researches open human
decisions and never executes. Removing Playbook changes nothing about the promised
experience, so it stays out. Optional account personalization (P14): a later,
opt-in, read-only convenience that must never enter the core flow or the demo.

Removal test: if Bitget disappeared tomorrow, CLINCH would lose live rToken context
(the entire S2 thesis setting), all five research Skill dimensions (the judging
criterion called feature depth), and the market-data grounding that makes briefs
auditable. What remained would be an input box with opinions: a generic chatbot.
Bitget is load-bearing because the product's three hardest promises (live context,
researched evidence, S2-native relevance) all run on it.

## 19. Load-bearing classification

LOAD-BEARING (remove it and CLINCH stops being CLINCH): Decision Hinge selection;
dynamic research ordering by decision value; skip logic with stated reasons; stop
logic; natural-language input; final research brief; live Bitget market context;
Bitget research Skills; rToken focus; human-final decision rule.

IMPORTANT (major value, identity survives): session persistence with honest
freshness; transport-level source citations; worked example dilemmas; clarifying
question for ambiguous intent; disclaimer and invalidation triggers.

CONVENIENCE (smoother, replaceable): one-tap re-check; data timestamps display;
input history; mobile-responsive layout basics.

DECORATIVE (excluded from critical scope): charting beyond minimal context strip;
animations and visual flourishes; social sharing and leaderboards; Playbook badge
or integration; account personalization in core; execution or order tickets;
multi-asset dashboards; any extra data source without a hinge class to serve.

## 20. Load-bearing assumption

LOCKED: CLINCH can reliably determine which unresolved question has the highest
likelihood of materially changing the user's trading decision. Everything rests on
it: if hinge selection is no better than topic matching, the ordering, skips, stops,
and brief are theater, and CLINCH is the aggregator it claims to replace. It stays
the single assumption because all other risks (endpoint access, UX clarity, latency)
are engineering problems with known solution shapes, while this one decides whether
the product concept is real. P5 must demonstrate conceptually: on scenario fixtures
with known decision-flipping evidence, the selector surfaces the flipping question
first; repeated runs stay stable enough to trust; skips and stops match
pre-registered expectations on positive and negative cases; failure degrades to
declared uncertainty, never to silent generic ordering. No algorithm, representation,
or score is decided here.

## 21. Secondary assumptions (with verifying phase)

Users understand and value explicit skips (P19 clean-user E2E plus P20 owner UAT).
Sequential targeted research beats omnibus analysis for time-pressured single
decisions (P16 baseline comparison). Bitget sources supply enough distinct evidence
types to separate hinges (P4 capability proof). A research stance stays useful
without execution because the user executes at their own broker (P19 E2E plus P20
UAT). Off-hours rToken uncertainty recurs frequently enough to matter (P2 weak
check via scenario plausibility; P16 usage patterns if instrumented). Explanations
stay readable at brief length without overwhelming (P8 blueprint, P19 E2E).

## 22. Trust / failure behavior

One source fails: the hinge it served is marked blocked-by-outage, the finding is
withheld rather than guessed, and CLINCH either reroutes to the next-best hinge or
says the read is now conditional on the missing check. Stale data: timestamps make
staleness visible; reads older than the session are labeled, never silently reused.
Conflicting evidence: both sides shown with sources, read marked conditional, and
the conflict itself can become the next hinge (what would settle it). Uncertainty:
stated as structure (open questions plus triggers), never padded into false
precision. No resolvable path: Scenario 4 behavior, wait with unlock conditions.
Ambiguous question: one clarifying question, then proceed. Unsupported symbol: plain
coverage statement plus nearest supported alternative, no fake analysis. Asked to
execute: refusal with reason (CLINCH researches, the trader acts) plus direction to
where execution lives. Asked for certainty or prediction: refusal of the frame,
conditional read offered instead. Standing rule: truthful uncertainty, explicit
limits, preserved input, retry where possible, and stopping beat invented
confidence every time.

## 23. Terminology

The user's contemplated action: "the trade you are considering". Decision Hinge:
"the make-or-break question", first use optionally glossed once as Decision Hinge.
Research path: "check". Evidence or result: "finding". Skipped research: "skipped
check" plus "reason". Current stance: "current read" with values leaning in,
holding off, standing aside, cannot resolve. Invalidation or change condition:
"what would change this read". Unresolved uncertainty: "open questions". Stopped
state: "research complete for now". Final brief: "research brief". All user-facing
copy avoids long dashes, engineering terms (verbs, endpoints, fixtures), and jargon
(alpha, OOS, LUI internals); LUI appears in judging-facing text only.

## 24. Rubric map

Feature depth and integrations: each hinge class maps to a distinct Bitget
capability (Reality context, news/macro, sentiment/positioning, technicals,
market-intel), and the demo visibly exercises several while skipping at least one
with reason, so count reads as coverage with discipline. Research quality: every
finding carries source plus timestamp, the read follows the evidence through visible
updates, and invalidation triggers prove the research was falsifiable. LUI fluency:
free-text dilemma in, one-line restatement back, plain-language hinges and brief
out, one clarifying question at most. Personalized thesis: primary segment Maya
plus hinge philosophy gives the submission a named human, a named pain (off-hours
partial information), and a mechanism matched to it. Target user and value: section
3 persona and section 5 problem, quoted in the form. Validation: P16 baseline
comparison (hinge-first vs run-everything on decision-critical info, calls, time,
skips, comprehension), P19 clean-user E2E, P20 owner UAT. No metrics fabricated in
P2; P16 defines them.

## 25. 90-second experience

Seconds 0 to 10: landing shows one line, one box, three example dilemmas; the
rNVDA chip teaches the question shape instantly. 10 to 20: judge types or taps the
weekend dip dilemma. 20 to 30: CLINCH restates the decision in one line, judge
confirms. 30 to 40: baseline strip appears (live rNVDA quote, move, session note)
and hinge 1 lands with its one-line why. 40 to 60: first checks stream with reasons
(sector context, then tariff news); finding flips the read to holding off. 60 to 70:
the skip card appears (technicals refused with reason): the magic moment. 70 to 80:
second hinge resolves on the event calendar; CLINCH stops, naming why nothing left
matters. 80 to 90: the one-screen brief renders; judge reads stance, two findings,
skips, trigger, timestamp. No terminal, no slides, no fake data, no intervention.

## 26. One-liners

Plain: CLINCH answers the one question that decides your trade, then stops.
Judge: Hinge-first AI research workbench on Bitget: NL dilemma in, decision-ranked
live research, visible skips, auditable brief, human decides. Technical but
readable: decision-value-ranked sequential research over live Bitget market and
Skill evidence with explicit skip/stop policy and a falsifiable brief. Why not
ChatGPT: ChatGPT summarizes everything it can find; CLINCH decides what is worth
finding, shows what it refused to check and why, and stops when nothing left could
change your action. Why Bitget: the rToken 7x24 market creates the exact
partial-information decisions CLINCH resolves, and Bitget's market data plus five
research Skills supply every hinge class with live evidence. Why novel, carefully:
in the official Bitget surfaces inspected for P1, no shipped capability ranks
research by decision value, skips with stated reason, or halts on low marginal
value; CLINCH's novelty claim rests on that documented gap, and P16 will test
whether the gap is real in practice.

## 27. Unresolved questions handed forward

To P3: exact MVP cut list and demo scenario lock (rNVDA plus which two of the
remaining three); brief length ceiling; whether re-check is in MVP or P15;
X-post and submission copy ownership. To P4: endpoint-by-endpoint proof (C1 depth
and fills classes first), per-skill invocation proof plus citation capture method,
Reality instrument discovery for rNVDA-class symbols, latency envelope for the 90
second budget. To P5: hinge reliability fixture design from section 14 scenarios,
stability criterion, pre-registered skip/stop expectations, negative-case handling.
To P8: disclaimer wording, empty/loading/error/skip/stop microcopy without long
dashes, freshness-marking visuals. To P25: cutoff-hour watch, TBD-link capture,
judges list, license silence confirmation.

## 28. P2 pass-gate checklist

1. Primary segment selected (A) with scored reasoning [DONE]. 2. General access
preserved alongside thesis [DONE, sec 4]. 3. Singular concrete problem [DONE,
sec 5]. 4. Singular understandable promise [DONE, sec 6]. 5. Hinge defined without
technical ambiguity [DONE, sec 8]. 6. Routing distinction crystal clear [DONE,
sec 8]. 7. Skip logic conceptually clear [DONE, sec 10]. 8. Stop logic conceptually
clear [DONE, sec 10]. 9. Complete journey exists [DONE, sec 11]. 10. No hidden
developer operation in journey [DONE, verified: no terminal, config, key, or
script step]. 11. Magic moment explicit and locked [DONE, sec 13]. 12. Four
scenarios prove non-hardcoded ordering [DONE, sec 14: news-first, TA-first,
sentiment-first, no-action]. 13. Brief defined [DONE, sec 16]. 14. States defined
[DONE, sec 15]. 15. Non-goals explicit with reasons [DONE, sec 17]. 16. Bitget
conceptually load-bearing via removal test [DONE, sec 18]. 17. Decorative
integrations rejected [DONE, sec 19]. 18. Load-bearing assumption locked with P5
responsibility [DONE, sec 20]. 19. P5 validation responsibility clear [DONE,
secs 20-21]. 20. Trust behavior understandable [DONE, sec 22]. 21. Rubric mapped
[DONE, sec 24]. 22. 90-second experience coherent [DONE, sec 25]. 23. Plain
language throughout [DONE]. 24. No architecture locked (candidate hybrid untouched,
no representation chosen) [DONE]. 25. No product code written [DONE]. 26. P3 not
begun [DONE].
