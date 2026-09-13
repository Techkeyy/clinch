import { z } from "zod";
import { newSessionId } from "@/lib/ownership";
import { DilemmaInput, IdempotencyKey } from "@/domain/types";
import { LOGIC_VERSION, RESEARCH_LOOP_CAP } from "@/config/thresholds";
import { getStore } from "@/server/db";
import { readOwner, mintOwner, ownsSession, verifierFor } from "@/server/auth";
import { checkStartLimits, trustedNetworkSource } from "@/server/rate";
import { sseEncode, sseResponse, sameOrigin } from "@/server/stream";
import { parseIntentFlow, resolveAsset, assembleBrief, driveLoop } from "@/server/flow";
import type { IntentContract } from "@/domain/types";
import { establishBaseline } from "@/research/orchestrator";
import { modelConfigured, type ModelProvider } from "@/model/provider";
import { qwenProvider } from "@/model/qwen";
import type { SessionStore } from "@/persistence/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const StartBody = z.object({ dilemma: DilemmaInput.shape.dilemma, idempotencyKey: IdempotencyKey });

function publicSession(row: { id: string; status: string; read: string; stateVersion: number; state: unknown; brief: unknown }) {
  return { id: row.id, status: row.status, read: row.read, stateVersion: row.stateVersion, state: row.state, brief: row.brief };
}

async function getModel(): Promise<ModelProvider | null> {
  return modelConfigured() ? qwenProvider : null;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const len = Number(req.headers.get("content-length") || "0");
  if (len > 32768) return Response.json({ error: "BODY_TOO_LARGE" }, { status: 413 });
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "INVALID_CONTENT_TYPE" }, { status: 415 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = StartBody.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });

  const store = await getStore();
  const ip = await trustedNetworkSource();
  const owner = await readOwner();
  const limit = await checkStartLimits(store, owner.secret, ip);
  if (!limit.ok) return Response.json({ error: limit.code }, { status: 429 });
  // Opportunistic bounded retention cleanup (P15; no worker). Failures never block research.
  store.pruneExpired(Date.now()).catch(() => {});

  let secret = owner.secret;
  let setCookie: string | null = null;
  if (!secret) {
    const minted = mintOwner();
    secret = minted.secret;
    setCookie = minted.setCookie;
  }

  const existing = await store.findByIdempotencyKey(parsed.data.idempotencyKey);
  if (existing) {
    if (!ownsSession(existing.ownerVerifier, existing.id, secret)) {
      return Response.json({ error: "KEY_CONFLICT" }, { status: 409 });
    }
    const prior = (existing.state as unknown as { dilemma?: string })?.dilemma;
    if (typeof prior === "string" && prior !== parsed.data.dilemma) {
      return Response.json({ error: "KEY_CONFLICT" }, { status: 409 });
    }
    const steps = await store.getSteps(existing.id);
    return Response.json({ replayed: true, session: publicSession(existing), steps }, { headers: setCookie ? { "Set-Cookie": setCookie } : {} });
  }

  const sessionId = newSessionId();
  const verifier = verifierFor(sessionId, secret);
  const events: { type: string; data: unknown }[] = [];
  const emit = (e: { type: string; data: unknown }) => events.push(e);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (type: string, data: unknown) => {
        events.push({ type, data });
        controller.enqueue(enc.encode(sseEncode(type, data)));
      };
      const finish = () => { send("done", { sessionId }); controller.close(); };
      try {
        let created;
        try {
          created = await store.createSession({
            id: sessionId, ownerVerifier: verifier, intent: null,
            state: initialFlowState(parsed.data.dilemma), status: "awaiting", read: "undecided",
            logicVersion: LOGIC_VERSION, idempotencyKey: parsed.data.idempotencyKey,
            stateVersion: 0, brief: null,
          });
        } catch (e) {
          // Lost a create race on the idempotency key: replay the winner.
          const winner = await store.findByIdempotencyKey(parsed.data.idempotencyKey);
          if (winner && ownsSession(winner.ownerVerifier, winner.id, secret)) {
            const steps = await store.getSteps(winner.id);
            send("session", { session: publicSession(winner), replayed: true });
            for (const s of steps) send("step", { kind: s.kind, family: s.family, summary: s.requestSummary });
            finish();
            return;
          }
          throw e;
        }
        send("session", { session: publicSession(created) });

        const model = await getModel();
        const intent = await parseIntentFlow(parsed.data.dilemma, model);
        if (intent.clarificationNeeded || intent.action === "unclear") {
          const st = stateOf(created);
          st.intent = intent;
          await store.compareAndSet(sessionId, created.stateVersion, { intent, status: "clarifying", state: st as unknown as Record<string, unknown> });
          send("clarify", { question: intent.clarificationQuestion ?? "What are you deciding? Tell me the asset and whether you are considering entering, exiting, or waiting." });
          finish();
          return;
        }
        if (!intent.asset || intent.asset === "unknown") {
          await failSession(store, sessionId, "clarify", "No asset found. Tell me which asset, such as RNVDA, and what you are considering.");
          send("clarify", { question: "Which asset are you considering? For example: RNVDA." });
          finish();
          return;
        }
        const resolved = await resolveAsset(intent.asset, undefined).catch(() => ({ spot: null, perp: null, universe: 0 }));
        if (!resolved.spot) {
          await failSession(store, sessionId, "failed", `UNSUPPORTED_ASSET: ${intent.asset} is not a currently supported Reality instrument.`);
          send("error", { code: "UNSUPPORTED_ASSET", message: `${intent.asset} is not a currently supported Reality instrument. Try RNVDA.` });
          finish();
          return;
        }
        const rowNow = await store.getSession(sessionId);
        if (!rowNow) {
          send("error", { code: "FAILED", message: "Session vanished mid-start; please retry." });
          finish();
          return;
        }
        const st = stateOf(rowNow);
        st.intent = { ...intent, resolvedSymbol: resolved.spot };
        st.spotSymbol = resolved.spot;
        st.perpSymbol = resolved.perp;
        await store.compareAndSet(sessionId, (await store.getSession(sessionId))!.stateVersion,
          { intent: st.intent, status: "context", state: st as unknown as Record<string, unknown> });
        send("intent", { intent: st.intent, spotSymbol: resolved.spot, perpSymbol: resolved.perp });

        const base = await establishBaseline(resolved.spot, resolved.perp, undefined);
        st.facts = base.facts as unknown as Record<string, unknown>;
        for (const p of base.problems) st.uncertainty.push(p);
        await store.appendStep({ sessionId, ord: 0, kind: "baseline", family: null,
          requestSummary: `baseline ${resolved.spot}`, resultSummary: { facts: base.facts, problems: base.problems },
          provenance: base.evidence.map((e) => (e as { provenance: unknown }).provenance) });
        send("baseline", { facts: base.facts, problems: base.problems });
        const researching = await store.getSession(sessionId);
        if (researching) {
          await store.compareAndSet(sessionId, researching.stateVersion, { status: "researching" });
        }

        const runState = {
          asset: st.intent.asset, spotSymbol: st.spotSymbol as string, perpSymbol: st.perpSymbol,
          action: st.intent.action, read: "undecided",
          resolvedTopics: [] as string[], facts: base.facts,
          data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
          context: st.intent.timeframeContext, known: [] as string[],
        };
        let ord = 10;
        const finalSt = await driveLoop(sessionId, runState, {
          store,
          onEvent: (e) => send(e.type, e.data),
          persistStep: async (kind, family, summary, provenance) => {
            ord += 1;
            await store.appendStep({ sessionId, ord, kind, family, requestSummary: JSON.stringify(summary).slice(0, 500), resultSummary: summary, provenance });
          },
          maxIterations: RESEARCH_LOOP_CAP,
        });
        Object.assign(st, { read: finalSt.read, resolvedTopics: finalSt.resolvedTopics, facts: finalSt.facts,
          skips: finalSt.skips, uncertainty: [...st.uncertainty, ...finalSt.uncertainty],
          hingeHistory: finalSt.hingeHistory, stopReason: finalSt.stopReason });
        const brief = assembleBrief({ ...st, intent: st.intent }, st.spotSymbol);
        let polished: string | null = null;
        if (model) {
          const sections: Record<string, string> = {
            decision: brief.decision, read: brief.read, why: brief.why,
            findings: brief.findings.join(" | "), skipped: brief.skipped.map((s) => `${s.check}: ${s.reason}`).join(" | "),
            uncertainty: brief.openQuestions.join(" | "), triggers: brief.changeTriggers.join(" | "),
          };
          for (let attempt = 0; attempt < 2; attempt++) {
            const r = await model.polishBrief(sections);
            if (r.ok) { polished = r.value; break; }
          }
        }
        const terminal = finalSt.read === "cannot-resolve" ? "unresolved" : "stopped";
        const after = await store.getSession(sessionId);
        await store.compareAndSet(sessionId, after!.stateVersion, {
          status: terminal, read: finalSt.read === "cannot-resolve" ? "cannot-resolve" : mapRead(finalSt.read),
          state: st as unknown as Record<string, unknown>,
          brief: { ...brief, polishedText: polished, polished: polished !== null },
        });
        send("brief", { brief: { ...brief, polishedText: polished, polished: polished !== null }, status: terminal });
        finish();
      } catch (e) {
        send("error", { code: "FAILED", message: e instanceof Error ? e.message : "Research failed." });
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
  return sseResponse(stream, setCookie);
}

function initialFlowState(dilemma: string) {
  return { dilemma, intent: null, read: "undecided", resolvedTopics: [], facts: {},
    skips: [], uncertainty: [], hingeHistory: [], stopReason: null, briefStatus: "none",
    spotSymbol: null, perpSymbol: null, context: "", known: [], clarificationRound: 0,
    data: { "spot-structure": "fresh", "perp-positioning": "fresh" } };
}
interface FlowStateShape {
  dilemma: string; intent: IntentContract | null; read: string;
  resolvedTopics: string[]; facts: Record<string, unknown>;
  skips: { check: string; reason: string }[]; uncertainty: string[];
  hingeHistory: { hinge: string; verdict: string }[]; stopReason: string | null;
  briefStatus: string; spotSymbol: string | null; perpSymbol: string | null;
  context: string; known: string[]; clarificationRound: number;
  data: Record<string, string>;
}
function stateOf(row: { state: unknown }) {
  return row.state as unknown as FlowStateShape;
}
async function failSession(store: SessionStore, id: string, status: string, message: string) {
  const cur = await store.getSession(id);
  if (!cur) return;
  await store.compareAndSet(id, cur.stateVersion, { status, read: "cannot-resolve", state: { ...(cur.state as object), stopReason: message } });
}
function mapRead(read: string): string {
  if (read === "enter-now") return "leaning-in";
  if (read === "wait") return "holding-off";
  if (read === "stand-aside") return "standing-aside";
  return read;
}
