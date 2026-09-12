import { z } from "zod";
import { IntentContract } from "../domain/types";

// Deterministic intent extraction for the constrained decision domain.
// No model, no cost, fully testable. Asset candidates are validated against
// live discovery by the caller; unknown mentions stay unresolved here.
const ACTION_RULES: { re: RegExp; action: "enter-now" | "exit-now" | "wait" | "stand-aside" }[] = [
  { re: /\b(buy(ing)?|enter(ing)?|entr(y|ies)|go(ing)?\s+long|buy the dip|get in|take (a )?position|bullish on|worth entering)\b/i, action: "enter-now" },
  { re: /\b(sell(ing)?|exit(ing)?|go(ing)?\s+short|get out|close (my|the) position|take profit|bearish on)\b/i, action: "exit-now" },
  { re: /\b(wait|hold off|delay|stand by|sit out|pause|not yet|should i wait)\b/i, action: "wait" },
  { re: /\b(stand aside|stay away|avoid|skip this|do nothing)\b/i, action: "stand-aside" },
];
const SYMBOL_RES = [/\b(R[A-Z]{2,8}(USDT)?)\b/i, /\b([A-Z]{2,6}USDT)\b/i, /\b([A-Z]{3,10}COIN)\b/i, /\b(NVDA|TSLA|AAPL|AMD|MSFT|META|SPY|QQQ)\b/i];

export interface RawIntent {
  assetMention: string | null;
  action: "enter-now" | "exit-now" | "wait" | "stand-aside" | "unclear";
  timeframeContext: string;
  decisionQuestion: string;
  clarificationNeeded: boolean;
  clarificationQuestion: string | null;
}

export function extractIntent(dilemma: string): RawIntent {
  const text = dilemma.trim();
  let assetMention: string | null = null;
  for (const re of SYMBOL_RES) {
    const m = text.match(re);
    if (m) { assetMention = m[1].toUpperCase(); break; }
  }
  let action: RawIntent["action"] = "unclear";
  for (const r of ACTION_RULES) {
    if (r.re.test(text)) { action = r.action; break; }
  }
  const offHours = /after[- ]hours|off[- ]hours|weekend|closed|overnight|pre[- ]market/i.test(text);
  const timeframeContext = offHours ? "off-hours context per user wording" : "no timeframe stated";
  const needsClarify = assetMention === null || action === "unclear";
  return {
    assetMention, action, timeframeContext,
    decisionQuestion: text.length > 220 ? text.slice(0, 220) + "…" : text,
    clarificationNeeded: needsClarify,
    clarificationQuestion: needsClarify
      ? "What are you deciding? Tell me the asset and whether you are considering entering, exiting, or waiting."
      : null,
  };
}

export function toIntentContract(raw: RawIntent): z.infer<typeof IntentContract> {
  return IntentContract.parse({
    asset: raw.assetMention ?? "unknown",
    resolvedSymbol: null,
    action: raw.action,
    timeframeContext: raw.timeframeContext,
    decisionQuestion: raw.decisionQuestion,
    clarificationNeeded: raw.clarificationNeeded,
    clarificationQuestion: raw.clarificationQuestion,
  });
}
