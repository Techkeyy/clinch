import { generateObject, generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { IntentContract } from "../domain/types";
import type { ModelProvider, ModelResult } from "./provider";

// Qwen via DashScope OpenAI-compatible endpoint. Constructed only when the
// credential exists; P9 resolves workspace/region/model with the owner.
function client() {
  const baseURL = process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY is not configured");
  const provider = createOpenAICompatible({ name: "qwen", baseURL, apiKey });
  return provider(process.env.QWEN_MODEL || "qwen-plus");
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const gate = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms); });
  try {
    return await Promise.race([p, gate]);
  } finally {
    clearTimeout(timer!);
  }
}

export const qwenProvider: ModelProvider = {
  name: "qwen-dashscope",
  async parseIntent(dilemma: string): Promise<ModelResult<z.infer<typeof IntentContract>>> {
    try {
      const { object } = await withTimeout(generateObject({
        model: client(),
        schema: IntentContract,
        system: "Extract a trading decision into the exact schema. asset: short ticker mention. action: one of enter-now, exit-now, wait, stand-aside, unclear. Never invent execution. If the decision is unclear, set clarificationNeeded true with one concise question.",
        prompt: dilemma.slice(0, 2000),
      }), 20_000, "intent parse");
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
      }), 20_000, "brief polish");
      return { ok: true, value: text };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
