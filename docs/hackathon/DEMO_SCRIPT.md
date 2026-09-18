# CLINCH — Demo Script (2–3 minutes, do not record transitions that did not happen)

Recording rules: use the live production app only. Show real output. Never script a market transition that did not occur. On-screen labels below are quoted from the running UI; re-check them before recording.

## 0:00–0:15 — Problem

Say: "Traders drown in information but still cannot answer one question: what single piece of evidence would actually change my decision?"

Show: the CLINCH landing hero ("Before you act on the trade, find what matters").

## 0:15–0:35 — Thesis and Decision Hinge

Say: "CLINCH finds the unanswered question most capable of changing the decision, researches it with live Bitget data, and stops when more research is unlikely to matter. The human decides."

Show: "How it works" steps on the dashboard.

## 0:35–1:30 — Real deployed research

1. Open the app. Type: "NVDA has been drifting lower tonight and I'm considering a small entry. Should I wait?"
2. Optionally pick NVIDIA from Featured Stocks.
3. Press "Find the Decision Hinge". Narrate the hinge as it appears.
4. Narrate the completed check ("Evidence that mattered") and one skipped check ("What CLINCH skipped") with its reason.
5. Read the final brief: read label, WHY, WHAT TO WATCH.
6. Say: "The trade is never executed. The human keeps the final call."

## 1:30–1:55 — Decision Watch

1. On the finished brief, open "Monitor this decision" (needs sign-in; guest research offers "Save to account" first).
2. Press "Start monitoring". Show the confirmation that the watch is active.
3. Open Recent Research → Decision Watches. Point at "Last checked" advancing on the worker's 10-minute cadence.
4. Say: "It notifies once if the evidence reaches the watched state. It never sends buy signals."

## 1:55–2:15 — Telegram Companion

1. In Telegram, open the CLINCH bot, `/start` → home menu.
2. Tap My Watches → read one card (asset, current read, target, last checked).
3. Pause and resume one watch; show the web UI reflecting each state.
4. Tap Recent Research; tap Open Research to deep-link back into the desk.

## 2:15–2:35 — Architecture and Bitget/Qwen truth

Say: "Live Bitget Reality data: spot discovery across 1,653 tokenized stocks, ticker, candles, depth, plus perp positioning. Qwen interprets language; a deterministic kernel owns every support check, read, skip, and stop. Neon persists sessions; a VPS worker processes watches; Telegram delivers."

## 2:35–2:50 — Close

Say: "Research the decision, not the entire market." Show the live app URL on screen.

## Fact-check table (verify before uploading)

| Spoken claim | Evidence |
|---|---|
| 1,653 supported stocks, 0 broken | `GET /api/stocks` `catalogValidation` |
| 223 automated tests passing | `npm test -- --run` output |
| Button says "Find the Decision Hinge" | app decision composer |
| Reads: Slightly favorable / Better to wait / No clear advantage / Not enough evidence yet | read labels in UI and briefs |
| Watch cadence ~10 minutes, "Last checked" advances | Recent → Decision Watches card |
| Telegram commands /start /watches /recent /help | bot in Telegram |
| No trade execution anywhere | no order/trade code paths; brief disclaimer |
| No genuine market transition on camera | do not claim one; soak result only |
