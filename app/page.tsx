"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COPY } from "@/lib/copy";
import { trackRecent, untrackRecent } from "@/lib/recent";
import { FreshnessBadge, SkipRecord } from "@/components/research";
import { StockIdentity } from "@/components/stock-identity";
import { StockDiscovery } from "@/components/stock-discovery";
import { displayStockFromMention, stockFromRealityTicker, stockFromTicker, type StockIdentityData } from "@/lib/stocks";
import { STALE_RUN_MS } from "@/config/thresholds";
import { decisionWatchEligibility } from "@/lib/watch-ui";
import { AccountControl, SaveResearchPrompt } from "@/components/account-control";
import { MonitorSetup } from "@/components/monitor-setup";

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

function decisionSummary(intent: Record<string, unknown> | null, asset: string | null): string {
  const symbol = asset && asset !== "Live spot" ? asset : "this stock";
  const action = String(intent?.action ?? "");
  if (action === "wait") return "Considering whether to wait before entering " + symbol + ".";
  if (action === "enter-now") return "Considering a " + symbol + " entry now.";
  if (action === "exit-now") return "Considering whether to exit " + symbol + ".";
  if (action === "stand-aside") return "Considering whether to stay out of " + symbol + ".";
  return "Considering a decision about " + symbol + ".";
}
function safeSource(source: string, family: string): string {
  return /(?:R[A-Z0-9]{2,12}|[A-Z0-9]{2,12})USDT/i.test(source)
    ? `Bitget ${familyLabel(family).toLowerCase()} data`
    : source;
}

function readLabel(read: unknown, terminalStatus?: "stopped" | "unresolved" | null): string {
  const labels: Record<string, string> = {
    "leaning-in": "Slightly favorable", "enter-now": "Slightly favorable", "slightly favorable": "Slightly favorable",
    "holding-off": "Better to wait", wait: "Better to wait", "better to wait": "Better to wait",
    "standing-aside": "No clear advantage", "stand-aside": "No clear advantage", "no clear advantage": "No clear advantage",
    "cannot-resolve": "Not enough evidence yet", undecided: "Not enough evidence yet", "not enough evidence yet": "Not enough evidence yet",
    "leaning in": "Slightly favorable", "holding off": "Better to wait", "standing aside": "No clear advantage", "cannot resolve": "Not enough evidence yet",
  };
  const key = String(read ?? "").trim().toLowerCase();
  return labels[key] ?? (terminalStatus ? "Not enough evidence yet" : "Still evaluating");
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

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function humanResearchFamily(family: string): string {
  if (family === "spot-structure") return "Recent price behavior";
  if (family === "perp-positioning") return "Futures trader positioning";
  return "Supported market evidence";
}

function researchFamilyFromTopic(topic: string | null | undefined): string {
  if (topic === "structure-direction" || topic === "move-reality") return "spot-structure";
  if (topic === "crowd-timing" || topic === "dislocation") return "perp-positioning";
  return "supported-evidence";
}

function plainMarketLanguage(value: string, assetName = "This stock"): string {
  let text = value
    .replace(/R[A-Z0-9]{2,12}USDT/gi, assetName)
    .replace(/Is this drift exhausted(?:\s*\(setup\))? or a new leg down\?/gi, `Has the recent drop on ${assetName} started stabilizing, or could the price keep falling?`)
    .replace(/Is the move stabilizing\?/gi, `Has the recent drop on ${assetName} started stabilizing?`)
    .replace(/selected Hinge/gi, "key question")
    .replace(/\bnearby support\b/gi, "recent low")
    .replace(/\bnew leg down\b/gi, "price could keep falling")
    .replace(/\bsetup\b/gi, "plan")
    .replace(/(?:The )?spread (?:is|was) tight at \d+(?:\.\d+)? basis points?\./gi, "Buying and selling prices are close together, so trading conditions look normal.")
    .replace(/(?:The )?spread (?:is|was) wide at \d+(?:\.\d+)? basis points?\./gi, "Buying and selling prices are farther apart, so timing evidence is less reliable.")
    .replace(/The spread is tight at [^,]+, so the observed move has usable liquidity context\./gi, "Buying and selling prices are close together, so trading conditions look normal.")
    .replace(/The spread is wide at [^,]+, so timing evidence is less reliable\./gi, "Buying and selling prices are farther apart, so timing evidence is less reliable.")
    .replace(/Funding is calm at [^,]+, with no elevated crowding signal in this check\./gi, "Futures trader positioning looks calm.")
    .replace(/Funding is elevated at [^,]+, which points to more crowded positioning\./gi, "Futures trader positioning looks crowded.")
    .replace(/Perp pricing is [^,]+, so the gap needs to persist to matter\./gi, "The futures price is separated from the stock price, so this signal needs to persist to matter.")
    .replace(/Perp pricing is tracking the index closely in this check\./gi, "The stock and futures prices are moving closely together.")
    .replace(/Price was within nearby structure from ([\d,.]+) to ([\d,.]+)\./gi, `${assetName} is trading between recent low and high levels around $1 and $2.`)
    .replace(/Nearby structure (?:is visible between|was marked from) ([\d,.]+) to ([\d,.]+)(?:, while price was ([\d,.]+))?\./gi, `${assetName} is trading between recent low and high levels around $1 and $2.`)
    .replace(/\bnearby structure\b/gi, "recent price range")
    .replace(/\bperp-index gap\b/gi, "gap between the stock and futures prices")
    .replace(/\bspot-perp gap\b/gi, "gap between the stock and futures prices")
    .replace(/\bopen interest\b/gi, "open futures positions")
    .replace(/\b(?:\d+(?:\.\d+)?\s+)?basis points?\b/gi, "a small price gap")
    .replace(/\bmarket structure\b/gi, "recent price behavior")
    .replace(/\bdislocation\b/gi, "price gap")
    .replace(/(?<!futures trader )\bpositioning\b/gi, "trader behavior")
    .replace(/\bperp\b/gi, "futures")
    .replace(/\bdrift\b/gi, "recent move")
    .replace(/normalized market observation/gi, "clear market signal")
    .replace(/supported market observation/gi, "supported market signal")
    .replace(/timing read/gi, "timing decision")
    .replace(/current read/gi, "current conclusion");
  return text;
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function technicalValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "Unavailable";
  if (typeof value === "boolean") return value ? "true" : "false";
  try {
    return JSON.stringify(value) ?? "Unavailable";
  } catch {
    return String(value);
  }
}

function TechnicalEvidence({
  brief,
  findings,
  skips,
  historyList,
  spotSymbol,
  spot,
  perp,
  assetName,
}: {
  brief: Record<string, unknown>;
  findings: Finding[];
  skips: Skip[];
  historyList: { hinge: string; topic?: string | null; question?: string | null; verdict: string }[];
  spotSymbol: string;
  spot: Record<string, unknown>;
  perp: Record<string, unknown>;
  assetName: string;
}) {
  const briefSources = stringList(brief.sources);
  const briefCompleted = stringList(brief.completed);
  const briefSkipped = Array.isArray(brief.skipped)
    ? (brief.skipped as { check?: unknown; reason?: unknown }[]).filter((item) => item && typeof item === "object")
    : [];
  const exactFindings = findings.length
    ? findings
    : historyList.map((item) => ({
      hinge: item.hinge,
      family: researchFamilyFromTopic(item.topic),
      summary: item.question ?? "Saved research question",
      observedAt: null,
      source: "Persisted research record",
      facts: {},
    }));
  return (
    <div className="technical-evidence">
      <p className="technical-evidence-intro">Advanced users can inspect the exact market records CLINCH retained for this answer.</p>
      <dl className="technical-summary-grid">
        <div><dt>Instrument</dt><dd>{spotSymbol}</dd></div>
        <div><dt>Freshness</dt><dd>{String(brief.freshness ?? "Not recorded")}</dd></div>
        <div><dt>Terminal state</dt><dd>{String(brief.terminalStatus ?? "Not recorded")}</dd></div>
        <div><dt>Reason code</dt><dd>{String(brief.terminalReasonCode ?? "Not recorded")}</dd></div>
      </dl>
      {[["BASELINE SPOT CONTEXT", spot], ["BASELINE FUTURES CONTEXT", perp]].map(([label, values]) => {
        const entries = Object.entries(values as Record<string, unknown>);
        if (!entries.length) return null;
        return <section className="technical-record" key={String(label)}><h4>{String(label)}</h4><p className="technical-record-note">Collected for orientation; not used to support the current read by itself.</p><dl className="technical-fact-list">{entries.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{technicalValue(value)}</dd></div>)}</dl></section>;
      })}
      {exactFindings.length > 0 && <section className="technical-record"><h4>COMPLETED RESEARCH</h4><p className="technical-record-note">These records were completed and may support the read.</p><div className="technical-record-list">{exactFindings.map((finding, index) => <article key={finding.hinge + "-technical-" + index}><p><strong>{humanResearchFamily(finding.family)}</strong> <span>{finding.hinge}</span></p><p>{finding.summary}</p><p>{safeSource(finding.source, finding.family)}{shortUtc(finding.observedAt) ? ", observed " + shortUtc(finding.observedAt) : ""}.</p>{Object.keys(finding.facts).length > 0 && <dl className="technical-fact-list">{Object.entries(finding.facts).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{technicalValue(value)}</dd></div>)}</dl>}</article>)}</div></section>}
      {briefCompleted.length > 0 && <section className="technical-record"><h4>Exact completed questions</h4><ul className="technical-list">{briefCompleted.map((item, index) => <li key={"completed-" + index}>{item}</li>)}</ul></section>}
      {(skips.length > 0 || briefSkipped.length > 0) && <section className="technical-record"><h4>SKIPPED RESEARCH</h4><p className="technical-record-note">These checks were not used as directional evidence.</p><ul className="technical-list">{(skips.length ? skips : briefSkipped.map((item) => ({ check: String(item.check ?? ""), reason: String(item.reason ?? "") }))).map((item, index) => <li key={"skipped-" + index}><strong>{item.check}</strong>: {item.reason}</li>)}</ul></section>}
      {briefSources.length > 0 && <section className="technical-record"><h4>Source provenance</h4><ul className="technical-list">{briefSources.map((item, index) => <li key={"source-" + index}>{item}</li>)}</ul></section>}
    </div>
  );
}

function DecisionAnswer({
  brief,
  dilemma,
  activeHinge,
  findings,
  skips,
  historyList,
  stopReason,
  terminalStatus,
  spotSymbol,
  spot,
  perp,
  assetName,
}: {
  brief: Record<string, unknown>;
  dilemma: string;
  activeHinge: { hinge: string; question: string; why: string; changes: string; family: string } | null;
  findings: Finding[];
  skips: Skip[];
  historyList: { hinge: string; topic?: string | null; question?: string | null; verdict: string }[];
  stopReason: string | null;
  terminalStatus: "stopped" | "unresolved" | null;
  spotSymbol: string;
  spot: Record<string, unknown>;
  perp: Record<string, unknown>;
  assetName: string;
}) {
  const implication = (brief.decisionImplication && typeof brief.decisionImplication === "object")
    ? brief.decisionImplication as Record<string, unknown>
    : {};
  const unresolved = brief.terminalStatus === "unresolved" || terminalStatus === "unresolved";
  const question = dilemma.trim() || String(brief.decision ?? "Your decision");
  const read = readLabel(brief.read ?? "Cannot resolve", terminalStatus);
  const summary = plainMarketLanguage(String(implication.summary ?? brief.why ?? "The available evidence has been translated into a plain-English conclusion."), assetName);
  const whyItems = uniqueStrings([
    ...stringList(implication.supportiveEvidence),
    ...stringList(implication.cautionEvidence),
  ].map((item) => plainMarketLanguage(item, assetName))).slice(0, 3);
  const contextItems = uniqueStrings(stringList(implication.contextEvidence).map((item) => plainMarketLanguage(item, assetName))).slice(0, 2);
  const watchItems = uniqueStrings([
    ...stringList(brief.changeTriggers),
    ...stringList(implication.changeTriggers),
  ].map((item) => plainMarketLanguage(item, assetName))).slice(0, 3);
  const fallbackWhy = whyItems.length ? whyItems : ["The completed evidence did not establish a clear directional advantage."];
  const fallbackWatch = watchItems.length ? watchItems : ["A supported market signal that materially changes this conclusion would be worth checking."];
  const pathQuestion = activeHinge?.question
    ?? historyList[historyList.length - 1]?.question
    ?? stringList(brief.openQuestions)[0]
    ?? "What evidence is most likely to change this decision?";
  const readablePathQuestion = plainMarketLanguage(pathQuestion, assetName);
  const checked = findings.length
    ? findings.map((finding) => ({ label: humanResearchFamily(finding.family), reason: "Most useful for answering the key question." }))
    : historyList.map((item) => ({ label: humanResearchFamily(researchFamilyFromTopic(item.topic)), reason: "Selected as the most relevant supported check." }));
  const skipped = skips.length
    ? skips
    : (Array.isArray(brief.skipped) ? (brief.skipped as { check?: unknown; reason?: unknown }[]).map((item) => ({ check: String(item.check ?? ""), reason: String(item.reason ?? "") })) : []);
  const findingSource = stringList(brief.findings).length ? stringList(brief.findings) : findings.map((finding) => finding.summary);
  const found = uniqueStrings(findingSource.flatMap((item) => plainMarketLanguage(item, assetName).replace(/([.!?])\s+/g, "$1|").split("|")));
  const qualifyingSkip = skipped.find((item) => /did not require|not expected|unlikely|cannot matter|mooted|settled/i.test(item.reason));
  const checkedLabel = checked[0]?.label ?? "Completed research";
  const pathResearchCompleted = findings.length > 0 || historyList.length > 0 || stringList(brief.completed).length > 0;
  const researchedUnresolved = unresolved && (String(brief.terminalReasonCode ?? "") === "INCONCLUSIVE_EVIDENCE" || pathResearchCompleted);
  const inconclusiveStopSentence = "CLINCH checked " + checkedLabel.toLowerCase() + ", but it did not provide enough directional evidence for a clear read. " +
    (qualifyingSkip
      ? plainMarketLanguage(qualifyingSkip.reason, assetName).replace(/[.]+$/, "") + ". CLINCH stopped."
      : "The remaining supported checks were not expected to resolve the key question, so CLINCH stopped.");
  const stopSentence = researchedUnresolved ? inconclusiveStopSentence : unresolved
    ? qualifyingSkip
      ? `CLINCH stopped because the available supported evidence did not answer the key question. ${humanResearchFamily(qualifyingSkip.check)} was not used as directional evidence in this path.`
      : "CLINCH stopped because the available supported evidence did not answer the key question."
    : qualifyingSkip
      ? `${checkedLabel} gave CLINCH enough evidence for this read. ${humanResearchFamily(qualifyingSkip.check)} was not expected to materially change it, so CLINCH stopped.`
      : "CLINCH stopped because the key question was answered well enough and more supported research was unlikely to change the conclusion.";
  const pathFindings = found.length ? found : ["The available evidence was recorded for the conclusion above."];
  return (
    <section className="answer-surface" aria-label="CLINCH answer">
      <div className="answer-heading"><div><p className="eyebrow">YOUR QUESTION</p><h2 className="answer-question">{question}</h2></div><span className="brief-complete"><span aria-hidden="true">✓</span> Saved</span></div>
      <div className="answer-read"><p className="eyebrow">CLINCH READ</p><p className="answer-read-value display">{read}</p><p className="answer-summary">{summary}</p></div>
      <div className="answer-grid">
        <section className="answer-list-block"><h3>WHY</h3><ul>{fallbackWhy.map((item, index) => <li key={"why-" + index}>{item}</li>)}</ul></section>
        <section className="answer-list-block"><h3>WHAT TO WATCH</h3><ul>{fallbackWatch.map((item, index) => <li key={"watch-" + index}>{item}</li>)}</ul></section>
      </div>
      {contextItems.length > 0 && <section className="answer-context" aria-label="Market context"><p className="answer-context-label">MARKET CONTEXT</p><ul>{contextItems.map((item, index) => <li key={"context-" + index}>{item}</li>)}</ul></section>}
      <section className="answer-stop"><h3>WHY CLINCH STOPPED</h3><p>{stopSentence}</p></section>
      <details className="research-path">
        <summary><span>See how CLINCH reached this</span><span className="disclosure-arrow" aria-hidden="true">↓</span></summary>
        <div className="research-path-body">
          <div className="path-flow">
            <div className="path-step"><p className="path-step-label">YOUR DECISION</p><p>{question}</p></div>
            <div className="path-connector" aria-hidden="true">↓</div>
            <div className="path-step"><p className="path-step-label">THE KEY QUESTION</p><p>{readablePathQuestion}</p></div>
            <div className="path-connector" aria-hidden="true">↓</div>
            <section className="path-step path-check-step"><p className="path-step-label">WHAT CLINCH COULD CHECK</p>{checked.map((item, index) => <div className="path-check-row" key={"checked-" + index}><span className="path-check-icon" aria-hidden="true">✓</span><div><p><strong>{item.label}</strong> <span className="state-tag state-checked">CHECKED</span></p><span>{item.reason}</span></div></div>)}{skipped.map((item, index) => <div className="path-check-row is-skipped" key={"path-skipped-" + index}><span className="path-check-icon" aria-hidden="true">○</span><div><p><strong>{humanResearchFamily(item.check)}</strong> <span className="state-tag state-skipped">SKIPPED</span></p><span>{plainMarketLanguage(item.reason) || "Unlikely to change the current conclusion."}</span></div></div>)}</section>
            <div className="path-connector" aria-hidden="true">↓</div>
            <section className="path-step"><p className="path-step-label">WHAT CLINCH FOUND</p><ul className="path-finding-list">{pathFindings.map((item, index) => <li key={"found-" + index}>{item}</li>)}</ul></section>
            <div className="path-connector" aria-hidden="true">↓</div>
            <section className="path-step path-stop-step"><p className="path-step-label">STOP</p><p>{stopSentence}</p></section>
          </div>
          <details className="technical-disclosure">
            <summary><span>View technical evidence &amp; sources</span><span className="disclosure-arrow" aria-hidden="true">↓</span></summary>
            <TechnicalEvidence brief={brief} findings={findings} skips={skips} historyList={historyList} spotSymbol={spotSymbol} spot={spot} perp={perp} assetName={assetName} />
          </details>
        </div>
      </details>
    </section>
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

type Surface = "dashboard" | "app";

function SiteHeader({ surface, onNavigate }: { surface: Surface; onNavigate: (surface: Surface, anchor?: string) => void }) {
  return (
    <header className="site-header reference-header">
      <button type="button" className="wordmark wordmark-button" onClick={() => onNavigate("dashboard", "dashboard")} aria-label="CLINCH dashboard">
        CLINCH <span>Research desk</span>
      </button>
      <nav className="mode-nav" aria-label="Primary">
        <button type="button" className={surface === "dashboard" ? "mode-link is-active" : "mode-link"} onClick={() => onNavigate("dashboard", "dashboard")} aria-current={surface === "dashboard" ? "page" : undefined}>Dashboard</button>
        <button type="button" className={surface === "app" ? "mode-link is-active" : "mode-link"} onClick={() => onNavigate("app", "app")} aria-current={surface === "app" ? "page" : undefined}>App</button>
      </nav>
      <nav className="secondary-nav" aria-label="Learn more">
        <button type="button" className="text-nav-link" onClick={() => onNavigate("dashboard", "how-it-works")}>How it Works</button>
        <button type="button" className="text-nav-link" onClick={() => onNavigate("dashboard", "research-method")}>Research Method</button>
        <a className="text-nav-link" href="/recent">Recent research</a>
      </nav>
      <AccountControl />
      <button type="button" className="header-cta" onClick={() => onNavigate("app", "app")}>Open App <span aria-hidden="true">↗</span></button>
    </header>
  );
}

function ProductFooter() {
  return (
    <footer className="product-foot reference-footer">
      <p>Private by design. Your research stays with the browser or CLINCH account that owns it.</p>
      <p>CLINCH researches the decision. It never places the trade.</p>
    </footer>
  );
}

function DashboardView({ onOpenApp, onJump }: { onOpenApp: () => void; onJump: (anchor: string) => void }) {
  const values = [
    { number: "01", title: "Find the Decision Hinge", copy: "CLINCH identifies the unresolved question most likely to change the decision." },
    { number: "02", title: "Research only what matters", copy: "It selectively checks relevant live market evidence instead of gathering everything available." },
    { number: "03", title: "Know when to stop", copy: "When more research is unlikely to alter the decision, CLINCH stops and explains why." },
  ];
  const steps = [
    { number: "01", title: "Describe the decision", copy: "Tell CLINCH what tokenized U.S. stock trade you are considering." },
    { number: "02", title: "Find the Hinge", copy: "CLINCH determines the unanswered question most capable of changing that decision." },
    { number: "03", title: "Research selectively", copy: "It uses live Bitget evidence from the relevant supported research path." },
    { number: "04", title: "Stop with a brief", copy: "CLINCH stops when further research is unlikely to matter and gives you a concise decision brief." },
  ];
  return (
    <main id="dashboard" className="dashboard-page">
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <div className="dashboard-hero-copy">
          <p className="eyebrow hero-eyebrow">SELECTIVE AI TRADING DESK</p>
          <h1 id="dashboard-title" className="display dashboard-title">Before you act on the trade, find what matters.</h1>
          <p className="dashboard-lede">CLINCH finds the unanswered question most capable of changing your decision, researches it with live Bitget data, and stops when more research is unlikely to matter.</p>
          <div className="hero-actions">
            <button type="button" className="cta-primary" onClick={onOpenApp}>Open CLINCH <span aria-hidden="true">↗</span></button>
            <button type="button" className="button-secondary hero-secondary" onClick={() => onJump("how-it-works")}>See How It Works</button>
          </div>
          <p className="hero-note"><span className="status-mark" aria-hidden="true" /> Real market evidence. Human decision.</p>
        </div>
        <div className="hero-proof" aria-label="CLINCH research sequence">
          <div className="hero-proof-top"><span className="eyebrow">THE RESEARCH DESK</span><span className="proof-live">LIVE EVIDENCE</span></div>
          <div className="hero-proof-line"><span>Decision</span><strong>01</strong></div>
          <div className="hero-proof-line"><span>Decision Hinge</span><strong>02</strong></div>
          <div className="hero-proof-line"><span>Targeted research</span><strong>03</strong></div>
          <div className="hero-proof-line is-final"><span>Human decision</span><strong>04</strong></div>
          <p className="hero-proof-caption">A focused path from uncertainty to a more honest next step.</p>
        </div>
      </section>

      <section className="dashboard-section value-section" aria-labelledby="value-title">
        <div className="section-kicker-row"><p className="eyebrow">THE CLINCH DIFFERENCE</p><span className="section-rule" /></div>
        <h2 id="value-title" className="dashboard-section-title">A trading decision is clearer when the research has a reason.</h2>
        <div className="value-grid">
          {values.map((value) => <article className="value-card" key={value.number}><span className="value-number">{value.number}</span><h3>{value.title}</h3><p>{value.copy}</p></article>)}
        </div>
      </section>

      <section id="how-it-works" className="dashboard-section method-steps" aria-labelledby="steps-title">
        <div className="section-kicker-row"><p className="eyebrow">HOW IT WORKS</p><span className="section-rule" /></div>
        <div className="section-intro-split"><h2 id="steps-title" className="dashboard-section-title">From a live dilemma to a deliberate stop.</h2><p>CLINCH keeps the path visible. You always know what it is checking, why that check matters, and what remains yours to decide.</p></div>
        <div className="steps-list">
          {steps.map((step) => <article className="step-row" key={step.number}><span className="step-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.copy}</p></div><span className="step-arrow" aria-hidden="true">↗</span></article>)}
        </div>
      </section>

      <section id="research-method" className="dashboard-section trust-section" aria-labelledby="trust-title">
        <div className="trust-copy"><p className="eyebrow">LIVE EVIDENCE. HUMAN DECISION.</p><h2 id="trust-title" className="dashboard-section-title">Built to research, not trade for you.</h2><p>CLINCH reads real Bitget market data. Qwen helps understand the language of your dilemma. Deterministic CLINCH logic controls research selection, the Decision Hinge, SKIP, and STOP.</p><p className="trust-strong">The trade is never executed. The human keeps the final call.</p></div>
        <div className="method-flow" aria-label="CLINCH research method"><div><span>01</span><strong>Decision</strong></div><i aria-hidden="true">↓</i><div><span>02</span><strong>Hinge</strong></div><i aria-hidden="true">↓</i><div><span>03</span><strong>Targeted research</strong></div><i aria-hidden="true">↓</i><div><span>04</span><strong>Stop</strong></div><i aria-hidden="true">↓</i><div className="flow-final"><span>05</span><strong>Human decision</strong></div></div>
      </section>

      <section className="dashboard-cta" aria-labelledby="dashboard-cta-title"><p className="eyebrow">START WITH THE QUESTION</p><h2 id="dashboard-cta-title" className="display">Ready to research the trade that actually matters?</h2><p>Bring the decision in your own words. CLINCH will find the next useful question.</p><button type="button" className="cta-primary" onClick={onOpenApp}>Open CLINCH App <span aria-hidden="true">↗</span></button></section>
    </main>
  );
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
  const [historyList, setHistoryList] = useState<{ hinge: string; topic?: string | null; question?: string | null; verdict: string }[]>([]);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<"stopped" | "unresolved" | null>(null);
  const [brief, setBrief] = useState<Record<string, unknown> | null>(null);
  const [clarifyQ, setClarifyQ] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [interrupted, setInterrupted] = useState<string | null>(null);
  const [recoveryStatus, setRecoveryStatus] = useState<"active" | "interrupted" | null>(null);
  const [resumeNote, setResumeNote] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [surface, setSurface] = useState<Surface>("dashboard");
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [stocks, setStocks] = useState<StockIdentityData[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [stocksError, setStocksError] = useState(false);
  const [stockRequestStarted, setStockRequestStarted] = useState(false);
  const keyRef = useRef<string | null>(null);

  const navigateSurface = useCallback((next: Surface, anchor: string = next) => {
    setSurface(next);
    try {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${anchor}`);
    } catch { /* non-browser render */ }
  }, []);

  useEffect(() => {
    const readSurface = () => {
      const hash = window.location.hash.replace(/^#/, "");
      setSurface(hash === "app" || new URLSearchParams(window.location.search).has("s") ? "app" : "dashboard");
    };
    readSurface();
    window.addEventListener("hashchange", readSurface);
    return () => window.removeEventListener("hashchange", readSurface);
  }, []);

  useEffect(() => {
    if (surface !== "app" || stockRequestStarted) return;
    setStockRequestStarted(true);
    setStocksLoading(true);
    fetch("/api/stocks")
      .then(async (res) => {
        if (!res.ok) throw new Error("stock discovery unavailable");
        const body = await res.json() as { stocks?: unknown };
        const nextStocks = Array.isArray(body.stocks) ? body.stocks as StockIdentityData[] : [];
        setStocks(nextStocks);
      })
      .catch(() => setStocksError(true))
      .finally(() => setStocksLoading(false));
  }, [stockRequestStarted, surface]);

  const applyEvent = useCallback((e: StreamEvent) => {
    const d = e.data;
    if (typeof d.stateVersion === "number" && Number.isInteger(d.stateVersion)) setStateVersion(d.stateVersion);
    if (e.type === "session" && typeof d.session === "object" && d.session) {
      const s = d.session as { id: string; stateVersion: number };
      setSessionId(s.id);
      setStateVersion(s.stateVersion);
      setSurface("app");
      trackRecent(s.id);
      try {
        window.history.replaceState(null, "", `/?s=${encodeURIComponent(s.id)}#app`);
      } catch { /* non-browser render */ }
    } else if (e.type === "progress" && typeof d.label === "string") {
      setStatusLine(d.label);
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
      setStatusLine(`Checking ${familyLabel(String(d.family ?? "market evidence"))}.`);
    } else if (e.type === "skip" && typeof d.check === "string") {
      const check = String(d.check);
      const reason = String((d as { reason?: unknown }).reason ?? "");
      setSkips((s) => (s.some((x) => x.check === check) ? s : [...s, { check, reason }]));
    } else if (e.type === "finding") {
      setFindings((f) => [...f, { hinge: String(d.hinge ?? ""), family: String(d.family ?? ""), summary: String((d as { summary?: unknown }).summary ?? ""), observedAt: ((d as { observedAt?: unknown }).observedAt as string) ?? null, source: String((d as { source?: unknown }).source ?? ""), facts: (d.facts ?? {}) as Record<string, unknown> }]);
      setStatusLine(null);
    } else if (e.type === "stop") {
      setStopReason(String((d as { reason?: unknown }).reason ?? "Stopped."));
      const terminal = (d as { terminal?: unknown }).terminal;
      if (terminal === "stopped" || terminal === "unresolved") setTerminalStatus(terminal);
      if ((d as { cannotResolve?: boolean }).cannotResolve) setRead("Not enough evidence yet");
      setStatusLine(null);
    } else if (e.type === "brief") {
      setBrief((d.brief ?? null) as Record<string, unknown> | null);
      const b = d.brief as { read?: unknown; terminalStatus?: unknown; skipped?: unknown } | null;
      if (Array.isArray(b?.skipped)) {
        setSkips(b.skipped.filter((item): item is Skip => Boolean(item && typeof item === "object" && typeof (item as { check?: unknown }).check === "string"))
          .map((item) => ({ check: item.check, reason: typeof item.reason === "string" ? item.reason : "" })));
      }
      if (typeof b?.read === "string") setRead(b.read);
      const status = (d as { status?: unknown }).status ?? b?.terminalStatus;
      if (status === "stopped" || status === "unresolved") setTerminalStatus(status);
      setPhase("brief");
      setBusy(false);
      setStatusLine(null);
    } else if (e.type === "clarify") {
      setClarifyQ(String((d as { question?: unknown }).question ?? "What are you deciding?"));
      setPhase("clarify");
      setBusy(false);
    } else if (e.type === "error") {
      setError(String((d as { message?: unknown }).message ?? (d as { code?: unknown }).code ?? "Research failed."));
      setPhase("error");
      setBusy(false);
      setStatusLine(null);
    }
  }, []);

  const runStream = useCallback(async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const ctype = res.headers.get("content-type") ?? "";
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: unknown; session?: { stateVersion?: unknown } };
      if (typeof j.session?.stateVersion === "number") setStateVersion(j.session.stateVersion);
      const message = j.error === "VERSION_CONFLICT"
        ? "This research changed in another tab. The latest saved state is now authoritative."
        : typeof j.error === "string" ? j.error : `Request failed (${res.status}).`;
      setError(message);
      setPhase("error");
      setBusy(false);
      return;
    }
    if (!ctype.includes("text/event-stream")) {
      const j = await res.json().catch(() => ({})) as { error?: unknown; clarify?: unknown; session?: { stateVersion?: unknown } };
      if (typeof j.session?.stateVersion === "number") setStateVersion(j.session.stateVersion);
      if (typeof j.clarify === "string") {
        setClarifyQ(j.clarify);
        setPhase("clarify");
        setBusy(false);
        return;
      }
      setError(typeof j.error === "string" ? j.error : `Request failed (${res.status}).`);
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
    setDeletePending(false);
    setRecoveryStatus(null);
    setInterrupted(null);
    setHinges([]);
    setHistoryList([]);
    setFindings([]);
    setSkips([]);
    setRead(null);
    setStopReason(null);
    setTerminalStatus(null);
    setBrief(null);
    setIntent(null);
    setBaseline(null);
    setSessionId(null);
    setStateVersion(0);
    setSurface("app");
    try { window.history.replaceState(null, "", "/#app"); } catch { /* non-browser render */ }
    const idempotencyKey = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    keyRef.current = idempotencyKey;
    try {
      const selectedContext = selectedMarket ? stocks.find((stock) => stock.ticker === selectedMarket) : null;
      const submittedDilemma = selectedContext
        ? `${selectedContext.companyName} (${selectedContext.ticker}) context: ${dilemma.trim()}`
        : dilemma.trim();
      await runStream("/api/research/start", {
        dilemma: submittedDilemma,
        selectedTicker: selectedContext?.ticker,
        selectedRealityTicker: selectedContext?.realityTicker,
        idempotencyKey,
      });
    } catch {
      setError("Could not reach CLINCH. Check your connection and retry.");
      setPhase("error");
      setBusy(false);
    }
  }, [busy, dilemma, runStream, selectedMarket, stocks]);

  const resetWorkspace = useCallback(() => {
    setPhase("idle");
    setDilemma("");
    setBusy(false);
    setSessionId(null);
    setStateVersion(0);
    setIntent(null);
    setBaseline(null);
    setHinges([]);
    setFindings([]);
    setSkips([]);
    setRead(null);
    setHistoryList([]);
    setStopReason(null);
    setTerminalStatus(null);
    setBrief(null);
    setClarifyQ(null);
    setError(null);
    setStatusLine(null);
    setInterrupted(null);
    setRecoveryStatus(null);
    setResumeNote(null);
    setDeletePending(false);
    setSelectedMarket(null);
    keyRef.current = null;
  }, []);

  const deleteResearch = useCallback(async () => {
    if (!sessionId || busy || deleting) return;
    const deletingId = sessionId;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/session/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: deletingId }),
      });
      if (!res.ok) {
        setError("Delete did not complete. Your research is still saved; please retry.");
        setPhase("error");
        return;
      }
      untrackRecent(deletingId);
      resetWorkspace();
      window.history.replaceState(null, "", "/");
    } catch {
      setError("Delete did not complete. Your research is still saved; please retry.");
      setPhase("error");
    } finally {
      setDeleting(false);
    }
  }, [busy, deleting, resetWorkspace, sessionId]);

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
        const steps = (j.steps ?? []) as { kind: string; family: string | null; requestSummary: string | null; resultSummary: unknown; provenance?: unknown; finishedAt: string | null }[];
        if (cancelled) return;
        setSessionId(sess.id);
        setStateVersion(sess.stateVersion);
        trackRecent(sess.id);
        const restored = sess.state as {
          intent?: Record<string, unknown> | null;
          facts?: Record<string, unknown>;
          spotSymbol?: string | null;
          skips?: { check: string; reason: string }[];
          hingeHistory?: { hinge: string; topic?: string | null; question?: string | null; verdict: string }[];
          read?: string;
          terminal?: "stopped" | "unresolved" | null;
          terminalReasonCode?: string | null;
        };
        if (restored.intent && typeof restored.intent === "object") {
          setIntent(restored.intent);
          if (typeof restored.intent.decisionQuestion === "string") setDilemma(restored.intent.decisionQuestion);
        }
        if (restored.facts && typeof restored.facts === "object") {
          setBaseline({ facts: restored.facts, spotSymbol: restored.spotSymbol ?? null });
        }
       setSkips(Array.isArray(restored.skips) ? restored.skips : []);
       setHistoryList(Array.isArray(restored.hingeHistory) ? restored.hingeHistory : []);
        const savedResearchFindings = steps.filter((s) => s.kind === "research").map((s) => {
          let hinge = "";
          try {
            const parsed = JSON.parse(s.requestSummary ?? "{}") as { hinge?: unknown };
            if (typeof parsed.hinge === "string") hinge = parsed.hinge;
          } catch { /* keep blank */ }
          let result: { facts?: unknown } = {};
          if (s.resultSummary && typeof s.resultSummary === "object") result = s.resultSummary as { facts?: unknown };
          else if (typeof s.resultSummary === "string") { try { result = JSON.parse(s.resultSummary) as { facts?: unknown }; } catch { /* keep empty */ } }
          const provenance = Array.isArray(s.provenance) && s.provenance[0] && typeof s.provenance[0] === "object"
            ? s.provenance[0] as { endpointFamily?: unknown; symbol?: unknown; fetchedAt?: unknown; sourceTimestamp?: unknown }
            : null;
          return {
            hinge, family: s.family ?? "",
            facts: result.facts && typeof result.facts === "object" ? result.facts as Record<string, unknown> : {},
            summary: "Saved " + (s.family ?? "market") + " finding" + (hinge ? " for Hinge " + hinge : "") + " (restored from this session).",
            observedAt: typeof provenance?.fetchedAt === "string" ? provenance.fetchedAt : s.finishedAt,
            source: provenance?.endpointFamily && provenance?.symbol ? String(provenance.endpointFamily) + " " + String(provenance.symbol) : "Saved from this session",
          };
        });
       const restoredStatus = sess.brief && typeof sess.brief.terminalStatus === "string"
          ? sess.brief.terminalStatus
          : restored.terminal ?? (sess.status === "stopped" || sess.status === "unresolved" ? sess.status : null);
        if (restoredStatus === "stopped" || restoredStatus === "unresolved") setTerminalStatus(restoredStatus);
        if (sess.brief) {
          setFindings(savedResearchFindings);
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
  const decisionStock = displayStockFromMention(
    String(baseline?.spotSymbol ?? (intent as { resolvedSymbol?: unknown } | null)?.resolvedSymbol ?? (intent as { asset?: unknown } | null)?.asset ?? ""),
    stocks,
  ) ?? stockFromRealityTicker(spotSymbol) ?? stockFromTicker(String((intent as { asset?: unknown } | null)?.asset ?? ""));
  const hasJourney = phase !== "idle" || Boolean(intent || baseline || brief || sessionId);
  const activeHinge = hinges.length ? hinges[hinges.length - 1] : null;
  const previousHinges = hinges.slice(0, -1);
  const unresolved = terminalStatus === "unresolved" || read === "Cannot resolve" || read === "Not enough evidence yet";
  const terminalReasonCode = String((brief as { terminalReasonCode?: unknown } | null)?.terminalReasonCode ?? "");
  const completedBriefQuestions = stringList((brief as { completed?: unknown[] } | null)?.completed);
  const researchCompleted = findings.length > 0 || historyList.length > 0 || completedBriefQuestions.length > 0;
  const hingeEstablished = Boolean(activeHinge || historyList.length > 0 || completedBriefQuestions.length > 0);
  const inconclusiveResearch = unresolved && terminalReasonCode === "INCONCLUSIVE_EVIDENCE";
  const incompleteResearch = unresolved && ["RESEARCH_UNAVAILABLE", "ITERATION_CAP", "INCOMPLETE"].includes(terminalReasonCode);
  const resultHinge = activeHinge?.question
    ?? (unresolved ? "Not established" : Array.isArray((brief as { completed?: unknown[] } | null)?.completed)
      ? String((brief as { completed: unknown[] }).completed.slice(-1)[0] ?? "Awaiting an answerable question")
      : "Awaiting an answerable question");
  const openApp = useCallback(() => navigateSurface("app", "app"), [navigateSurface]);
  const startAnotherDecision = useCallback(() => {
    resetWorkspace();
    setSurface("app");
    try { window.history.replaceState(null, "", "/#app"); } catch { /* non-browser render */ }
  }, [resetWorkspace]);
  const jumpToDashboard = useCallback((anchor: string) => {
    navigateSurface("dashboard", anchor);
    window.setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, [navigateSurface]);
  const selectedStock = stocks.find((stock) => stock.ticker === selectedMarket) ?? null;
  const selectStock = useCallback((stock: StockIdentityData) => {
    setSelectedMarket(stock.ticker);
  }, []);
  const clearStockSelection = useCallback(() => {
    setSelectedMarket(null);
    setDilemma("");
  }, []);

  return (
    <div className="app-shell">
      <SiteHeader surface={surface} onNavigate={navigateSurface} />
      {surface === "dashboard" ? <DashboardView onOpenApp={openApp} onJump={jumpToDashboard} /> : <div id="app" className="app-surface">
        <section className="app-intro" aria-labelledby="app-title">
          <div><p className="eyebrow">CLINCH RESEARCH DESK</p><h1 id="app-title" className="display app-title">Research a Decision</h1><p className="app-subtitle">Tokenized U.S. Stocks on Bitget</p></div>
          <a className="button-secondary" href="/recent">Recent research</a>
        </section>

      <main className={hasJourney ? "workspace workspace-active" : "workspace workspace-initial"}>
        <StockDiscovery stocks={stocks} selectedStock={selectedStock} loading={stocksLoading} error={stocksError} onSelect={selectStock} onClear={clearStockSelection} />
        <section className={hasJourney ? "decision-composer decision-composer-compact" : "decision-composer"} aria-label="Decision input">
          <p className="eyebrow">{hasJourney ? "RESEARCH AGAIN" : "WHAT ARE YOU DECIDING?"}</p>
          <h2 className="hero-question display">{hasJourney ? "What should CLINCH check next?" : "What are you deciding?"}</h2>
          <p className="hero-support">{hasJourney ? "Describe another trading decision and CLINCH will start a fresh, focused research pass." : "Bring the question in your own words. CLINCH will find the Hinge before it chooses what to research."}</p>
          <label className="input-label" htmlFor="dilemma">{COPY.inputLabel}</label>
          <textarea id="dilemma" className="input-box" value={dilemma} onChange={(e) => setDilemma(e.target.value)} placeholder={selectedStock ? COPY.selectedStockPlaceholder : COPY.inputPlaceholder} maxLength={2000} disabled={busy} />
          <div className="input-meta"><span>{dilemma.length > 1700 ? String(dilemma.length) + " / 2000" : "Use your own words. CLINCH will infer the asset and timing."}</span></div>
          <button type="button" className="cta-primary" disabled={busy || dilemma.trim().length < 4} onClick={start}>{busy ? "Researching your decision..." : "Find the Decision Hinge"} <span aria-hidden="true">↗</span></button>
          <p className="trust-line">CLINCH researches the decision. It never places the trade.</p>
        </section>

        {hasJourney && (
          <div className="research-workspace">
            <section className="progress-panel" aria-label="Research progress">
              <div className="progress-heading"><div><p className="eyebrow">THE WORK IN VIEW</p><h2 className="section-title">A focused check, one question at a time</h2></div>{busy && <FreshnessBadge status="live" label="Live" />}</div>
              <ol className="progress-steps progress-steps-five">
                <li className={intent ? "is-done" : busy ? "is-active" : ""}><span className="step-marker" aria-hidden="true">{intent ? "✓" : ""}</span><span>Understand the decision</span></li>
                <li className={baseline ? "is-done" : intent && busy ? "is-active" : ""}><span className="step-marker" aria-hidden="true">{baseline ? "✓" : ""}</span><span>Read live context</span></li>
                <li className={hingeEstablished ? "is-done" : unresolved ? "is-unavailable" : baseline && busy ? "is-active" : ""}><span className="step-marker" aria-hidden="true">{hingeEstablished ? "✓" : unresolved ? "!" : ""}</span><span>{hingeEstablished ? "Find the key question" : unresolved ? "Could not establish an answerable Hinge" : "Find the Decision Hinge"}</span></li>
                <li className={researchCompleted ? "is-done" : unresolved ? "is-unavailable" : terminalStatus === "stopped" && brief ? "is-skipped" : activeHinge && busy ? "is-active" : ""}><span className="step-marker" aria-hidden="true">{researchCompleted ? "✓" : unresolved ? "!" : terminalStatus === "stopped" && brief ? "–" : ""}</span><span>{unresolved ? (inconclusiveResearch ? "Evidence was not decisive" : researchCompleted ? "Research completed" : incompleteResearch ? "Research incomplete" : "Research not run") : "Check the highest-value evidence"}</span></li>
                <li className={brief ? "is-done" : busy ? "is-active" : ""}><span className="step-marker" aria-hidden="true">{brief ? "✓" : ""}</span><span>{unresolved ? "Return an unresolved brief" : "Stop with a brief"}</span></li>
              </ol>
            </section>

            {error && phase === "error" && <section className="state-panel state-error" aria-label="Error" role="alert"><p className="eyebrow"><span className="state-tag state-failed">FAILED</span> NEEDS ATTENTION</p><h2 className="section-title">Unable to complete the research</h2><p className="body-text">{error}</p><p className="secondary-text">Your decision is preserved above. Retry when the connection or provider is ready.</p><button type="button" className="button-secondary" onClick={start} disabled={busy}>Try Again</button></section>}

            {interrupted && <section className="state-panel state-recovery" aria-label="Interrupted research" role="status"><p className="eyebrow">SAVED STATE RESTORED</p><h2 className="section-title">{recoveryStatus === "active" ? "Research is still running" : "Research paused safely"}</h2><p className="body-text">{interrupted}</p><button type="button" className="button-secondary" disabled={busy} onClick={resumeRun}>{COPY.recheck}</button>{resumeNote && <p className="secondary-text">{resumeNote}</p>}</section>}

            {brief && <DecisionAnswer brief={brief} dilemma={dilemma} activeHinge={activeHinge} findings={findings} skips={skips} historyList={historyList} stopReason={stopReason} terminalStatus={terminalStatus} spotSymbol={spotSymbol} spot={spot} perp={perp} assetName={decisionStock?.companyName ?? String((intent as { asset?: unknown } | null)?.asset ?? "This stock")} />}
            {brief && sessionId && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && <MonitorSetup sessionId={sessionId} assetLabel={decisionStock?.companyName ?? spotSymbol} currentRead={readLabel(brief.read ?? read, terminalStatus)} targetReached={decisionWatchEligibility(readLabel(brief.read ?? read, terminalStatus)) === "target-reached"} />}

            {(intent || read || activeHinge) && !brief && <section className="result-overview" aria-label="Research result"><div className="result-overview-heading"><div><p className="eyebrow">{brief ? "RESEARCH RESULT" : "RESULT IN VIEW"}</p><h2 className="section-title">{brief ? "A concise read, with the path behind it" : "The research path is visible as it forms"}</h2></div>{brief && <span className="brief-complete"><span aria-hidden="true">✓</span> Saved</span>}</div><div className="result-grid"><article className="result-block"><p className="eyebrow">YOUR DECISION</p>{decisionStock ? <StockIdentity stock={decisionStock} size="lg" /> : <strong className="result-value display">Reading</strong>}<p className="result-note">{intent ? decisionSummary(intent, decisionStock?.ticker ?? (intent as { asset?: string }).asset ?? null) : "Understanding the language of the decision."}</p></article><article className="result-block result-read-block"><p className="eyebrow">CURRENT READ</p><strong className="result-value display">{brief && typeof (brief as { read?: unknown }).read === "string" ? String((brief as { read: string }).read) : read ? readLabel(read, terminalStatus) : "Still evaluating"}</strong><p className="result-note">Not a prediction. The human decides.</p></article><article className="result-block result-hinge-block"><p className="eyebrow">DECISION HINGE</p>{decisionStock && <StockIdentity stock={decisionStock} size="sm" showToken={false} />}<strong className="result-hinge-question display">{resultHinge}</strong>{activeHinge ? <><p className="result-note"><strong>Why it matters.</strong> {activeHinge.why}</p><p className="result-note result-note-muted"><strong>What would change the read.</strong> {activeHinge.changes}</p></> : unresolved && <p className="result-note"><strong>Why it matters.</strong> {String((brief as { why?: unknown } | null)?.why ?? stopReason ?? "An answerable research question was not established.")}</p>}</article></div></section>}

            {baseline && !brief && <section className="context-section" aria-label="Market context"><div className="section-header-row"><div><p className="eyebrow">LIVE CONTEXT</p><h2 className="section-title">What CLINCH is seeing now</h2>{decisionStock && <StockIdentity stock={decisionStock} size="sm" className="context-identity" />}</div><FreshnessBadge status="live" label="Live baseline" /></div>{Object.keys(spot).length || Object.keys(perp).length ? <details className="trade-details context-details"><summary>View Live Market Context</summary><div className="context-grid"><ContextMetric label="Last price" value={numberText(spot.last)} /><ContextMetric label="24h move" value={percentText(spot.movePct24h)} /><ContextMetric label="Spread" value={numberText(spot.spreadBps, 1)} note={spot.spreadWide === true ? "wide" : spot.spreadWide === false ? "tight" : undefined} /><ContextMetric label="Funding" value={percentText(perp.fundingRate)} note={Object.keys(perp).length ? "stock-perp" : undefined} /></div></details> : <div className="empty-inline"><span className="state-tag state-unavailable">UNAVAILABLE</span><p className="body-text">Live context is unavailable right now. CLINCH will not fill the gap with a guess.</p></div>}<p className="provenance-line">Bitget market data, read by the server. Missing fields stay unavailable.</p></section>}

            {statusLine && !terminalStatus && !brief && phase !== "error" && <section className="live-status" aria-label="Research progress" aria-live="polite"><span className="status-pulse" aria-hidden="true" /><div><p className="eyebrow">NOW</p><p className="status-copy">{statusLine}</p></div></section>}

            {findings.length > 0 && !brief && <section className="findings-section" aria-label="Evidence findings"><div className="section-header-row"><div><p className="eyebrow">WHAT CLINCH CHECKED</p><h2 className="section-title">Evidence that mattered</h2>{decisionStock && <StockIdentity stock={decisionStock} size="sm" className="finding-identity" />}</div><span className="count-label">{findings.length} {findings.length === 1 ? "check" : "checks"}</span></div><div className="finding-list">{findings.map((finding, index) => <article className="finding finding-checked" key={finding.hinge + "-" + index}><div className="finding-marker" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div><div className="finding-body"><p className="finding-family"><span className="state-tag state-checked">CHECKED</span> {familyLabel(finding.family)}</p><p className="finding-summary">{finding.summary}</p><p className="finding-provenance">{safeSource(finding.source, finding.family)}{shortUtc(finding.observedAt) ? ", observed " + shortUtc(finding.observedAt) : ""}.</p>{Object.keys(finding.facts).length > 0 && <details className="trade-details"><summary>View Research Evidence &amp; Sources</summary><dl className="fact-list">{Object.entries(finding.facts).slice(0, 8).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd></div>)}</dl></details>}</div></article>)}</div></section>}

            {skips.length > 0 && !brief && <section className="skip-section" aria-label="Skipped research"><p className="eyebrow">WHAT CLINCH SKIPPED</p>{skips.map((skip, index) => <SkipRecord key={skip.check + "-" + index} check={skip.check} reason={skip.reason} />)}</section>}

            {stopReason && !brief && <section className="stop-panel" aria-label={unresolved ? "Unresolved state" : "Stop state"} aria-live="polite"><p className="eyebrow">{unresolved ? "UNRESOLVED, WITH REASON" : "STOP, WITH REASON"}</p><h2 className="display stop-title">{unresolved ? "Why CLINCH could not complete this path" : "Why CLINCH stopped here"}</h2><p className="body-text">{stopReason.replace(/^CLINCH is stopping here\.\s*/i, "")}</p><p className="secondary-text">{unresolved ? "The live context is preserved. The decision-changing question remains unresolved." : "Further supported research is unlikely to materially change the current decision state."}</p></section>}

            {phase === "clarify" && clarifyQ && <section className="clarify-panel" aria-label="Clarification" aria-live="polite"><p className="eyebrow">ONE DETAIL NEEDED</p><h2 className="hinge-question display">{clarifyQ}</h2><p className="secondary-text">Choose the closest decision. CLINCH will use it to select the right evidence.</p><div className="choice-grid"><button type="button" className="choice-button" disabled={busy} onClick={() => answerClarify("I am considering entering now.")}>Enter now</button><button type="button" className="choice-button" disabled={busy} onClick={() => answerClarify("I am considering exiting.")}>Exit</button><button type="button" className="choice-button" disabled={busy} onClick={() => answerClarify("I am considering waiting.")}>Wait for a better moment</button><button type="button" className="choice-button" disabled={busy} onClick={() => answerClarify("I am not deciding yet.")}>I am not deciding yet</button></div></section>}

            {(previousHinges.length > 0 || historyList.length > 0) && !brief && <details className="audit-trail"><summary>How CLINCH got here</summary><div className="trail-list">{[...previousHinges, ...historyList.map((h) => ({ hinge: h.hinge, question: h.question ?? "Saved research question" }))].map((h, index) => <div className="trail-item" key={h.hinge + "-" + index}><span className="trail-marker" aria-hidden="true">✓</span><div><strong>Decision Hinge {index + 1}</strong><p>{h.question}</p></div></div>)}</div></details>}

            {brief && <section className="brief-actions-panel" aria-label="Research follow-up">
              <SaveResearchPrompt sessionId={sessionId} />
              <div className="human-final"><p className="eyebrow">HUMAN DECISION</p><p className="body-text">{COPY.finalNotice}</p></div>
              <div className="brief-actions"><button type="button" className="cta-primary" onClick={startAnotherDecision}>Start another decision <span aria-hidden="true">↗</span></button><a className="button-secondary" href="/recent">Open recent decisions</a></div>
              <div className="delete-row">{deletePending ? <div className="delete-confirm" role="group" aria-label="Confirm deletion"><p className="secondary-text">Delete this saved brief and its research history? This cannot be undone.</p><div className="delete-confirm-actions"><button type="button" className="quiet-danger" disabled={busy || deleting} onClick={deleteResearch}>{deleting ? "Deleting..." : "Delete it"}</button><button type="button" className="button-plain" disabled={busy || deleting} onClick={() => setDeletePending(false)}>Keep research</button></div></div> : <button type="button" className="quiet-danger" disabled={busy || deleting} onClick={() => setDeletePending(true)}>{COPY.deleteResearch}</button>}</div>
            </section>}
          </div>
        )}
      </main>
      </div>}

      <ProductFooter />
    </div>
  );

}
