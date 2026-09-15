import { z } from "zod";
import { IntentContract } from "../domain/types";

// Deterministic intent extraction for the constrained decision domain.
// No model, no cost, fully testable. Asset candidates are validated against
// live discovery by the caller; unknown mentions stay unresolved here.
const ACTION_RULES: { re: RegExp; action: "enter-now" | "exit-now" | "wait" | "stand-aside" }[] = [
  { re: /\b(should i wait|wait before|wait to|hold off|delay|stand by|sit out|pause|not yet)\b/i, action: "wait" },
  { re: /\b(buy(ing)?|enter(ing)?|entr(y|ies)|go(ing)?\s+long|buy the dip|get in|take (a )?position|bullish on|worth entering)\b/i, action: "enter-now" },
  { re: /\b(sell(ing)?|exit(ing)?|go(ing)?\s+short|get out|close (my|the) position|take profit|bearish on)\b/i, action: "exit-now" },
  { re: /\b(wait|hold off|delay|stand by|sit out|pause|not yet)\b/i, action: "wait" },
  { re: /\b(stand aside|stay away|avoid|skip this|do nothing)\b/i, action: "stand-aside" },
];
const SYMBOL_RES = [
  /\b(R[A-Z]{2,8}(USDT)?)\b/i,
  /\b([A-Z]{2,8}USDT)\b/i,
  /\b([A-Z]{3,10}COIN)\b/i,
  /\b(NVDA|TSLA|AAPL|AMD|MSFT|META|SPY|QQQ|AMZN|GOOGL|GOOG|AVGO|COIN|INTC|NFLX|ORCL|PLTR|QCOM|SHOP|V|WMT)\b/i,
  /\b(NVIDIA|TESLA|APPLE|MICROSOFT|AMAZON|ALPHABET|GOOGLE|FACEBOOK|INTEL|NETFLIX|ORACLE|PALANTIR|QUALCOMM|SHOPIFY|VISA|WALMART|BROADCOM|COINBASE|SPDR|INVESCO|ADVANCED MICRO DEVICES)\b/i,
];
const UNSUPPORTED_EVIDENCE_RE = /\b(news|headline|catalyst|earnings|announcement|announce|product launch|what happened|why did)\b/i;

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

/**
 * Keep the model useful for language understanding without allowing it to
 * replace the bounded, deterministic action vocabulary for known phrasing.
 * This is intentionally semantic normalization, not an exact-question rule.
 */
export function normalizeIntent(
  dilemma: string,
  modelIntent?: z.infer<typeof IntentContract> | null,
): z.infer<typeof IntentContract> {
  const raw = extractIntent(dilemma);
  const modelAsset = modelIntent?.asset && modelIntent.asset !== "unknown"
    ? modelIntent.asset.trim()
    : null;
  const asset = raw.assetMention ?? modelAsset ?? "unknown";
  const action = raw.action !== "unclear" ? raw.action : (modelIntent?.action ?? "unclear");
  const clarificationNeeded = asset === "unknown" || action === "unclear";
  return IntentContract.parse({
    asset,
    resolvedSymbol: modelIntent?.resolvedSymbol ?? null,
    action,
    timeframeContext: raw.timeframeContext,
    decisionQuestion: raw.decisionQuestion,
    clarificationNeeded,
    clarificationQuestion: clarificationNeeded
      ? modelIntent?.clarificationQuestion ?? raw.clarificationQuestion
      : null,
  });
}

/**
 * News/catalyst questions are a truthful unsupported capability, not an
 * invitation to invent a market answer. The caller may still establish live
 * context before returning an unresolved brief when an asset is known.
 */
export function unsupportedEvidenceReason(dilemma: string): string | null {
  const raw = extractIntent(dilemma);
  if (!raw.assetMention || raw.action !== "unclear" || !UNSUPPORTED_EVIDENCE_RE.test(dilemma)) return null;
  return `CLINCH can establish live market context for ${raw.assetMention}, but it has no supported news or catalyst source to answer that question.`;
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
