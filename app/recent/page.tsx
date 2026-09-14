"use client";

import { useEffect, useState } from "react";
import { readRecentIds } from "@/lib/recent";
import { StockIdentity } from "@/components/stock-identity";
import { displayStockFromMention, type StockIdentityData } from "@/lib/stocks";

interface RecentItem { id: string; stock: StockIdentityData | null; decision: string; read: string; status: string; updatedAt: string }

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function readLabel(read: string): string {
  const labels: Record<string, string> = {
    "leaning-in": "Leaning in", "holding-off": "Holding off",
    "standing-aside": "Standing aside", "cannot-resolve": "Cannot resolve",
  };
  return labels[read] ?? read;
}

export default function RecentPage() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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

  return (
    <div className="app-shell">
      <header className="site-header reference-header">
        <a className="wordmark wordmark-button" href="/#dashboard" aria-label="CLINCH dashboard">CLINCH <span>Research desk</span></a>
        <nav className="mode-nav" aria-label="Primary"><a className="mode-link" href="/#dashboard">Dashboard</a><a className="mode-link" href="/#app">App</a></nav>
        <nav className="secondary-nav" aria-label="Learn more"><a className="text-nav-link" href="/#how-it-works">How it Works</a><a className="text-nav-link" href="/#research-method">Research Method</a><a className="text-nav-link" href="/recent" aria-current="page">Recent research</a></nav>
        <a className="header-cta" href="/#app">Open App <span aria-hidden="true">↗</span></a>
      </header>
      <main className="workspace recent-workspace">
        <section className="recent-intro">
          <p className="eyebrow">RETURNING TO YOUR WORK</p>
          <h1 className="hero-question display">Recent decisions</h1>
          <p className="hero-support">Research saved by this browser, re-checked against your owner cookie. Clearing site data removes access.</p>
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
        {!loading && items.length > 0 && (
          <section className="recent-list" aria-label="Saved research sessions">
            {items.map((item) => (
              <article className="recent-row" key={item.id}>
                <div className="recent-row-main">
                  <p className="eyebrow">{item.status === "stopped" ? "COMPLETED RESEARCH" : "SAVED RESEARCH"}</p>
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
      <footer className="product-foot"><p>Private by design. No account, no wallet.</p><p>Research support only. CLINCH never places trades.</p></footer>
    </div>
  );
}
