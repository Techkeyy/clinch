"use client";

import { useEffect, useState } from "react";
import { readRecentIds } from "@/lib/recent";
import { StockIdentity } from "@/components/stock-identity";
import { displayStockFromMention, type StockIdentityData } from "@/lib/stocks";
import { AccountControl } from "@/components/account-control";

interface RecentItem { id: string; stock: StockIdentityData | null; decision: string; read: string; status: string; updatedAt: string }
interface WatchItem { id: string; sourceSessionId: string; assetLabel: string; currentRead: string; targetRead: string; status: string; notificationChannel: string; humanKeyQuestion: string; stateVersion: number; lastCheckedAt: string | null; nextCheckAt: string | null }

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function readLabel(read: string): string {
  const labels: Record<string, string> = {
    "enter-now": "Slightly favorable", "leaning-in": "Slightly favorable",
    wait: "Better to wait", "holding-off": "Better to wait",
    "stand-aside": "No clear advantage", "standing-aside": "No clear advantage",
    undecided: "Not enough evidence yet", "cannot-resolve": "Not enough evidence yet",
  };
  return labels[read] ?? (read || "Not enough evidence yet");
}

function WatchList({ watches, onChange }: { watches: WatchItem[]; onChange: (watch: WatchItem) => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!watches.length) return null;
  const action = async (watch: WatchItem, next: "pause" | "resume" | "cancel") => {
    setBusyId(watch.id);
    setMessage(null);
    try {
      const response = await fetch("/api/watches/" + encodeURIComponent(watch.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: next, expectedVersion: watch.stateVersion }),
      });
      const data = await response.json() as { error?: string; watch?: Partial<WatchItem> };
      if (!response.ok || !data.watch) {
        setMessage(data.error === "VERSION_CONFLICT" ? "This watch changed in another tab. Refresh to get the latest state." : "That watch action did not complete.");
        return;
      }
      onChange({ ...watch, ...data.watch } as WatchItem);
    } catch { setMessage("That watch action did not complete."); }
    finally { setBusyId(null); }
  };
  return <section className="watch-list" aria-label="Decision Watches"><div className="section-header-row"><div><p className="eyebrow">DECISION WATCH</p><h2 className="section-title">Watching your decisions</h2></div><span className="count-label">{watches.length} {watches.length === 1 ? "watch" : "watches"}</span></div><div className="watch-list-items">{watches.map((watch) => <article className="watch-row" key={watch.id}><div className="watch-row-main"><p className="eyebrow">{watch.status === "TRIGGERED" ? "TARGET REACHED" : watch.status === "PAUSED" ? "PAUSED" : watch.status === "CANCELLED" ? "STOPPED" : "ACTIVE"}</p><h3 className="watch-asset display">{watch.assetLabel}</h3><p className="recent-decision">{watch.humanKeyQuestion}</p></div><div className="watch-row-read"><span className="secondary-text">Current read</span><strong>{readLabel(watch.currentRead)}</strong><span className="secondary-text">Target: {readLabel(watch.targetRead)}</span><span className="secondary-text">Telegram</span><span className="secondary-text">Last checked: {watch.lastCheckedAt ? shortDate(watch.lastCheckedAt) : "Pending first check"}</span></div><div className="watch-row-actions"><a className="button-secondary" href={"/?s=" + encodeURIComponent(watch.sourceSessionId) + "#app"}>Open research</a>{watch.status === "ACTIVE" && <button type="button" className="button-plain" disabled={busyId === watch.id} onClick={() => action(watch, "pause")}>Pause</button>}{watch.status === "PAUSED" && <button type="button" className="button-secondary" disabled={busyId === watch.id} onClick={() => action(watch, "resume")}>Resume</button>}{watch.status !== "TRIGGERED" && watch.status !== "CANCELLED" && <button type="button" className="quiet-danger" disabled={busyId === watch.id} onClick={() => action(watch, "cancel")}>Stop</button>}</div></article>)}</div>{message && <p className="secondary-text" role="status">{message}</p>}</section>;
}

export default function RecentPage() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountMode, setAccountMode] = useState(false);
  const [watches, setWatches] = useState<WatchItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const accountRes = await fetch("/api/recent");
        const accountJson = await accountRes.json() as { authenticated?: boolean; items?: { id: string; stockMention: string | null; decision: string; read: string; status: string; updatedAt: string }[] };
        if (accountJson.authenticated) {
          const accountItems = (accountJson.items ?? []).map((item) => ({
            id: item.id,
            stock: displayStockFromMention(item.stockMention, []),
            decision: item.decision,
            read: readLabel(item.read),
            status: item.status,
            updatedAt: item.updatedAt,
          }));
          if (!cancelled) { setItems(accountItems); setAccountMode(true); setLoading(false); }
          return;
        }
      } catch { /* fall through to guest browser history */ }
      const ids = readRecentIds();
      const out: RecentItem[] = [];
      for (const id of ids.slice(0, 10)) {
        try {
          const res = await fetch("/api/session?id=" + encodeURIComponent(id));
          if (!res.ok) continue;
          const j = await res.json();
          const st = (j.session?.state ?? {}) as { intent?: { asset?: string; resolvedSymbol?: string; decisionQuestion?: string }; spotSymbol?: string };
          const stock = displayStockFromMention(st.spotSymbol ?? st.intent?.resolvedSymbol ?? st.intent?.asset, []);
          out.push({
            id,
            stock,
            decision: String(st.intent?.decisionQuestion ?? "Research session").slice(0, 100),
            read: readLabel(String(j.session?.read ?? "Still evaluating")),
            status: String(j.session?.status ?? ""),
            updatedAt: String(j.session?.updatedAt ?? ""),
          });
        } catch { /* unreadable sessions are not history for this browser */ }
      }
      if (!cancelled) { setItems(out); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!accountMode) return;
    let cancelled = false;
    fetch("/api/watches")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json() as { items?: WatchItem[] };
        if (!cancelled) setWatches(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => { /* research history remains available if watches are unavailable */ });
    return () => { cancelled = true; };
  }, [accountMode]);

  return (
    <div className="app-shell">
      <header className="site-header reference-header">
        <a className="wordmark wordmark-button" href="/#dashboard" aria-label="CLINCH dashboard">CLINCH <span>Research desk</span></a>
        <nav className="mode-nav" aria-label="Primary"><a className="mode-link" href="/#dashboard">Dashboard</a><a className="mode-link" href="/#app">App</a></nav>
        <nav className="secondary-nav" aria-label="Learn more"><a className="text-nav-link" href="/#how-it-works">How it Works</a><a className="text-nav-link" href="/#research-method">Research Method</a><a className="text-nav-link" href="/recent" aria-current="page">Recent research</a></nav>
        <AccountControl />
        <a className="header-cta" href="/#app">Open App <span aria-hidden="true">↗</span></a>
      </header>
      <main className="workspace recent-workspace">
        <section className="recent-intro">
          <p className="eyebrow">RETURNING TO YOUR WORK</p>
          <h1 className="hero-question display">Recent decisions</h1>
          <p className="hero-support">{accountMode ? "Research saved to your CLINCH account, available across devices." : "Research saved by this browser, re-checked against your owner cookie. Clearing site data removes access."}</p>
        </section>
        {loading && <section className="state-panel" aria-live="polite"><p className="eyebrow">LOADING</p><p className="body-text">Checking your saved research.</p></section>}
        {!loading && items.length === 0 && (
          <section className="empty-history" aria-label="Empty recent decisions">
            <span className="empty-history-marker" aria-hidden="true">+</span>
            <h2 className="section-title">No saved research here yet</h2>
            <p className="body-text">Start a decision and CLINCH will keep its brief available in this browser for 30 days.</p>
            <a className="cta-primary" href="/#app">Start a decision <span aria-hidden="true">↗</span></a>
          </section>
        )}
        {accountMode && <WatchList watches={watches} onChange={(next) => setWatches((current) => current.map((watch) => watch.id === next.id ? next : watch))} />}
        {!loading && items.length > 0 && (
          <section className="recent-list" aria-label="Saved research sessions">
            {items.map((item) => (
              <article className="recent-row" key={item.id}>
                <div className="recent-row-main">
                    <p className="eyebrow">{item.status === "stopped" ? "COMPLETED RESEARCH" : item.status === "unresolved" ? "UNRESOLVED RESEARCH" : "SAVED RESEARCH"}</p>
                  {item.stock ? <StockIdentity stock={item.stock} size="lg" /> : <h2 className="recent-asset display">Decision</h2>}
                  <p className="recent-decision">{item.decision}</p>
                </div>
                <div className="recent-row-read"><span className="secondary-text">Current read</span><strong>{item.read}</strong>{item.updatedAt && <span className="secondary-text">{shortDate(item.updatedAt)}</span>}</div>
                <a className="button-secondary" href={"/?s=" + encodeURIComponent(item.id) + "#app"}>Open research</a>
              </article>
            ))}
          </section>
        )}
      </main>
      <footer className="product-foot"><p>{accountMode ? "Saved privately to your CLINCH account." : "Stored privately in this browser."}</p><p>CLINCH researches the decision. It never places the trade.</p></footer>
    </div>
  );
}
