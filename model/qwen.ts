import { generateObject, generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { IntentContract } from "../domain/types";
import type { ModelProvider, ModelResult } from "./provider";

const BITGET_QWEN_BASE_URL = "https://hackathon.bitgetops.com/v1";
const BITGET_QWEN_MODEL = "qwen3.8-max";

// Qwen via the Bitget-sponsored OpenAI Chat Completions-compatible gateway.
// The endpoint and model are deliberately pinned to the proven production
// path; there is no alternate model/provider fallback.
function client() {
  const baseURL = (process.env.QWEN_BASE_URL || BITGET_QWEN_BASE_URL).replace(/\/+$/, "");
  const model = process.env.QWEN_MODEL || BITGET_QWEN_MODEL;
  const apiKey = process.env.BITGET_QWEN_API_KEY;
  if (!apiKey) throw new Error("BITGET_QWEN_API_KEY is not configured");
  if (baseURL !== BITGET_QWEN_BASE_URL) throw new Error("QWEN_BASE_URL must use the Bitget-sponsored gateway");
  if (model !== BITGET_QWEN_MODEL) throw new Error("QWEN_MODEL must use the proven Bitget-sponsored model");
  const provider = createOpenAICompatible({
    name: "qwen-bitget-sponsored",
    baseURL,
    apiKey,
    supportsStructuredOutputs: true,
  });
  return provider.chatModel(model);
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const startedAt = Date.now();
  console.info("[CLINCH_TIMING]", JSON.stringify({ stage: `qwen-${label}`, phase: "start" }));
  const gate = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms); });
  try {
    const result = await Promise.race([p, gate]);
    console.info("[CLINCH_TIMING]", JSON.stringify({ stage: `qwen-${label}`, phase: "end", durationMs: Date.now() - startedAt, outcome: "ok" }));
    return result;
  } catch (error) {
    console.info("[CLINCH_TIMING]", JSON.stringify({
      stage: `qwen-${label}`, phase: "end", durationMs: Date.now() - startedAt,
      outcome: error instanceof Error && /timed out/i.test(error.message) ? "timeout" : "failed",
    }));
    throw error;
  } finally {
    clearTimeout(timer!);
  }
}

export const qwenProvider: ModelProvider = {
  name: "qwen-bitget-sponsored",
  async parseIntent(dilemma: string): Promise<ModelResult<z.infer<typeof IntentContract>>> {
    try {
      const { object } = await withTimeout(generateObject({
        model: client(),
        schema: IntentContract,
        system: "Extract a trading decision into the exact schema. asset: short ticker mention. action: one of enter-now, exit-now, wait, stand-aside, unclear. Never invent execution. If the decision is unclear, set clarificationNeeded true with one concise question.",
        prompt: dilemma.slice(0, 2000),
      }), 60_000, "intent parse");
      return { ok: true, value: object };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
  async polishBrief(sections: Record<string, string>): Promise<ModelResult<string>> {
    try {
      const input = Object.entries(sections).map(([k, v]) => `${k}: ${v}`).join("\n").slice(0, 4000);
      const { text } = await withTimeout(generateText({
        model: client(),
        system: "Rewrite the structured research brief below in calm, plain sentences. Keep every section. Do not add statistics, sources, recommendations, or claims. Do not use em dashes or en dashes.",
        prompt: input,
      }), 60_000, "brief polish");
      return { ok: true, value: text };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
