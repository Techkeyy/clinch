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

function actionLabel(action: unknown): string {
  const labels: Record<string, string> = {
    "enter-now": "enter now", "exit-now": "exit now", wait: "wait",
    "delay-wait": "wait", "stand-aside": "stand aside", unclear: "decide what to do",
  };
  return labels[String(action ?? "")] ?? "make a decision";
}

function readLabel(read: unknown): string {
  const labels: Record<string, string> = {
    "leaning-in": COPY.readLeaningIn, "enter-now": COPY.readLeaningIn,
    "holding-off": COPY.readHoldingOff, wait: COPY.readHoldingOff,
    "standing-aside": COPY.readStandingAside, "stand-aside": COPY.readStandingAside,
    "cannot-resolve": COPY.readCannotResolve, undecided: "Still evaluating",
  };
  return labels[String(read ?? "")] ?? String(read ?? "Still evaluating");
}

function numberText(value: unknown, digits = 2): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function percentText(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return (value >= 0 ? "+" : "") + (value * 100).toFixed(2) + "%";
}

function ContextMetric({ label, value, note }: { label: string; value: string | null; note?: string }) {
  return (
    <div className="context-metric">
      <span className="context-metric-label">{label}</span>
      <strong className={value ? "context-metric-value" : "context-metric-value is-muted"}>{value ?? "Unavailable"}</strong>
      {note && <span className="context-metric-note">{note}</span>}
    </div>
  );
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

  const facts = (baseline?.facts ?? {}) as { spot?: Record<string, unknown>; perp?: Record<string, unknown> };
  const spot = facts.spot ?? {};
  const perp = facts.perp ?? {};
  const spotSymbol = String(baseline?.spotSymbol ?? (intent as { resolvedSymbol?: unknown } | null)?.resolvedSymbol ?? "Live spot");
  const hasJourney = phase !== "idle" || Boolean(intent || baseline || brief || sessionId);
  const activeHinge = hinges.length ? hinges[hinges.length - 1] : null;
  const previousHinges = hinges.slice(0, -1);

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="CLINCH home">CLINCH</a>
        <p className="header-context">Hinge-first market research</p>
        <a className="header-link" href="/recent">Recent decisions</a>
      </header>

      <main className={hasJourney ? "workspace workspace-active" : "workspace workspace-initial"}>
        <section className={hasJourney ? "decision-composer decision-composer-compact" : "decision-composer"} aria-label="Decision input">
          <p className="eyebrow">{hasJourney ? "RESEARCH AGAIN" : "DECISION RESEARCH"}</p>
          <h1 className="hero-question display">{hasJourney ? "What should CLINCH check next?" : COPY.heroQuestion}</h1>
          <p className="hero-support">{hasJourney ? "Describe another trading decision and CLINCH will start a fresh, focused research pass." : COPY.heroSupport}</p>
          <label className="input-label" htmlFor="dilemma">{COPY.inputLabel}</label>
          <textarea id="dilemma" className="input-box" value={dilemma} onChange={(e) => setDilemma(e.target.value)} placeholder={COPY.inputPlaceholder} maxLength={2000} disabled={busy} />
          <div className="input-meta"><span>{dilemma.length > 1700 ? String(dilemma.length) + " / 2000" : "Use your own words. CLINCH will infer the asset and timing."}</span></div>
          <div className="example-row" aria-label="Example dilemmas">
            <span className="example-label">Try an example</span>
            <button type="button" className="example-chip" disabled={busy} onClick={() => setDilemma("rNVDA fell hard after the close. I am thinking of buying the dip. Real opportunity or wait?")}>rNVDA dip</button>
            <button type="button" className="example-chip" disabled={busy} onClick={() => setDilemma("rTSLA spiked fast on a wide spread late in the session. Breakout or thin print?")}>Thin rTSLA move</button>
            <button type="button" className="example-chip" disabled={busy} onClick={() => setDilemma("rAAPL is flat but stock-perp positioning looks crowded. Is entering now worth it or should I wait?")}>Crowded rAAPL</button>
          </div>
          <button type="button" className="cta-primary" disabled={busy || dilemma.trim().length < 4} onClick={start}>{busy ? "Checking this trade..." : COPY.ctaCheck} <span aria-hidden="true">↗</span></button>
          <p className="trust-line">{COPY.trustLine} <span>No signup.</span></p>
        </section>

        {hasJourney && (
          <div className="research-workspace">
            <section className="progress-panel" aria-label="Research progress">
              <div className="progress-heading"><div><p className="eyebrow">THE WORK IN VIEW</p><h2 className="section-title">A focused check, one question at a time</h2></div>{busy && <FreshnessBadge status="live" label="Live" />}</div>
              <ol className="progress-steps">
                <li className={intent ? "is-done" : busy ? "is-active" : ""}><span className="step-marker" aria-hidden="true">{intent ? "✓" : ""}</span><span>Understand your decision</span></li>
                <li className={baseline ? "is-done" : intent && busy ? "is-active" : ""}><span className="step-marker" aria-hidden="true">{baseline ? "✓" : ""}</span><span>Ground in live context</span></li>
                <li className={(findings.length > 0 || brief) ? "is-done" : baseline && busy ? "is-active" : ""}><span className="step-marker" aria-hidden="true">{findings.length > 0 || brief ? "✓" : ""}</span><span>Resolve the decision hinge</span></li>
                <li className={brief ? "is-done" : ""}><span className="step-marker" aria-hidden="true">{brief ? "✓" : ""}</span><span>Stop when more checking will not help</span></li>
              </ol>
            </section>

            {error && phase === "error" && <section className="state-panel state-error" aria-label="Error" role="alert"><p className="eyebrow">NEEDS ATTENTION</p><h2 className="section-title">Research could not continue</h2><p className="body-text">{error}</p><p className="secondary-text">Your decision is preserved above. Retry when the connection or provider is ready.</p><button type="button" className="button-secondary" onClick={start} disabled={busy}>Try again</button></section>}

            {interrupted && <section className="state-panel state-recovery" aria-label="Interrupted research" role="status"><p className="eyebrow">SAVED STATE RESTORED</p><h2 className="section-title">{recoveryStatus === "active" ? "Research is still running" : "Research paused safely"}</h2><p className="body-text">{interrupted}</p><button type="button" className="button-secondary" disabled={busy} onClick={resumeRun}>{COPY.recheck}</button>{resumeNote && <p className="secondary-text">{resumeNote}</p>}</section>}

            {intent && <section className="decision-summary" aria-label="Decision restatement"><div><p className="eyebrow">YOUR DECISION</p><h2 className="decision-asset display">{String((intent as { asset?: unknown }).asset ?? "Unresolved asset")}</h2></div><div className="decision-copy"><p className="decision-line">Considering <strong>{actionLabel((intent as { action?: unknown }).action)}</strong></p><p className="secondary-text">{String((intent as { timeframeContext?: unknown }).timeframeContext ?? "Your stated market context")}</p>{typeof (intent as { decisionQuestion?: unknown }).decisionQuestion === "string" && <p className="secondary-text">{String((intent as { decisionQuestion: unknown }).decisionQuestion)}</p>}</div><button type="button" className="quiet-button" onClick={() => document.getElementById("dilemma")?.focus()} disabled={busy}>Edit decision</button></section>}

            {baseline && <section className="context-section" aria-label="Market context"><div className="section-header-row"><div><p className="eyebrow">LIVE CONTEXT</p><h2 className="section-title">What CLINCH is seeing now</h2></div><FreshnessBadge status="live" label="Live baseline" /></div>{Object.keys(spot).length || Object.keys(perp).length ? <div className="context-grid"><ContextMetric label="Last price" value={numberText(spot.last)} note={spotSymbol} /><ContextMetric label="24h move" value={percentText(spot.movePct24h)} /><ContextMetric label="Spread" value={numberText(spot.spreadBps, 1)} note={spot.spreadWide === true ? "wide" : spot.spreadWide === false ? "tight" : undefined} /><ContextMetric label="Funding" value={percentText(perp.fundingRate)} note={Object.keys(perp).length ? "stock-perp" : undefined} /></div> : <div className="empty-inline"><span className="marker marker-muted" aria-hidden="true">?</span><p className="body-text">Live context is unavailable right now. CLINCH will not fill the gap with a guess.</p></div>}<p className="provenance-line">Bitget market data, read by the server. Missing fields stay unavailable.</p></section>}

            {read && <CurrentRead read={readLabel(read)} note="Current research read, not a prediction. You decide." />}
            {activeHinge && <HingeCard n={hinges.length} question={activeHinge.question} why={activeHinge.why} changes={activeHinge.changes} active={!brief} />}

            {statusLine && <section className="live-status" aria-label="Research progress" aria-live="polite"><span className="status-pulse" aria-hidden="true" /><div><p className="eyebrow">NOW</p><p className="status-copy">{statusLine}</p></div></section>}

            {findings.length > 0 && <section className="findings-section" aria-label="Evidence findings"><div className="section-header-row"><div><p className="eyebrow">EVIDENCE</p><h2 className="section-title">What the checks found</h2></div><span className="count-label">{findings.length} {findings.length === 1 ? "check" : "checks"}</span></div><div className="finding-list">{findings.map((finding, index) => <article className="finding" key={finding.hinge + "-" + index}><div className="finding-marker" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div><div className="finding-body"><p className="finding-family">{familyLabel(finding.family)}</p><p className="finding-summary">{finding.summary}</p><p className="finding-provenance">{finding.source}{shortUtc(finding.observedAt) ? ", observed " + shortUtc(finding.observedAt) : ""}.</p>{Object.keys(finding.facts).length > 0 && <details className="trade-details"><summary>Trade details</summary><dl className="fact-list">{Object.entries(finding.facts).slice(0, 8).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd></div>)}</dl></details>}</div></article>)}</div></section>}

            {skips.length > 0 && <section className="skip-section" aria-label="Skipped research"><p className="eyebrow">DELIBERATE SKIP</p>{skips.map((skip, index) => <SkipRecord key={skip.check + "-" + index} check={skip.check} reason={skip.reason} />)}</section>}

            {stopReason && <section className="stop-panel" aria-label="Stop state" aria-live="polite"><p className="eyebrow">STOPPED WITH INTENT</p><h2 className="display stop-title">CLINCH is stopping here.</h2><p className="body-text">{stopReason.replace(/^CLINCH is stopping here.s*/i, "") || "The checks still available are unlikely to change this read."}</p></section>}

            {phase === "clarify" && clarifyQ && <section className="clarify-panel" aria-label="Clarification" aria-live="polite"><p className="eyebrow">ONE DETAIL NEEDED</p><h2 className="hinge-question display">{clarifyQ}</h2><p className="secondary-text">Choose the closest decision. CLINCH will use it to select the right evidence.</p><div className="choice-grid"><button type="button" className="choice-button" disabled={busy} onClick={() => answerClarify("I am considering entering now.")}>Enter now</button><button type="button" className="choice-button" disabled={busy} onClick={() => answerClarify("I am considering exiting.")}>Exit</button><button type="button" className="choice-button" disabled={busy} onClick={() => answerClarify("I am considering waiting.")}>Wait for a better moment</button><button type="button" className="choice-button" disabled={busy} onClick={() => answerClarify("I am not deciding yet.")}>I am not deciding yet</button></div></section>}

            {(previousHinges.length > 0 || historyList.length > 0) && <details className="audit-trail"><summary>How CLINCH got here</summary><div className="trail-list">{[...previousHinges, ...historyList.map((h) => ({ hinge: h.hinge, question: h.hinge }))].map((h, index) => <div className="trail-item" key={h.hinge + "-" + index}><span className="trail-marker" aria-hidden="true">✓</span><div><strong>Decision Hinge {index + 1}</strong><p>{h.question}</p></div></div>)}</div></details>}

            {brief && <section className="brief-panel" aria-label="Final brief"><div className="brief-heading"><div><p className="eyebrow">RESEARCH BRIEF</p><h2 className="display brief-title">Decision brief</h2></div><span className="brief-complete"><span aria-hidden="true">✓</span> Saved</span></div><div className="brief-read"><p className="eyebrow">CURRENT RESEARCH READ</p><p className="brief-read-value display">{String((brief as { read?: unknown }).read ?? readLabel(read))}</p><p className="brief-decision">{String((brief as { decision?: unknown }).decision ?? "")}</p></div><div className="brief-section"><h3>Why this is the read</h3><p className="body-text">{String((brief as { why?: unknown }).why ?? "No completed evidence was available.")}</p></div>{Array.isArray((brief as { findings?: unknown }).findings) && ((brief as { findings: unknown[] }).findings.length > 0) && <div className="brief-section"><h3>What mattered</h3><ul className="brief-list">{((brief as { findings: unknown[] }).findings).map((item, index) => <li key={index}>{String(item)}</li>)}</ul></div>}{Array.isArray((brief as { completed?: unknown }).completed) && ((brief as { completed: unknown[] }).completed.length > 0) && <div className="brief-section"><h3>Checks completed</h3><div className="completed-list">{((brief as { completed: unknown[] }).completed).map((item, index) => <span key={index}>{String(item)}</span>)}</div></div>}{Array.isArray((brief as { skipped?: unknown }).skipped) && ((brief as { skipped: { check?: unknown; reason?: unknown }[] }).skipped.length > 0) && <div className="brief-section"><h3>Checks skipped</h3><ul className="brief-list">{((brief as { skipped: { check?: unknown; reason?: unknown }[] }).skipped).map((item, index) => <li key={index}><strong>{familyLabel(String(item.check ?? ""))}.</strong> {String(item.reason ?? "")}</li>)}</ul></div>}{Array.isArray((brief as { openQuestions?: unknown }).openQuestions) && ((brief as { openQuestions: unknown[] }).openQuestions.length > 0) && <div className="brief-section"><h3>Still open</h3><ul className="brief-list">{((brief as { openQuestions: unknown[] }).openQuestions).map((item, index) => <li key={index}>{String(item)}</li>)}</ul></div>}{Array.isArray((brief as { changeTriggers?: unknown }).changeTriggers) && <div className="brief-section"><h3>What would change this read</h3><ul className="brief-list">{((brief as { changeTriggers: unknown[] }).changeTriggers).map((item, index) => <li key={index}>{String(item)}</li>)}</ul></div>}<details className="trade-details brief-details"><summary>Sources and freshness</summary><p className="secondary-text">{String((brief as { freshness?: unknown }).freshness ?? "")}</p>{Array.isArray((brief as { sources?: unknown }).sources) && <ul className="source-list">{((brief as { sources: unknown[] }).sources).map((item, index) => <li key={index}>{String(item)}</li>)}</ul>}</details><div className="human-final"><p className="eyebrow">HUMAN DECISION</p><p className="body-text">{COPY.finalNotice}</p></div><div className="brief-actions"><a className="cta-primary" href="/">Start another decision <span aria-hidden="true">↗</span></a><a className="button-secondary" href="/recent">Open recent decisions</a></div><p className="delete-row"><button type="button" className="quiet-danger" disabled={busy} onClick={() => { if (sessionId && window.confirm("Delete this research brief and its history?")) { fetch("/api/session/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) }).then((res) => { if (res.ok) { untrackRecent(sessionId); setBrief(null); setPhase("idle"); setSessionId(null); window.history.replaceState(null, "", "/"); } else { setError("Delete did not complete. Your research is still saved; please retry."); setPhase("error"); } }).catch(() => { setError("Delete did not complete. Your research is still saved; please retry."); setPhase("error"); }); } }}>{COPY.deleteResearch}</button></p></section>}
          </div>
        )}
      </main>

      <footer className="product-foot"><p>{COPY.privacyNote}</p><p>Research support only. CLINCH never places trades.</p></footer>
    </div>
  );

}
