import assert from "node:assert/strict";
import { qwenProvider } from "../model/qwen";

const startedAt = Date.now();
const supported = await qwenProvider.parseIntent("Should I wait for a better entry in NVIDIA stock?");
assert.equal(supported.ok, true);
if (supported.ok) {
  assert.equal(typeof supported.value.asset, "string");
  assert.equal(supported.value.asset.length > 0, true);
  assert.equal(typeof supported.value.action, "string");
  assert.equal(typeof supported.value.clarificationNeeded, "boolean");
}

const ambiguous = await qwenProvider.parseIntent("Should I buy it?");
const ambiguityHandled = ambiguous.ok
  ? typeof ambiguous.value.clarificationNeeded === "boolean"
  : typeof ambiguous.error === "string" && ambiguous.error.length > 0;
assert.equal(ambiguityHandled, true);

const approvedModel = process.env.QWEN_MODEL;
process.env.QWEN_MODEL = "not-an-approved-model";
const failClosed = await qwenProvider.parseIntent("Should I wait?");
process.env.QWEN_MODEL = approvedModel;
assert.equal(failClosed.ok, false);

console.log("QWEN_PROOF: PASS", JSON.stringify({ latencyMs: Date.now() - startedAt, provider: qwenProvider.name, structuredIntent: supported.ok, ambiguityHandled, ambiguityResult: ambiguous.ok ? "clarification-contract" : "provider-failure-contained", failClosed: !failClosed.ok }));
