"use client";

import { useCallback, useRef, useState } from "react";
import { COPY } from "@/lib/copy";
import { FreshnessBadge, HingeCard, SkipRecord, CurrentRead } from "@/components/research";

interface StreamEvent { type: string; data: Record<string, unknown>; }
interface Finding { hinge: string; family: string; summary: string; observedAt: string | null; source: string; facts: Record<string, unknown>; }
interface Skip { check: string; reason: string; }

type Phase = "idle" | "submitting" | "streaming" | "clarify" | "brief" | "error";

function familyLabel(family: string): string {
  if (family === "spot-structure") return "Spot market structure";
  if (family === "perp-positioning") return "Positioning context";
  return family;
}
function shortUtc(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

function parseSSE(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    const lines = part.split("\n");
    let type = "message";
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("event:")) type = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) continue;
    try {
      events.push({ type, data: JSON.parse(dataLines.join("\n")) as Record<string, unknown> });
    } catch { /* partial chunk; wait for more */ }
  }
  return { events, rest };
}

export default function Page() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [dilemma, setDilemma] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stateVersion, setStateVersion] = useState(0);
  const [intent, setIntent] = useState<Record<string, unknown> | null>(null);
  const [baseline, setBaseline] = useState<Record<string, unknown> | null>(null);
  const [hinges, setHinges] = useState<{ hinge: string; question: string; why: string; changes: string; family: string }[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [skips, setSkips] = useState<Skip[]>([]);
  const [read, setRead] = useState<string | null>(null);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const [brief, setBrief] = useState<Record<string, unknown> | null>(null);
  const [clarifyQ, setClarifyQ] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);

  const applyEvent = useCallback((e: StreamEvent) => {
    const d = e.data;
    if (e.type === "session" && typeof d.session === "object" && d.session) {
      const s = d.session as { id: string; stateVersion: number };
      setSessionId(s.id);
      setStateVersion(s.stateVersion);
    } else if (e.type === "intent") {
      setIntent((d.intent ?? null) as Record<string, unknown> | null);
      setBaseline((prev) => ({ ...(typeof prev === "object" && prev ? prev : {}), ...(d as object) }));
    } else if (e.type === "baseline") {
      setBaseline((prev) => ({ ...(typeof prev === "object" && prev ? prev : {}), ...(d as object) }));
      setStatusLine("Live context established.");
    } else if (e.type === "hinge" && typeof d.hinge === "string") {
      setHinges((h) => [...h, { hinge: d.hinge as string, question: (d.question as string) ?? (d.hinge as string), why: (d.why as string) ?? "", changes: (d.changes as string) ?? "", family: (d.family as string) ?? "" }]);
      setStatusLine(null);
    } else if (e.type === "research") {
      setStatusLine(`Researching: ${String(d.family ?? "market data")}.`);
    } else if (e.type === "skip" && typeof d.check === "string") {
      const check = String(d.check);
      const reason = String((d as { reason?: unknown }).reason ?? "");
      setSkips((s) => (s.some((x) => x.check === check) ? s : [...s, { check, reason }]));
    } else if (e.type === "finding") {
      setFindings((f) => [...f, { hinge: String(d.hinge ?? ""), family: String(d.family ?? ""), summary: String((d as { summary?: unknown }).summary ?? ""), observedAt: ((d as { observedAt?: unknown }).observedAt as string) ?? null, source: String((d as { source?: unknown }).source ?? ""), facts: (d.facts ?? {}) as Record<string, unknown> }]);
      setStatusLine(null);
    } else if (e.type === "stop") {
      setStopReason(String((d as { reason?: unknown }).reason ?? "Stopped."));
      if ((d as { cannotResolve?: boolean }).cannotResolve) setRead("Cannot resolve");
    } else if (e.type === "brief") {
      setBrief((d.brief ?? null) as Record<string, unknown> | null);
      const b = d.brief as { read?: unknown } | null;
      if (typeof b?.read === "string") setRead(b.read);
      setPhase("brief");
      setBusy(false);
    } else if (e.type === "clarify") {
      setClarifyQ(String((d as { question?: unknown }).question ?? "What are you deciding?"));
      setPhase("clarify");
      setBusy(false);
    } else if (e.type === "error") {
      setError(String((d as { message?: unknown }).message ?? (d as { code?: unknown }).code ?? "Research failed."));
      setPhase("error");
      setBusy(false);
    }
  }, []);

  const runStream = useCallback(async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const ctype = res.headers.get("content-type") ?? "";
    if (!res.ok || !ctype.includes("text/event-stream")) {
      const j = await res.json().catch(() => ({}));
      const err = (j as { error?: unknown }).error;
      setError(typeof err === "string" ? err : `Request failed (${res.status}).`);
      setPhase("error");
      setBusy(false);
      return;
    }
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parsed = parseSSE(buf);
      buf = parsed.rest;
      for (const e of parsed.events) {
        if (e.type === "done") { setBusy(false); continue; }
        applyEvent(e);
      }
    }
  }, [applyEvent]);

  const start = useCallback(async () => {
    if (busy || dilemma.trim().length < 4) return;
    setBusy(true);
    setPhase("streaming");
    setError(null);
    setHinges([]);
    setFindings([]);
    setSkips([]);
    setRead(null);
    setStopReason(null);
    setBrief(null);
    setIntent(null);
    setBaseline(null);
    keyRef.current = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    try {
      await runStream("/api/research/start", { dilemma: dilemma.trim(), idempotencyKey: keyRef.current });
    } catch {
      setError("Could not reach CLINCH. Check your connection and retry.");
      setPhase("error");
      setBusy(false);
    }
  }, [busy, dilemma, runStream]);

  const answerClarify = useCallback(async (text: string) => {
    if (!sessionId || busy) return;
    setBusy(true);
    setPhase("streaming");
    setClarifyQ(null);
    try {
      await runStream("/api/research/continue", { sessionId, expectedVersion: stateVersion, text });
    } catch {
      setError("Could not reach CLINCH. Check your connection and retry.");
      setPhase("error");
      setBusy(false);
    }
  }, [sessionId, stateVersion, busy, runStream]);

  return (
    <div className="wrap">
      <div className="column">
        <header>
          <p className="micro-label">CLINCH</p>
          <h1 className="hero-question display">{COPY.heroQuestion}</h1>
          <p className="body-text">{COPY.heroSupport}</p>
        </header>
        <main>
          <section aria-label="Decision input">
            <label className="micro-label" htmlFor="dilemma">{COPY.inputLabel}</label>
            <textarea
              id="dilemma"
              className="input-box"
              value={dilemma}
              onChange={(e) => setDilemma(e.target.value)}
              placeholder={COPY.inputPlaceholder}
              maxLength={2000}
              disabled={busy}
            />
            <div className="chip-row" aria-label="Example dilemmas">
              <button type="button" className="chip" disabled={busy} onClick={() => setDilemma("rNVDA fell hard after the close. I am thinking of buying the dip. Real opportunity or wait?")}>rNVDA dip</button>
              <button type="button" className="chip" disabled={busy} onClick={() => setDilemma("rTSLA spiked fast on a wide spread late in the session. Breakout or thin print?")}>Thin rTSLA move</button>
              <button type="button" className="chip" disabled={busy} onClick={() => setDilemma("rAAPL is flat but perp desks look crowded into tomorrow. Enter before the event?")}>Crowded rAAPL</button>
            </div>
            <button type="button" className="cta-primary" disabled={busy || dilemma.trim().length < 4} onClick={start}>
              {busy ? "Checking this trade..." : COPY.ctaCheck}
            </button>
            <p className="secondary-text">{COPY.trustLine}</p>
          </section>

          {intent && (
            <section aria-label="Decision restatement">
              <h2 className="section-title">Your decision</h2>
              <p className="body-text">
                {String((intent as { asset?: unknown }).asset ?? "")} | Considering: {String((intent as { action?: unknown }).action ?? "").replace("-", " ")}
              </p>
            </section>
          )}

          {baseline && (baseline as { facts?: unknown }).facts !== undefined && (
            <section aria-label="Market context">
              <h2 className="section-title">Live context</h2>
              <FreshnessBadge status="live" label="Live" />
            </section>
          )}

          {hinges.map((h, i) => (
            <HingeCard key={`${h.hinge}-${i}`} n={i + 1} question={h.question} why={h.why} changes={h.changes} />
          ))}

          {statusLine && (
            <section aria-label="Research progress" aria-live="polite">
              <p className="body-text">{statusLine}</p>
            </section>
          )}

          {findings.map((f, i) => (
            <section key={i} aria-label="Evidence finding">
              <h2 className="section-title">Finding</h2>
              <p className="body-text">{f.summary}</p>
              <p className="secondary-text">{f.family === "spot-structure" ? "Bitget Reality market" : f.family === "perp-positioning" ? "Bitget stock-perp positioning" : f.source}{shortUtc(f.observedAt) ? `, observed ${shortUtc(f.observedAt)}` : ""}.</p>
            </section>
          ))}

          {read && <CurrentRead read={read} note="Current research read, not a prediction. You decide." />}

          {skips.map((s, i) => (
            <SkipRecord key={i} check={s.check} reason={s.reason} />
          ))}

          {stopReason && (
            <section aria-label="Stop state">
              <p className="body-text">{stopReason}</p>
            </section>
          )}

          {phase === "clarify" && clarifyQ && (
            <section aria-label="Clarification">
              <h2 className="section-title">{clarifyQ}</h2>
              <div className="chip-row">
                <button type="button" className="chip" disabled={busy} onClick={() => answerClarify("I am considering entering now.")}>Enter now</button>
                <button type="button" className="chip" disabled={busy} onClick={() => answerClarify("I am considering exiting.")}>Exit</button>
                <button type="button" className="chip" disabled={busy} onClick={() => answerClarify("I am considering waiting.")}>Wait for a better moment</button>
                <button type="button" className="chip" disabled={busy} onClick={() => answerClarify("I am not deciding yet.")}>I am not deciding yet</button>
              </div>
            </section>
          )}

          {brief && (
            <section className="brief-card" aria-label="Final brief">
              <h2 className="section-title">Research brief</h2>
              <p className="body-text">Read: {String((brief as { read?: unknown }).read ?? "")}</p>
              <p className="body-text">Why: {String((brief as { why?: unknown }).why ?? "")}</p>
              {Array.isArray((brief as { skipped?: unknown }).skipped) && ((brief as { skipped: { check: string; reason: string }[] }).skipped.length > 0) && (
                <div>
                  <p className="micro-label">Skipped checks</p>
                  {((brief as { skipped: { check: string; reason: string }[] }).skipped).map((s, i) => (
                    <p key={i} className="secondary-text">{familyLabel(s.check)}: skipped. {s.reason}</p>
                  ))}
                </div>
              )}
              {Array.isArray((brief as { openQuestions?: unknown }).openQuestions) && ((brief as { openQuestions: string[] }).openQuestions.length > 0) && (
                <p className="secondary-text">Open questions: {((brief as { openQuestions: string[] }).openQuestions).join("; ")}</p>
              )}
              {Array.isArray((brief as { changeTriggers?: unknown }).changeTriggers) && (
                <p className="secondary-text">What would change this read: {((brief as { changeTriggers: string[] }).changeTriggers).join("; ")}</p>
              )}
              <p className="secondary-text">Freshness: {String((brief as { freshness?: unknown }).freshness ?? "")}</p>
              <p className="body-text">Research finished. The trading decision is yours.</p>
            </section>
          )}

          {phase === "error" && error && (
            <section aria-label="Error" role="alert">
              <h2 className="section-title">Research could not continue</h2>
              <p className="body-text">{error}</p>
              <p className="secondary-text">Your dilemma is preserved above. You can edit it and check again.</p>
            </section>
          )}
        </main>
        <footer className="product-foot">
          <p className="secondary-text">{COPY.privacyNote}</p>
        </footer>
      </div>
    </div>
  );
}
