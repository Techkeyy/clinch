"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COPY } from "@/lib/copy";
import { trackRecent, untrackRecent } from "@/lib/recent";
import { FreshnessBadge, HingeCard, SkipRecord, CurrentRead } from "@/components/research";
import { STALE_RUN_MS } from "@/config/thresholds";

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
  const [historyList, setHistoryList] = useState<{ hinge: string; verdict: string }[]>([]);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const [brief, setBrief] = useState<Record<string, unknown> | null>(null);
  const [clarifyQ, setClarifyQ] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [interrupted, setInterrupted] = useState<string | null>(null);
  const [recoveryStatus, setRecoveryStatus] = useState<"active" | "interrupted" | null>(null);
  const [resumeNote, setResumeNote] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);

  const applyEvent = useCallback((e: StreamEvent) => {
    const d = e.data;
    if (e.type === "session" && typeof d.session === "object" && d.session) {
      const s = d.session as { id: string; stateVersion: number };
      setSessionId(s.id);
      setStateVersion(s.stateVersion);
      trackRecent(s.id);
      try {
        window.history.replaceState(null, "", `/?s=${encodeURIComponent(s.id)}`);
      } catch { /* non-browser render */ }
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
    setRecoveryStatus(null);
    setInterrupted(null);
    setHinges([]);
    setHistoryList([]);
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

  const resumeRun = useCallback(async () => {
    if (!sessionId || busy) return;
    setBusy(true);
    setResumeNote(null);
    setPhase("streaming");
    try {
      const res = await fetch("/api/research/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, expectedVersion: stateVersion }),
      });
      if (res.status === 409) {
        setResumeNote("Research is still running elsewhere. Showing the latest saved state.");
        setBusy(false);
        return;
      }
      if (!res.ok) {
        setError("Resume is not available for this research right now.");
        setPhase("error");
        setBusy(false);
        return;
      }
      const ctype = res.headers.get("content-type") ?? "";
      if (!ctype.includes("text/event-stream")) {
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
          if (e.type === "done") { setBusy(false); setInterrupted(null); continue; }
          applyEvent(e);
        }
      }
    } catch {
      setError("Could not reach CLINCH. Check your connection and retry.");
      setPhase("error");
      setBusy(false);
    }
  }, [sessionId, stateVersion, busy, applyEvent]);

  // Hydrate from ?s= locator: authoritative GET session reconstructs the workspace.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let id: string | null = null;
      try {
        id = new URLSearchParams(window.location.search).get("s");
      } catch { id = null; }
      if (!id) return;
      try {
        const res = await fetch(`/api/session?id=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const j = await res.json();
        const sess = j.session as { id: string; status: string; read: string; stateVersion: number; state: Record<string, unknown>; brief: Record<string, unknown> | null; updatedAt?: string };
        const steps = (j.steps ?? []) as { kind: string; family: string | null; requestSummary: string | null; resultSummary: unknown; finishedAt: string | null }[];
        if (cancelled) return;
        setSessionId(sess.id);
        setStateVersion(sess.stateVersion);
        trackRecent(sess.id);
        const restored = sess.state as {
          intent?: Record<string, unknown> | null;
          facts?: Record<string, unknown>;
          spotSymbol?: string | null;
          skips?: { check: string; reason: string }[];
          hingeHistory?: { hinge: string; topic?: string | null; verdict: string }[];
          read?: string;
        };
        if (restored.intent && typeof restored.intent === "object") setIntent(restored.intent);
        if (restored.facts && typeof restored.facts === "object") {
          setBaseline({ facts: restored.facts, spotSymbol: restored.spotSymbol ?? null });
        }
        setSkips(Array.isArray(restored.skips) ? restored.skips : []);
        setHistoryList(Array.isArray(restored.hingeHistory) ? restored.hingeHistory : []);
        if (sess.brief) {
          setBrief(sess.brief as Record<string, unknown>);
          const b = sess.brief as { read?: unknown };
          if (typeof b.read === "string") setRead(b.read);
          setPhase("brief");
        } else if (sess.status === "researching") {
          // Interrupted workspace: restore read + saved findings from persisted
          // steps so the page shows the decision state, not an empty notice.
          if (typeof restored.read === "string" && restored.read.length > 0) setRead(restored.read);
          const saved = steps.filter((s) => s.kind === "research").map((s) => {
            let hinge = "";
            try {
              const parsed = JSON.parse(s.requestSummary ?? "{}") as { hinge?: unknown };
              if (typeof parsed.hinge === "string") hinge = parsed.hinge;
            } catch { /* keep blank */ }
            return {
              hinge, family: s.family ?? "", facts: {},
              summary: `Saved ${s.family ?? "market"} finding${hinge ? ` for Hinge ${hinge}` : ""} (restored from this session).`,
              observedAt: s.finishedAt, source: "Saved from this session",
            };
          });
          setFindings(saved);
          const hinges = steps.filter((s) => s.kind === "hinge").length;
          const research = steps.filter((s) => s.kind === "research").length;
          const ageMs = sess.updatedAt ? Date.now() - Date.parse(sess.updatedAt) : Number.POSITIVE_INFINITY;
          const stale = !Number.isFinite(ageMs) || ageMs > STALE_RUN_MS;
          setRecoveryStatus(stale ? "interrupted" : "active");
          setInterrupted(stale
            ? `Research was interrupted after ${hinges} Hinge decision${hinges === 1 ? "" : "s"} and ${research} completed research check${research === 1 ? "" : "s"}. Saved work is intact. Nothing completed beyond what is shown.`
            : "Research is still running elsewhere. Showing the latest saved state. Resume will be rejected until the active run is no longer authoritative.");
        } else if (sess.status === "clarifying") {
          setPhase("clarify");
          setClarifyQ("What are you deciding? Tell me the asset and whether you are considering entering, exiting, or waiting.");
        }
      } catch { /* offline: workspace stays fresh */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="wrap">
      <div className="column">
        <header>
          <p className="micro-label">CLINCH <span style={{ float: "right" }}><a href="/recent">Recent</a></span></p>
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
              <button type="button" className="chip" disabled={busy} onClick={() => setDilemma("rAAPL is flat but stock-perp positioning looks crowded. Is entering now worth it or should I wait?")}>Crowded rAAPL</button>
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

          {interrupted && (
            <section aria-label="Interrupted research" role="status">
              <h2 className="section-title">{recoveryStatus === "active" ? "Research is still running" : "Research was interrupted"}</h2>
              <p className="body-text">{interrupted}</p>
              <button type="button" className="cta-primary" disabled={busy} onClick={resumeRun}>
                Resume research
              </button>
              {resumeNote && <p className="secondary-text">{resumeNote}</p>}
            </section>
          )}

          {historyList.length > 0 && hinges.length === 0 && (
            <section aria-label="Restored research history">
              {historyList.map((h, i) => (
                <p key={i} className="secondary-text">Decision Hinge decided: {h.verdict}</p>
              ))}
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
              {Array.isArray((brief as { findings?: unknown }).findings) && ((brief as { findings: string[] }).findings.length > 0) && (
                <div>
                  <p className="micro-label">Completed findings</p>
                  {((brief as { findings: string[] }).findings).map((f, i) => (
                    <p key={i} className="body-text">{f}</p>
                  ))}
                </div>
              )}
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
              {Array.isArray((brief as { sources?: unknown }).sources) && ((brief as { sources: string[] }).sources.length > 0) && (
                <p className="secondary-text">Sources: {((brief as { sources: string[] }).sources).join("; ")}</p>
              )}
              <p className="body-text">Research finished. The trading decision is yours.</p>
              <p className="secondary-text">
                <button type="button" className="chip" disabled={busy} onClick={() => { if (sessionId && window.confirm("Delete this research brief and its history?")) { fetch("/api/session/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) }).then((res) => { if (res.ok) { untrackRecent(sessionId); setBrief(null); } else { setError("Delete did not complete. Your research is still saved; please retry."); setPhase("error"); } }).catch(() => { setError("Delete did not complete. Your research is still saved; please retry."); setPhase("error"); }); } }}>
                  Delete this research
                </button>
              </p>
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
