# CLINCH P8 - UX + Design Blueprint

## 1. State metadata

P8 BUILDING (P0-P7 PASS; P9-P27 NOT STARTED; overall BUILDING). Locked from P2
product truth, P3 scope, P6 architecture (single Next.js workspace, streamed POST
progress, Postgres truth), P7 trust rules (anonymous ownership, allowlists,
budgets, redaction). No product code. No P9 work. Copy rule: no em dash or en
dash characters appear in this artifact's user-facing copy examples, and none
may appear in product copy (design-skill hard failure).

## 2. Design-skill inheritance

Applied from `design-skill` v2.0.0 (read in full): product determines interface
(one guided decision workspace, not a dashboard, not a chat transcript, not a
terminal); substitution test (a renamed clone must stop making sense, so Hinge,
skip, and stop treatments carry the identity); one primary action per screen
(Check this trade; Continue; Re-check); four real states everywhere; type at
14px minimum with hierarchy from size, weight, spacing, contrast; one text
family plus one display serif, monospace only for symbols, IDs, timestamps, and
aligned figures; color for identity, action, status, hierarchy only, never green
equals buy or red equals sell; one polished light theme, no switcher; minimalism
as earned placement with card-ification refused; motion only for hierarchy and
feedback with reduced-motion honored; mobile reconsidered not shrunken; 5/15/30/90
checkpoints; accessibility never traded; identity test passed by structure (the
Hinge-first unfolding), not by a logo.

## 3. Experience thesis

Every screen answers three questions: what is CLINCH investigating, why does it
matter to this decision, what happens next. If a region cannot answer all three,
it does not ship. Felt in three words: calm, exact, honest.

## 4. Visual direction

Calm, precise, editorial financial research. A printed research note that happens
to be alive: paper surface, ink text, hairline rules, generous whitespace, one
confident serif voice for the few sentences that carry judgment (hero question,
Hinge question, final read), neutral grotesk for everything functional. Restraint
is the brand: teal-petrol reserved for the primary action and the live Hinge
marker; amber reserved for unresolved and warning; slate for skipped and
secondary; red reserved for errors and failures only. No gradients, no orbs, no
glass, no casino colors, no terminal chrome.

## 5. Anti-patterns

No sidebar navigation, no portfolio balance, no watchlist, no movers, no heatmap,
no P&L, no avatar, no notification bell, no settings maze, no chat bubbles, no
agent avatars, no analyst cards, no candlestick terminal, no social feed, no
marketing hero pushing the product below the fold, no sparkles, no purple AI
gradient, no monospace prose, no tiny gray captions carrying meaning.

## 6. Information architecture

One primary workspace route (`/`) holding the whole decision journey as a single
unfolding column. One secondary lightweight surface (`/recent`) listing recent
research for the returning browser. No other routes in v1. Regions appear in
decision order and persist as a quiet audit trail below the fold of attention:
input, restatement, context, Hinge, progress, findings, skips, stop, brief.
Progressive disclosure: technical provenance lives behind one "Trade details"
expander per finding and per brief.

## 7. Normal user journey

Arrive and read the question within seconds; type a dilemma; see it restated;
watch live context land; meet Hinge 1 with its why; watch one check run with a
truthful status line; read the finding and the updated read; meet Hinge 2 or a
skip card; watch the stop statement; read the brief; decide elsewhere. Refresh
restores persisted work; return visits find recent research; deletion sits
quietly beside the brief.

## 8. First-open design

Above the fold on a laptop: wordmark CLINCH (small, ink, letterspaced), one hero
line ("What trade are you considering?"), one supporting line ("CLINCH finds the
unanswered question most likely to change your decision, researches it with live
market data, and stops when more checking would no longer matter."), one large
decision input with the dominant CTA, three example dilemma chips (rNVDA weekend
dip first), and one trust line ("Research only. CLINCH never trades, never asks
for a wallet, and never needs your exchange account."). The product is the hero;
no marketing page precedes it.

## 9. Input

Single multiline decision box, 15px minimum, labeled "Describe the trade you are
considering". Placeholder: "Example: rNVDA fell hard after the close. I am
thinking of buying the dip. Real opportunity or wait?" CTA label: "Check this
trade". States: empty (examples visible), typing (character count appears only
near the 2000 limit), submitting (button busy, input locked, duplicate submits
ignored), validation (over-limit or empty text gets a plain inline message, input
preserved). No syntax, no settings, no timeframe pickers up front.

## 10. Restatement

A compact confirmation strip, not a form: "Your decision" heading, asset chip
(RNVDA), action line ("Considering: enter now"), context line ("Evening decline",
user-statable wording with no session claim), timestamp of interpretation, and a quiet "Not quite right? Edit or
add detail" affordance. High-confidence interpretations proceed without forcing
confirmation; the strip stays visible as the contract for everything below.

## 11. Clarification

Only when no contemplated action exists: one calm question ("What are you
deciding about RNVDA?") with compact bounded choices (Enter now, Exit, Wait for
a better moment, I am not deciding yet) plus a free-text correction line. One
question at a time, selection of an action resumes immediately, never a
questionnaire. Selecting "I am not deciding yet" does NOT enter the Hinge
workflow and fabricates no action: CLINCH shows a small truthful state ("CLINCH
works from a decision you are considering. Tell me what you might do, such as
enter now, exit, or wait.") with dilemma editing. No research-chat fallback.

## 12. Market context

A slim context strip proving live grounding: instrument (RNVDA, Reality
tokenized stock), current price with tabular numerals, recent move, session note,
observed timestamp, freshness badge. Session labels such as "U.S. market closed,
off-hours pricing" may render ONLY when the server holds enough truthful
session and freshness evidence to support them for that specific instrument and
time; the string is never hardcoded into the component. When session status
cannot be truthfully established, show only supported neutral context such as
"Observed 23:04 UTC". P10 defines production eligibility and session logic; P8
locks only this truth rule. S skeleton shimmer only while fetching; failure degrades to a named state, never
a fake number. Optional tiny sparkline allowed ONLY if P9/P13 comprehension
testing favors it; never required to understand anything.

## 13. Decision Hinge

The signature object. Numbered ("Decision Hinge 1"), serif question at display
size, two short lines beneath: "Why this matters" (the decision consequence)
and "What would change the read" (the observable branch). Left accent rule in
petrol, generous whitespace, never a task row or agent step, no scores, no rule
names, no jargon. Previous hinges collapse into the timeline as resolved entries
with their verdicts; only the live Hinge carries full visual weight.

## 14. Researching

One live status region bound to persisted server stages: "Checking whether the
move is supported by real liquidity", "Comparing spot movement with stock-perp
positioning", "Updating what matters next". A thin progress accent animates only
while a server stage is genuinely open; stall past timeout converts to the
named failure state. Never "AI is thinking", never a fake percentage, never
success implied before persistence.

## 15. Evidence finding

Each finding separates OBSERVED from CHANGED. Observed: one factual sentence
with numbers ("RNVDA printed three consecutive lower 15-minute closes on thin
volume after 22:00 UTC"). Changed: one line on the read ("This keeps the
hold-off read in place"). Below, small provenance ("Bitget Reality, RNVDAUSDT,
observed 23:04 UTC", freshness badge) and a details expander for technical
provenance. No endpoint strings, no JSON, no orderbook tables in primary view.

## 16. Current read

A persistent read banner with four vocabularies, locked here: Leaning in,
Holding off, Standing aside, Cannot resolve. Rendered in ink with a distinct
non-traffic-light marker per value plus words (never color alone). Subline
always states the provisional nature ("Current research read, not a prediction.
You decide."). Updates animate once, then rest.

## 17. Next Hinge

Transition copy makes adaptation explicit: "That finding settled the liquidity
question against entry. The question that matters now:" followed by Hinge 2 in
full treatment. The resolved Hinge remains above, dimmed, with its verdict.
This visible turn is the anti-checklist proof.

## 18. Skip magic moment

A skip card with its own unmistakable treatment: muted slate marker labeled
"Skipped", the declined check named ("Stock-perp positioning"), and the
counterfactual reason in plain words ("Even calm positioning would not make
this entry attractive while spot liquidity stays impaired."). It must read as a
deliberate intelligent refusal, never as outage or disabled feature. Kinds are
visually distinct: SKIPPED (slate, reasoned) vs UNAVAILABLE (amber outline,
named cause) vs FAILED (red, retry offered).

## 19. Skip history

Skips persist in the timeline and in the brief's skipped section with reasons
intact. Never tooltip-only. A returning user can reconstruct exactly what was
declined and why.

## 20. Stop moment

Explicit stop statement in full voice: "CLINCH is stopping here. The checks
still available are unlikely to change this read." Followed by open questions
and the named future trigger ("A narrower spread with sustained price
stabilization would reopen this read." or "If positioning normalizes while spot
liquidity remains healthy, this decision is worth re-checking."). Future-change
conditions must be observable through Reality spot structure, corresponding
stock-perp positioning, or a clearly external condition CLINCH does not claim to
monitor automatically. No numeric thresholds are locked here; P10/P12/P16
calibrate them. Never "complete with 100% confidence". Stopping reads as discipline,
not exhaustion.

## 21. Cannot resolve

First-class unresolved brief: "Cannot resolve with current evidence" with what
was attempted, what is missing, why remaining checks cannot answer, and what
future information would unlock it. Calm presentation, full spacing, honest
weight. Trustworthy, never broken-looking.

## 22. Final brief

Order: current read (serif, one line) → why (two sentences max) → findings that
mattered (capped at four, each one line plus provenance) → checks completed
(compact) → checks skipped with reasons → open questions → what would change
the read → freshness block → source references → research-support disclaimer
with human-decides line. Progressive disclosure only for technical provenance.
Fits a calm scroll, never a dossier.

## 23. Research timeline

A quiet chronological spine (Hinge → research → finding → next Hinge → skip →
stop) with timestamps, no avatars, no chat styling, no chain-of-thought. The
audit trail a judge can skim in fifteen seconds.

## 24. Provenance/freshness

Human provenance strings ("Bitget Reality, RNVDAUSDT, observed 23:04 UTC";
"Bitget stock-perp positioning, NVDAUSDT, observed 23:05 UTC"). Fresh badge
(teal dot + "Live"), stale badge (amber dot + age, e.g. "14 min old"), missing
(gray dash, "Unavailable", never a number). Stale never panic-colored; missing
never zero-filled. Technical endpoint detail lives one expander down.

## 25. Errors

Named states with cause, preserved work, and next action: unsupported asset
(with nearest alternative), Bitget unavailable, model service unavailable,
missing/stale data, source unavailable, recovery/DB trouble, rate limited (with
honest "too many checks, try shortly" copy), session expired/unauthorized
(re-enter dilemma; history unrecoverable without cookie, stated plainly),
version conflict (refreshed state shown), stream interrupted (resume offered).
Never a bare "Something went wrong". Never a stack trace.

## 26. No-data vs negative

Visually impossible to confuse: "No current orderbook data available. CLINCH
did not use liquidity in this read." (amber outline, dash marker) versus "Book
observed healthy at 23:04 UTC. No liquidity problem found." (teal check,
timestamped). Absence is always labeled as absence.

## 27. Resume/recovery

Reload restores persisted steps in order with original timestamps plus a
freshness banner ("Research from 23:04 UTC. Prices may have moved.") and one
primary action ("Re-check now" starts a fresh run reusing the decision;
"Review brief" keeps the old one). Interrupted runs announce "Research paused
after Hinge 1" with resume as the single dominant action. Stream death never
renders as completion.

## 28. History/returning user

Subtle "Recent decisions" link in the header area opens the lightweight list:
asset, decision fragment, read, age/freshness, status. Row click restores that
brief read-only. No dashboard, no stats, no portfolio shapes.

## 29. Deletion

"Delete this research" sits in the brief footer area as quiet text-button,
confirmation inline ("Delete this research brief and its history? Delete /
Keep"), ownership-verified server-side. Copy never implies account deletion.

## 30. Responsive behavior

Desktop (1100px+): centered 720px column for the decision flow with the timeline
as a collapsible right-side rail. Laptop: single column, rail becomes a
"How we got here" expander above the brief. Mobile (360px+): everything stacks,
Hinge and skip cards keep full treatment and full copy, CTA sticky within thumb
reach only during input, no horizontal overflow, tabular numerals wrap safely,
long symbols truncate with copy action. The full loop completes on mobile; no
desktop-only demo dependency.

## 31. Accessibility

Semantic landmarks and headings in decision order; all controls real buttons
with accessible names; visible focus rings never removed; input, choices, and
CTA keyboard-operable end to end; status changes announced via aria-live
polite region (read changes, skip recorded, stop reached); state never
color-only (every status pairs color with marker plus words); touch targets 44px
minimum; contrast AA minimum for body, AAA for read/brief text; reduced motion
reveals content instantly with no animation-gated meaning.

## 32. Typography

Two families maximum, justified: one neutral grotesk for all functional text
(system-adjacent, tabular numerals for prices), one readable serif reserved for
voice moments (hero question, Hinge question, final read). Monospace only for
symbols, IDs, timestamps, aligned figures. Scale: hero 30/38, Hinge question
24/32, section titles 17/24 semibold, body 15/24, secondary 14/20, micro labels
13/18 semibold tracked slightly, never smaller, never gray-washed body copy, no
uppercase paragraphs, no condensed terminal faces, no all-caps sentences.

## 33. Palette

Light-first single theme. Paper #FAFAF7 surfaces, card white #FFFFFF sparingly
(only genuinely grouped units), ink #1A1D21 text, slate #5B6470 secondary,
hairline #E4E2DC borders. Petrol #0E6B6B: primary action, live Hinge rule,
fresh/live markers. Amber #9A6A00: unresolved, warning, stale, unavailable.
Slate fill: skipped records. Red #B3261E: errors and failures only. Read markers
use shape plus words (leaning in: upward tick; holding off: pause bars; standing
aside: level line; cannot resolve: hollow circle), never green-buy/red-sell
semantics. No theme switcher in v1.

## 34. Motion

120ms ease-out for appearing findings, 200ms for Hinge transitions and skip
recording, stop statement fades once. Motion marks hierarchy changes and
feedback only. Reduced motion: everything renders immediately. No loaders that
imply progress without server state, no decorative background motion, no scroll
choreography on the decision path.

## 35. Iconography

Minimal geometric markers (tick, pause bars, level line, hollow circle, dash,
alert triangle) drawn in current color. No emoji in product UI. No icon per
card. Hinge, finding, skip, unresolved, and stop share one marker language at
one size.

## 36. Component inventory

DecisionInput, ExampleChips, DecisionSummary, Clarifier, MarketContext,
FreshnessBadge, HingeCard, ResearchProgress, EvidenceFinding, CurrentRead,
SkipRecord, StateNote (unavailable/failed variants), StopState,
UnresolvedState, FinalBrief, ResearchTimeline, SourceReference, RecoveryState,
RecentSessionRow, DeleteControl, ErrorState, EmptyState. UX roles defined here;
P9/P13 decide implementation composition.

## 37. Complete visible-state matrix

Initial (hero + examples + trust line; CTA; nothing hidden). Typing (count near
limit only). Submitting (locked input, busy CTA, duplicates ignored). Intent
understood (restatement strip + contract). Clarification (one question + bounded
choices). Context loading (skeleton strip, labeled fetch). Context ready (strip
+ badges). Hinge identified (full Hinge treatment). Researching spot /
positioning (named status line per family). Finding (observed vs changed +
provenance). Re-evaluating (brief transitional status, never silent). Next Hinge
(transition copy + new Hinge). Skip (magic-moment card). Stop (statement +
residue + trigger). Cannot resolve (first-class brief). Final brief (sec 22
order). Partial/interrupted (paused banner + resume CTA). Recovering (restored
steps + freshness banner). Unsupported asset (coverage message + alternative).
Stale/no-data (amber/gray treatments per sec 24/26). Model unavailable (named,
retry later). Bitget unavailable (named, partial work preserved). Rate-limited
(honest wait copy). Expired/unauthorized (re-enter path, no false recovery).
Recent session (read-only brief + re-check). Each state lists primary message,
primary action, secondary action, data shown, and data deliberately hidden in
the P9-ready appendix of this section: hidden by default are endpoint strings,
raw JSON, chain-of-thought, ownership material, and any number not yet observed.

## 38. Copy system

Hero: "What trade are you considering?" Support: "CLINCH finds the unanswered
question most likely to change your decision, researches it with live market
data, and stops when more checking would no longer matter." Placeholder: "Example:
rNVDA fell hard after the close. I am thinking of buying the dip. Real
opportunity or wait?" CTA: "Check this trade". Restatement: "Your decision",
"Considering: enter now", "Is that right?" Clarifier: "What are you deciding
about RNVDA?" Hinge why: "Why this matters". Skip: "Skipped", "Why skipped".
Stop: "CLINCH is stopping here." Unresolved: "Cannot resolve with current
evidence". Final notice: "Research finished. The trading decision is yours.
CLINCH never places trades." Freshness: "Observed 23:04 UTC", "14 min old",
"Unavailable". Resume: "Re-check now". Delete: "Delete this research". Tone
throughout: calm, specific, plain, confident about process, humble about
markets. No hype verbs, no bro slang, no jargon, no long dashes.

First-open example concepts (chips above): rNVDA off-hours dip (spot structure
first), thin rTSLA move (spot validity first, positioning a later candidate for
an explicit skip), crowded rAAPL entry (positioning first). Each dilemma is
answerable using only spot market structure and positioning context. No example
may name macro events, news, sentiment, sectors, earnings, or catalysts.

Copy-truth invariant: every visible research claim, example, progress label,
future-change condition, and source label must be derivable from a currently
registered and proven research family, unless explicitly presented as
information CLINCH does not have. Applies to examples, progress, findings,
stops, cannot-resolve, briefs, history, and demo copy alike.

## 39. Why this next UX

Every live Hinge carries a compact "Why this matters" line expressing the live
counterfactual ("If the drop is mostly a thin-liquidity print, entering now is
a different decision from entering into sustained selling."). Generated from the
structured trace, never a score, never a rule name.

## 40. Why skipped UX

Every skip carries "Why skipped" expressing the exhausted counterfactual
("Even calm positioning would not change the current hold-off read while spot
liquidity stays impaired."). Counterfactual prose only. Scores stay buried.

## 41. Human-final decision UX

Brief closes with a distinct human-decides band: current read restated, "The
trading decision is yours. CLINCH researches, you act." No buy, sell, trade,
connect, or wallet control exists anywhere in the product. The band is visually
separate from evidence so research never reads as instruction.

## 42. Judge experience

0 to 5 seconds: question, input, CTA visible. 5 to 15: dilemma entered (rNVDA
chip). 15 to 30: restatement plus live context strip. 30 to 45: Hinge 1 with
why. 45 to 65: named research runs, finding lands, read updates. 65 to 75: skip
card, the magic moment. 75 to 85: second hinge resolves, stop statement. 85 to
90: brief renders. No terminal, no code, no console, no slides. The skip at
minute one is the talk of the demo.

## 43. Demo-truth rules

rNVDA stays canonical but every market fact on screen comes from the live
observation at demo time. Copy is written state-adaptively ("fell hard",
"drifting", "holding steady" render from observed move buckets, never
hardcoded). If rNVDA is unsuitable live, another P4-proven Reality instrument
with a genuine live decision takes the slot; the mechanism shown is identical.
Never stage a move, a finding, or a skip.

## 44. Design for two real research families

Human labels: "Spot market structure" and "Positioning context". Exactly two
research vocabularies exist in copy, status lines, timeline, and brief. No
analyst tabs, no five-agent motif, no news/macro/sentiment wording anywhere in
v1 UI. A future proven family earns wording then, not now.

## 45. Product identity

Wordmark: CLINCH set small, letterspaced, ink grotesk; no generated logo mark
required (design-skill: no mandated asset). Personality: the quiet analyst who
says less and means it. Motif: the left-rule Hinge treatment plus the
question-first column rhythm, recognizable with the logo removed (identity
test). Surfaces: flat paper, hairline separators, radius 8 for interactive
controls and 10 for the Hinge card only. Spacing rhythm in 4px units with
section gaps at 32 and 48. Type philosophy per sec 32. Icon philosophy per
sec 35. Deliberately unaggressive despite the name: focus expressed through
restraint and whitespace, not sharp edges or dark drama.

## 46. Information density

Default viewport shows only the live question, its why, current progress or
finding, current read, and the latest skip or stop. Everything else (prior
hinges, technical provenance, timeline detail, history) sits one calm disclosure
below. If a screenshot ever resembles a terminal, density review has failed and
sections merge or move behind disclosure until the decision path breathes.

## 47. One-screen magic moment

At skip time the viewport should compose: current read banner, resolved
Hinge-with-verdict, skip card with reason. Desktop keeps these adjacent by
ordering (read pinned above the live region); mobile stacks read, verdict,
skip without interleaving detail. P13 verifies the composition against real
runs; copy length caps in sec 38 keep the card small enough to fit.

## 48. Privacy UX

One quiet line under the input, link-styled: "Private by design: no account, no
wallet. Research lives in this browser session for 30 days; clearing site data
removes access." No banners, no jargon, no claims beyond P7 (anonymous, not
anonymous-proof).

## 49. Financial trust copy

Reads stay conditional ("Holding off while...", "Leaning in provided...").
Banned: guaranteed, risk-free, sure win, definitely profitable, you should
definitely buy, 100% confidence, or any imperative to trade. Uncertainty and
freshness ride alongside every stance. This is a trust boundary with legal
weight, not tone guidance.

## 50. Delete generic dashboard elements

Out unless design-skill-proven necessary (none was): sidebar nav, balances,
watchlists, movers, heatmaps, P&L, avatars, bells, settings mazes, chat
bubbles, agent avatars, analyst cards, candlestick terminals, social feeds.
Each was weighed against the three thesis questions and failed all three.

## 51. Blueprint depth

P9 receives: layout hierarchy (single column, region order, rail-to-expander
responsive rule), all screen states with messages/actions/visibility, tokens
(sec 52), copy constants (sec 38), mobile rules (sec 30), skip/stop/error
presentations, accessibility contract (sec 31). Deliberately unspecified: exact
CSS values beyond tokens, framework component APIs, animation keyframes, font
files. Deterministic to build from, not pixel-prescriptive.

## 52. Design tokens

Spacing: 4, 8, 12, 16, 24, 32, 48. Content width: 720 reading column, 1120
desktop shell. Type scale per sec 32 with 1.5+ body line height. Radius: 8
controls, 10 Hinge card, 6 chips/badges. Borders: 1px hairline #E4E2DC,
2px accent rules. Surfaces: paper, white (grouped units only), slate wash for
skips. Status palette per sec 33 with fixed role mapping. Motion: 120ms appear,
200ms transitions, ease-out, full stillness under reduced motion. No styling
library installed in P8; P9 implements per locked stack.

## 53. Prototype representation

ASCII wireframes below plus state tables above; no HTML/React prototype, no
Figma gate. This artifact is the build source.

## 54. Required wireframes

Initial workspace:
```text
+----------------------------------------------------------+
| CLINCH                                        [Recent?]  |
|                                                          |
|   What trade are you considering?                        |
|   CLINCH finds the unanswered question most likely       |
|   to change your decision, researches it, and stops      |
|   when more checking would no longer matter.             |
|   +--------------------------------------------------+   |
|   | rNVDA fell hard after the close...               |   |
|   +--------------------------------------------------+   |
|   [ rNVDA dip ] [ Thin rTSLA move ] [ Crowded rAAPL ]   |
|   [ CHECK THIS TRADE ]                                   |
|   Research only. No wallet. No exchange account.         |
+----------------------------------------------------------+
```
Decision understood:
```text
| Your decision                                    [Edit]  |
| RNVDA | Considering: enter now | Evening decline        |
| RNVDA 218.24 (-0.4%) | U.S. closed | Observed 23:04 UTC  |
```
Active Hinge:
```text
| ||  Decision Hinge 1                                    |
| ||  Is this a real move or a thin-liquidity print?       |
| ||  Why this matters: a spread-driven artifact makes     |
| ||  entering now a different decision from buying real   |
| ||  selling.                                             |
```
Research in progress:
```text
| Checking whether the move is supported by real liquidity |
| [teal progress accent, stage-bound]                      |
| Hinge 1 held above. No finding yet.                      |
```
Finding plus next Hinge:
```text
| FINDING  Thin print confirmed. Three lower closes on     |
| thinning volume after 22:00 UTC.                         |
| Current read: Holding off (thin move, not a setup).      |
| Next: does anything about positioning change that?       |
```
Magic-moment skip:
```text
| Current read: Holding off                                |
| Hinge 1 resolved: thin print, entry paused.              |
| SKIPPED  Positioning context                             |
| Even calm positioning would not make this entry          |
| attractive while spot liquidity stays impaired.          |
```
Stop plus final brief:
```text
| CLINCH is stopping here. Remaining checks are unlikely   |
| to change this read.                                     |
| READ  Holding off                                        |
| WHY   Two findings above.                                |
| SKIPPED ...  OPEN ...  WOULD CHANGE ...                  |
| Observed 23:04 to 23:06 UTC. Sources below.              |
| Research finished. The trading decision is yours.        |
```
Cannot resolve:
```text
| Cannot resolve with current evidence                     |
| Checked: spot market structure. Missing: usable          |
| positioning coverage for this instrument.                |
| CLINCH cannot resolve this decision with the evidence    |
| currently available. Re-check when both evidence         |
| families are available.                                  |
```
Interrupted/recovery:
```text
| Research paused after Hinge 1.                           |
| [Re-check now]   [Review saved brief]                    |
| Saved 23:04 UTC. Prices may have moved.                  |
```
Mobile core journey: identical regions stacked in decision order, Hinge and
skip cards full-bleed with unchanged copy, CTA reachable without scrolling
past content, no horizontal overflow at 360px.

## 55. P8 artifact

This document, sections 1 through 60, is the blueprint.

## 56. P9 handoff

Implement first, in order: app shell with header/input/trust line; token module
(sec 52); copy constants (sec 38); state machine states as regions (sec 37);
restatement plus clarification; context strip; Hinge card; progress region;
finding/skip/stop/brief regions; timeline and provenance expanders; recovery
and recent surfaces; responsive rules; accessibility contract. Styling direction
per locked stack (P9 chooses the implementation vehicle: CSS modules or
equivalent minimal approach; no library installed in P8). No endpoint, model,
or database work inside P9 beyond the foundation scaffold and static rendering
of states with fixtures. P9 must use P8 copy constants ONLY after this
capability-truth audit: no invented financial examples, and fixture states for
static rendering must use only spot-structure facts, perp-positioning facts, or
missing/unavailable versions of those facts, labeled internally as development
fixtures. No macro/news fixture. No fake live UI.

## 57. What may change

Visual direction details, layout refinements, typeface selection within the
locked philosophy, palette tuning within locked roles, labels, copy wording,
responsive arrangement, progress presentation, history placement, error
presentation. None may alter product truth.

## 58. What must not change

Per brief sec 58 list, preserved in full: name, user, promise, Hinge, skip,
stop, two families, human-final, anonymous core, Next.js, streamed POST,
kernel authority, Qwen one-provider, Neon, 30-day retention, ownership model,
asset scope, no-execution. No feature may enter through design.

## 59. P8 success gate

Mental walkthrough test: a stranger reads sec 7 top to bottom and can narrate
the product back without inventing screens. All 24 gate elements are addressed
above (understanding, input, restatement, live context, distinctive Hinge,
truthful progress, evidence relation, adaptive turn, visible skip, explicit
stop, concise brief, cannot-resolve, errors, recovery, freshness, provenance,
mobile, accessibility, human-final boundary, no terminal creep, no imaginary
capabilities, no code).

## 60. Stop conditions

None fired: the product is learnable without onboarding screens (sec 8 answers
in order within seconds); the skip is visually dominant by construction (sec
18/47); no heavy charts required (sec 12/44); mobile completes the loop
(sec 30); no unscoped features added (sec 50); two families suffice for coherent
states throughout; no P6/P7 change required (streaming, ownership, budgets all
have UX expression above); design-skill supports every locked requirement
(guided workbench over chat, earned minimalism, substitution-passing identity).
No UX contradiction needs Director review before P9.
