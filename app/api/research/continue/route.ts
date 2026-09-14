import { z } from "zod";
import { getStore } from "@/server/db";
import { readOwner, ownsSession } from "@/server/auth";
import { sseEncode, sseResponse, sameOrigin } from "@/server/stream";
import { parseIntentFlow, resolveAsset, assetIdentity, capabilityData, driveLoop, assembleBrief } from "@/server/flow";
import { RESEARCH_LOOP_CAP } from "@/config/thresholds";
import { modelConfigured } from "@/model/provider";
import { qwenProvider } from "@/model/qwen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const ContinueBody = z.object({
  sessionId: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  text: z.string().trim().min(1).max(500),
});

// Resume a clarifying session with the user's answer, then run the loop.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = ContinueBody.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });

  const store = await getStore();
  const owner = await readOwner();
  const row = await store.getSession(parsed.data.sessionId);
  if (!row || !ownsSession(row.ownerVerifier, row.id, owner.secret)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (row.stateVersion !== parsed.data.expectedVersion) {
    return Response.json({ error: "VERSION_CONFLICT", session: snap(row) }, { status: 409 });
  }
  const st = row.state as unknown as {
    intent: { asset?: string; action?: string } | null; assetIdentity: import("@/server/flow").AssetIdentity | null; clarificationRound: number;
    dilemma: string; read: string; resolvedTopics: string[]; facts: Record<string, unknown>;
    skips: { check: string; reason: string }[]; uncertainty: string[];
    hingeHistory: { hinge: string; topic?: string | null; question?: string | null; verdict: string }[]; spotSymbol: string | null;
    perpSymbol: string | null; context: string; known: string[]; stopReason: string | null;
    terminal: import("@/server/ux-text").TerminalKind | null;
    terminalReasonCode: import("@/server/ux-text").TerminalReasonCode | null;
  };
  if (row.status !== "clarifying") {
    return Response.json({ error: "NOT_CLARIFYING", session: snap(row) }, { status: 409 });
  }
  if (st.clarificationRound >= 3) {
    await store.compareAndSet(row.id, row.stateVersion, { status: "failed", state: { ...st, stopReason: "Too many clarification rounds; please start fresh with a concrete decision." } });
    return Response.json({ error: "CLARIFICATION_EXHAUSTED" }, { status: 422 });
  }
  st.clarificationRound += 1;
  const combined = `${st.dilemma}\nUser clarification: ${parsed.data.text}`;
  const model = modelConfigured() ? qwenProvider : null;
  const intent = await parseIntentFlow(combined, model);
  st.intent = intent as unknown as typeof st.intent;
  if (intent.clarificationNeeded || intent.action === "unclear") {
    const clarified = await store.compareAndSet(row.id, row.stateVersion, { intent, state: st as unknown as Record<string, unknown> });
    if (!clarified) {
      const current = await store.getSession(row.id);
      return Response.json({ error: "VERSION_CONFLICT", session: current ? snap(current) : null }, { status: 409 });
    }
    return Response.json({ session: snap(clarified), clarify: intent.clarificationQuestion });
  }
  const resolved = await resolveAsset(intent.asset).catch(() => ({ spot: null, perp: null, ticker: null, companyName: null, universe: 0 }));
  if (!resolved.spot) return Response.json({ error: "UNSUPPORTED_ASSET", session: snap(row) }, { status: 422 });
  const canonicalIntent = { ...intent, asset: resolved.ticker ?? intent.asset, resolvedSymbol: resolved.spot };
  st.intent = canonicalIntent as unknown as typeof st.intent;
  st.assetIdentity = assetIdentity(resolved);
  st.spotSymbol = resolved.spot;
  st.perpSymbol = resolved.perp;
  // Atomic run claim: only one loop may own this session version.
  const claimed = await store.compareAndSet(row.id, row.stateVersion, { status: "researching", intent: st.intent, state: st as unknown as Record<string, unknown> });
  if (!claimed) {
    const current = await store.getSession(row.id);
    return Response.json({ error: "VERSION_CONFLICT", session: current ? snap(current) : null }, { status: 409 });
  }
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (type: string, data: unknown) => controller.enqueue(enc.encode(sseEncode(type, data)));
      const finish = () => { try { controller.close(); } catch { /* closed */ } };
      try {
        send("session", { session: snap(claimed) });
        const finalSt = await driveLoop(row.id, {
          asset: canonicalIntent.asset, spotSymbol: st.spotSymbol ?? "", perpSymbol: st.perpSymbol,
          action: intent.action, read: "undecided", resolvedTopics: [],
          facts: (st.facts ?? {}) as import("@/research/orchestrator").MarketFacts,
          data: capabilityData(st.spotSymbol, st.perpSymbol),
          context: intent.timeframeContext, known: [],
        }, {
          store,
          onEvent: (e) => send(e.type, e.data),
          persistStep: async (kind, family, summary, provenance) => {
            const existing = await store.getSteps(row.id);
            await store.appendStep({ sessionId: row.id, ord: 1000 + existing.length, kind, family,
              requestSummary: JSON.stringify(summary).slice(0, 500), resultSummary: summary, provenance });
          },
          maxIterations: RESEARCH_LOOP_CAP,
        });
        const brief = assembleBrief({ intent: canonicalIntent, read: finalSt.read,
          hingeHistory: finalSt.hingeHistory, skips: finalSt.skips, uncertainty: finalSt.uncertainty,
          terminal: finalSt.terminal!, terminalReasonCode: finalSt.terminalReasonCode! }, st.spotSymbol);
        const after = await store.getSession(row.id);
        await store.compareAndSet(row.id, after!.stateVersion, {
          status: finalSt.terminal!,
          read: finalSt.read === "cannot-resolve" ? "cannot-resolve" : mapRead(finalSt.read), intent,
          state: { ...st, read: finalSt.read, resolvedTopics: finalSt.resolvedTopics, facts: finalSt.facts,
            skips: finalSt.skips, uncertainty: finalSt.uncertainty, hingeHistory: finalSt.hingeHistory, stopReason: finalSt.stopReason,
            terminal: finalSt.terminal, terminalReasonCode: finalSt.terminalReasonCode },
          brief: { ...brief, polishedText: null, polished: false },
        });
        send("brief", { brief: { ...brief, polishedText: null, polished: false }, status: finalSt.terminal });
        finish();
      } catch (e) {
        await store.compareAndSet(row.id, (await store.getSession(row.id))?.stateVersion ?? claimed.stateVersion, { status: "failed", state: { ...st, stopReason: "Research could not complete. Your saved state is preserved; try again." } });
        send("error", { code: "FAILED", message: "Research could not complete. Your saved state is preserved; try again." });
        finish();
      }
    },
  });
  return sseResponse(stream, null);
}

function snap(row: { id: string; status: string; read: string; stateVersion: number; state: unknown; brief: unknown }) {
  return { id: row.id, status: row.status, read: row.read, stateVersion: row.stateVersion, state: row.state, brief: row.brief };
}

function mapRead(read: string): string {
  if (read === "enter-now") return "leaning-in";
  if (read === "wait") return "holding-off";
  if (read === "stand-aside") return "standing-aside";
  return read;
}
