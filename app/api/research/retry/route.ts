import { z } from "zod";
import { getStore } from "@/server/db";
import { readOwner, ownsSession } from "@/server/auth";
import { sseEncode, sseResponse, sameOrigin } from "@/server/stream";
import { driveLoop, assembleBrief } from "@/server/flow";
import { RESEARCH_LOOP_CAP, MAX_STEP_RETRIES } from "@/config/thresholds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RetryBody = z.object({
  sessionId: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
});

// Safe retry: re-runs the loop from persisted state (max 3 lifecycles per session).
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = RetryBody.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const store = await getStore();
  const owner = await readOwner();
  const row = await store.getSession(parsed.data.sessionId);
  if (!row || !ownsSession(row.ownerVerifier, row.id, owner.secret)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (row.stateVersion !== parsed.data.expectedVersion) {
    return Response.json({ error: "VERSION_CONFLICT" }, { status: 409 });
  }
  if (!["failed", "stopped", "unresolved"].includes(row.status)) {
    return Response.json({ error: "NOT_RETRYABLE" }, { status: 409 });
  }
  const st = row.state as unknown as {
    intent: import("@/domain/types").IntentContract | null;
    read: string; resolvedTopics: string[]; facts: Record<string, unknown>;
    skips: { check: string; reason: string }[]; uncertainty: string[];
    hingeHistory: { hinge: string; verdict: string }[];
    spotSymbol: string | null; perpSymbol: string | null; context: string; known: string[];
    retries?: number;
  };
  if ((st.retries ?? 0) >= MAX_STEP_RETRIES) {
    return Response.json({ error: "RETRY_EXHAUSTED" }, { status: 422 });
  }
  const intent = st.intent;
  if (!intent) return Response.json({ error: "NOT_RETRYABLE" }, { status: 409 });
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (type: string, data: unknown) => controller.enqueue(enc.encode(sseEncode(type, data)));
      try {
        send("session", { session: { id: row.id, status: "researching", read: row.read, stateVersion: row.stateVersion } });
        const finalSt = await driveLoop(row.id, {
          asset: intent.asset, spotSymbol: st.spotSymbol ?? "", perpSymbol: st.perpSymbol,
          action: intent.action, read: st.read === "cannot-resolve" ? "undecided" : st.read,
          resolvedTopics: [...st.resolvedTopics], facts: JSON.parse(JSON.stringify(st.facts ?? {})),
          data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
          context: st.context ?? "", known: [...(st.known ?? [])],
        }, {
          store,
          onEvent: (e) => send(e.type, e.data),
          persistStep: async (kind, family, summary, provenance) => {
            const steps = await store.getSteps(row.id);
            await store.appendStep({ sessionId: row.id, ord: 1000 + steps.length, kind, family,
              requestSummary: JSON.stringify(summary).slice(0, 500), resultSummary: summary, provenance });
          },
          maxIterations: RESEARCH_LOOP_CAP,
        });
        const brief = assembleBrief({ intent, read: finalSt.read,
          hingeHistory: finalSt.hingeHistory, skips: finalSt.skips, uncertainty: finalSt.uncertainty }, st.spotSymbol);
        const after = await store.getSession(row.id);
        await store.compareAndSet(row.id, after!.stateVersion, {
          status: finalSt.read === "cannot-resolve" ? "unresolved" : "stopped",
          read: finalSt.read,
          state: { ...st, read: finalSt.read, resolvedTopics: finalSt.resolvedTopics, facts: finalSt.facts,
            skips: finalSt.skips, uncertainty: finalSt.uncertainty, hingeHistory: finalSt.hingeHistory,
            stopReason: finalSt.stopReason, retries: (st.retries ?? 0) + 1 },
          brief: { ...brief, polishedText: null, polished: false },
        });
        send("brief", { brief: { ...brief, polishedText: null, polished: false } });
        send("done", { sessionId: row.id });
        controller.close();
      } catch (e) {
        send("error", { code: "FAILED", message: e instanceof Error ? e.message : "Research failed." });
        try { controller.close(); } catch { /* closed */ }
      }
    },
  });
  return sseResponse(stream, null);
}
