import { z } from "zod";
import { IntentContract } from "../domain/types";

// Narrow model interface (P6). One configured provider at a time; switching is
// config-level. No provider fallback at runtime: unavailability is truthful.
export type ModelResult<T> = { ok: true; value: T } | { ok: false; error: string };
export interface ModelProvider {
  readonly name: string;
  parseIntent(dilemma: string): Promise<ModelResult<z.infer<typeof IntentContract>>>;
  polishBrief(sections: Record<string, string>): Promise<ModelResult<string>>;
}
export function modelConfigured(): boolean {
  return !!process.env.BITGET_QWEN_API_KEY;
}
