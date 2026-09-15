import { z } from "zod";
import { newSessionId } from "@/lib/ownership";
import { DilemmaInput, IdempotencyKey } from "@/domain/types";
import { LOGIC_VERSION, RESEARCH_LOOP_CAP } from "@/config/thresholds";
import { getStore } from "@/server/db";
import { readOwner, mintOwner, verifierFor, currentAccountUserId, canAccessSession } from "@/server/auth";
import { checkStartLimits, trustedNetworkSource } from "@/server/rate";
import { sseEncode, sseResponse, sameOrigin } from "@/server/stream";
import { parseIntentFlow, resolveAsset, assetIdentity, capabilityData, assembleBrief, driveLoop } from "@/server/flow";
import { unsupportedEvidenceReason } from "@/domain/intent";
import type { IntentContract } from "@/domain/types";
import { establishBaseline } from "@/research/orchestrator";
import { modelConfigured, type ModelProvider } from "@/model/provider";
import { qwenProvider } from "@/model/qwen";
import { createTimingReporter, timedStage } from "@/server/timing";
import type { SessionStore } from "@/persistence/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const StartBody = z.object({
  dilemma: DilemmaInput.shape.dilemma,
  idempotencyKey: IdempotencyKey,
  selectedTicker: z.string().trim().min(1).max(20).optional(),
  selectedRealityTicker: z.string().trim().min(1).max(24).optional(),
});

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
  const accountUserId = await currentAccountUserId();
  const limit = await checkStartLimits(store, owner.secret ?? accountUserId, ip);
  if (!limit.ok) return Response.json({ error: limit.code }, { status: 429 });
  // Opportunistic bounded retention cleanup (P15; no worker). Failures never block research.
  store.pruneExpired(Date.now()).catch(() => {});

  let secret = owner.secret;
  let setCookie: string | null = null;
  if (!secret && !accountUserId) {
    const minted = mintOwner();
    secret = minted.secret;
    setCookie = minted.setCookie;
  }
  const signingSecret = secret ?? accountUserId;
  if (!signingSecret) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await store.findByIdempotencyKey(parsed.data.idempotencyKey);
  if (existing) {
    if (!canAccessSession(existing, secret, accountUserId)) {
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
  const verifier = verifierFor(sessionId, signingSecret);
  const events: { type: string; data: unknown }[] = [];
  const emit = (e: { type: string; data: unknown }) => events.push(e);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (type: string, data: unknown) => {
        events.push({ type, data });
        controller.enqueue(enc.encode(sseEncode(type, data)));
      };
      const timing = createTimingReporter((data) => send("timing", data));
      timing.mark("post-accepted");
      const finish = () => { timing.mark("final-stream-event"); send("done", { sessionId }); controller.close(); };
      try {
        let created;
        try {
          created = await store.createSession({
            id: sessionId, ownerVerifier: verifier, accountUserId, intent: null,
            state: initialFlowState(parsed.data.dilemma), status: "awaiting", read: "undecided",
            logicVersion: LOGIC_VERSION, idempotencyKey: parsed.data.idempotencyKey,
            stateVersion: 0, brief: null,
          });
        } catch (e) {
          // Lost a create race on the idempotency key: replay the winner.
          const winner = await store.findByIdempotencyKey(parsed.data.idempotencyKey);
          if (winner && canAccessSession(winner, secret, accountUserId)) {
            const steps = await store.getSteps(winner.id);
            send("session", { session: publicSession(winner), replayed: true });
            for (const s of steps) send("step", { kind: s.kind, family: s.family, summary: s.requestSummary });
            finish();
            return;
          }
          throw e;
        }
        send("session", { session: publicSession(created) });
        send("progress", { stage: "intent", label: "Understanding your decision." });

        const model = await getModel();
        const intent = await timedStage(timing, "qwen-intent-flow", () => parseIntentFlow(parsed.data.dilemma, model));
        const unsupportedReason = unsupportedEvidenceReason(parsed.data.dilemma);
        if ((intent.clarificationNeeded || intent.action === "unclear") && !unsupportedReason) {
          const st = stateOf(created);
          st.intent = intent;
          const clarified = await store.compareAndSet(sessionId, created.stateVersion, { intent, status: "clarifying", state: st as unknown as Record<string, unknown> });
          send("clarify", { stateVersion: clarified?.stateVersion ?? created.stateVersion, question: intent.clarificationQuestion ?? "What are you deciding? Tell me the asset and whether you are considering entering, exiting, or waiting." });
          finish();
          return;
        }
        if (!intent.asset || intent.asset === "unknown") {
          await failSession(store, sessionId, "clarify", "No stock found. Tell me which stock and what you are considering.");
          send("clarify", { question: "Which stock are you considering? Search supported stocks or describe it in your own words." });
          finish();
          return;
        }
        send("progress", { stage: "asset", label: "Resolving supported market context." });
        const resolved = await timedStage(timing, "asset-resolution", () => resolveAsset(intent.asset, undefined, parsed.data.selectedTicker, parsed.data.selectedRealityTicker)).catch(() => ({ spot: null, perp: null, ticker: null, companyName: null, universe: 0 }));
        if (!resolved.spot) {
          await failSession(store, sessionId, "failed", "The requested stock is not currently available from Bitget's Reality market data.");
          send("error", { code: "UNSUPPORTED_ASSET", message: "That stock is not currently available to research from Bitget's Reality market data. Try searching supported stocks or describe another stock." });
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
        st.intent = { ...intent, asset: resolved.ticker ?? intent.asset, resolvedSymbol: resolved.spot };
        st.assetIdentity = assetIdentity(resolved);
        st.spotSymbol = resolved.spot;
        st.perpSymbol = resolved.perp;
        const intentSaved = await store.compareAndSet(sessionId, (await store.getSession(sessionId))!.stateVersion,
          { intent: st.intent, status: "context", state: st as unknown as Record<string, unknown> });
        send("intent", { intent: st.intent, assetIdentity: st.assetIdentity, spotSymbol: resolved.spot, perpSymbol: resolved.perp, stateVersion: intentSaved?.stateVersion });
        send("progress", { stage: "baseline", label: "Establishing live context." });

        const base = await timedStage(timing, "bitget-baseline", () => establishBaseline(resolved.spot!, resolved.perp, undefined));
        st.facts = base.facts as unknown as Record<string, unknown>;
        for (const p of base.problems) st.uncertainty.push(p);
        await store.appendStep({ sessionId, ord: 0, kind: "baseline", family: null,
          requestSummary: `baseline ${resolved.spot}`, resultSummary: { facts: base.facts, problems: base.problems },
          provenance: base.evidence.map((e) => (e as { provenance: unknown }).provenance) });
        const researching = await store.getSession(sessionId);
        const researchingSaved = researching
          ? await store.compareAndSet(sessionId, researching.stateVersion, { status: "researching" })
          : null;
        send("baseline", { facts: base.facts, problems: base.problems, stateVersion: researchingSaved?.stateVersion });

        const runState = {
          asset: st.intent.asset, spotSymbol: st.spotSymbol as string, perpSymbol: st.perpSymbol,
          action: st.intent.action, read: "undecided",
          resolvedTopics: [] as string[], facts: base.facts,
          data: capabilityData(st.spotSymbol, st.perpSymbol),
          context: st.intent.timeframeContext, known: [] as string[],
          unsupportedReason: unsupportedReason ?? undefined,
        };
        send("progress", { stage: "hinge", label: "Finding the Decision Hinge." });
        let ord = 10;
        let activeResearchStage: string | null = null;
        const finalSt = await timedStage(timing, "deterministic-research-loop", () => driveLoop(sessionId, runState, {
          store,
          onEvent: (e) => {
            if (e.type === "hinge") timing.mark("hinge-selection");
            if (e.type === "research") {
              const family = String((e.data as { family?: unknown }).family ?? "market");
              activeResearchStage = "research-family-" + family;
              timing.start(activeResearchStage);
              send("progress", { stage: "research", label: "Researching the highest-value evidence." });
            }
            if (e.type === "finding") {
              const family = String((e.data as { family?: unknown }).family ?? "market");
              timing.end("research-family-" + family, "ok");
              activeResearchStage = null;
              timing.mark("finding-available");
              send("progress", { stage: "evaluation", label: "Evaluating whether more research matters." });
            }
            if (e.type === "stop" && activeResearchStage) {
              timing.end(activeResearchStage, "failed");
              activeResearchStage = null;
            }
            send(e.type, e.data);
          },
          persistStep: async (kind, family, summary, provenance) => {
            ord += 1;
            await timedStage(timing, "persistence-step-" + kind, () => store.appendStep({ sessionId, ord, kind, family, requestSummary: JSON.stringify(summary).slice(0, 500), resultSummary: summary, provenance }).then(() => undefined));
          },
          maxIterations: RESEARCH_LOOP_CAP,
        }));
        if (activeResearchStage) timing.end(activeResearchStage, "failed");
        Object.assign(st, { read: finalSt.read, resolvedTopics: finalSt.resolvedTopics, facts: finalSt.facts,
          skips: finalSt.skips, uncertainty: [...st.uncertainty, ...finalSt.uncertainty],
          hingeHistory: finalSt.hingeHistory, stopReason: finalSt.stopReason,
          terminal: finalSt.terminal, terminalReasonCode: finalSt.terminalReasonCode });
        const brief = assembleBrief({ ...st, intent: st.intent, terminal: finalSt.terminal!, terminalReasonCode: finalSt.terminalReasonCode! }, st.spotSymbol);
        // The deterministic brief is authoritative; optional prose polish never blocks or changes the result.
        const terminal = finalSt.terminal!;
        const after = await store.getSession(sessionId);
        await timedStage(timing, "persistence-final-brief", () => store.compareAndSet(sessionId, after!.stateVersion, {
          status: terminal, read: finalSt.read === "cannot-resolve" ? "cannot-resolve" : mapRead(finalSt.read),
          state: st as unknown as Record<string, unknown>,
          brief: { ...brief, polishedText: null, polished: false },
        }).then(() => undefined));
        send("brief", { brief: { ...brief, polishedText: null, polished: false }, status: terminal });
        finish();
      } catch (e) {
        await failSession(store, sessionId, "failed", "Research could not complete. Your saved state is preserved; try again.");
        send("error", { code: "FAILED", message: "Research could not complete. Your saved state is preserved; try again." });
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
    data: { "spot-structure": "missing", "perp-positioning": "missing" },
    assetIdentity: null, terminal: null, terminalReasonCode: null };
}
interface FlowStateShape {
  dilemma: string; intent: IntentContract | null; assetIdentity: import("@/server/flow").AssetIdentity | null; read: string;
  resolvedTopics: string[]; facts: Record<string, unknown>;
  skips: { check: string; reason: string }[]; uncertainty: string[];
  hingeHistory: { hinge: string; topic?: string | null; question?: string | null; verdict: string }[]; stopReason: string | null;
  briefStatus: string; spotSymbol: string | null; perpSymbol: string | null;
  context: string; known: string[]; clarificationRound: number;
  data: Record<string, string>;
  terminal: import("@/server/ux-text").TerminalKind | null;
  terminalReasonCode: import("@/server/ux-text").TerminalReasonCode | null;
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
