import { z } from "zod";
import { getStore } from "@/server/db";
import { readOwner, ownsSession } from "@/server/auth";
import { sseEncode, sseResponse, sameOrigin } from "@/server/stream";
import { retryAllowed } from "@/server/retry";
import { driveLoop, assembleBrief } from "@/server/flow";
import { buildResumeInput } from "@/server/resume";
import { RESEARCH_LOOP_CAP, MAX_STEP_RETRIES } from "@/config/thresholds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

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
  if (!retryAllowed(row.status, row.updatedAt, Date.now())) {
    // Presumed-interrupted runs (researching but untouched beyond STALE_RUN_MS)
    // may resume; anything actively fresh is rejected to avoid forked runs.
    return Response.json({ error: "NOT_RETRYABLE" }, { status: 409 });
  }
  const st = row.state as unknown as {
    intent: import("@/domain/types").IntentContract | null;
    read: string; resolvedTopics: string[]; facts: Record<string, unknown>;
    skips: { check: string; reason: string; kind?: string }[]; uncertainty: string[];
    hingeHistory: { hinge: string; topic?: string | null; question?: string | null; verdict: string }[];
    spotSymbol: string | null; perpSymbol: string | null; context: string; known: string[]; stopReason?: string | null;
    terminal?: import("@/server/ux-text").TerminalKind | null;
    terminalReasonCode?: import("@/server/ux-text").TerminalReasonCode | null;
    retries?: number;
  };
  if ((st.retries ?? 0) >= MAX_STEP_RETRIES) {
    return Response.json({ error: "RETRY_EXHAUSTED" }, { status: 422 });
  }
  const intent = st.intent;
  if (!intent) return Response.json({ error: "NOT_RETRYABLE" }, { status: 409 });
  // Atomic run claim: concurrent resumes serialize here; loser gets current state.
  const claimed = await store.compareAndSet(row.id, row.stateVersion, { status: "researching" });
  const snapOf = (r: { id: string; status: string; read: string; stateVersion: number; state: unknown; brief: unknown }) =>
    ({ id: r.id, status: r.status, read: r.read, stateVersion: r.stateVersion, state: r.state, brief: r.brief });
  if (!claimed) {
    const current = await store.getSession(row.id);
    return Response.json({ error: "VERSION_CONFLICT", session: current ? snapOf(current) : null }, { status: 409 });
  }
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (type: string, data: unknown) => controller.enqueue(enc.encode(sseEncode(type, data)));
      try {
        send("session", { session: { id: row.id, status: "researching", read: row.read, stateVersion: claimed.stateVersion } });
        const finalSt = await driveLoop(row.id, buildResumeInput({
          intent, spotSymbol: st.spotSymbol, perpSymbol: st.perpSymbol, read: st.read,
          resolvedTopics: st.resolvedTopics, facts: st.facts,
          context: st.context, known: st.known, skips: st.skips,
          uncertainty: st.uncertainty, stopReason: st.stopReason, hingeHistory: st.hingeHistory,
        }), {
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
          hingeHistory: finalSt.hingeHistory, skips: finalSt.skips, uncertainty: finalSt.uncertainty,
          terminal: finalSt.terminal!, terminalReasonCode: finalSt.terminalReasonCode!, facts: finalSt.facts }, st.spotSymbol);
        const after = await store.getSession(row.id);
        await store.compareAndSet(row.id, after!.stateVersion, {
          status: finalSt.terminal!,
          read: finalSt.read === "cannot-resolve" ? "cannot-resolve" : mapRead(finalSt.read),
          state: { ...st, read: finalSt.read, resolvedTopics: finalSt.resolvedTopics, facts: finalSt.facts,
            skips: finalSt.skips, uncertainty: finalSt.uncertainty, hingeHistory: finalSt.hingeHistory,
            stopReason: finalSt.stopReason, retries: (st.retries ?? 0) + 1,
            terminal: finalSt.terminal, terminalReasonCode: finalSt.terminalReasonCode },
          brief: { ...brief, polishedText: null, polished: false },
        });
        send("brief", { brief: { ...brief, polishedText: null, polished: false }, status: finalSt.terminal });
        send("done", { sessionId: row.id });
        controller.close();
      } catch (e) {
        await store.compareAndSet(row.id, (await store.getSession(row.id))?.stateVersion ?? claimed.stateVersion, { status: "failed", state: { ...st, stopReason: "Research could not complete. Your saved state is preserved; try again." } });
        send("error", { code: "FAILED", message: "Research could not complete. Your saved state is preserved; try again." });
        try { controller.close(); } catch { /* closed */ }
      }
    },
  });
  return sseResponse(stream, null);
}

function mapRead(read: string): string {
  if (read === "enter-now") return "leaning-in";
  if (read === "wait") return "holding-off";
  if (read === "stand-aside") return "standing-aside";
  return read;
}
