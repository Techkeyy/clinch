"use client";

import { useEffect, useState } from "react";

interface RecentItem { id: string; asset: string; decision: string; read: string; status: string; updatedAt: string }

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

import { readRecentIds } from "@/lib/recent";

// Minimal returning-browser surface: this browser's IDs only, each re-verified
// by ownership on fetch. Expired/deleted/foreign sessions vanish silently.
export default function RecentPage() {
  const [items, setItems] = useState<RecentItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = readRecentIds();
      const out: RecentItem[] = [];
      for (const id of ids.slice(0, 10)) {
        try {
          const res = await fetch(`/api/session?id=${encodeURIComponent(id)}`);
          if (!res.ok) continue;
          const j = await res.json();
          const st = (j.session?.state ?? {}) as { intent?: { asset?: string; decisionQuestion?: string } };
          out.push({
            id, asset: String(st.intent?.asset ?? "?"),
            decision: String(st.intent?.decisionQuestion ?? "").slice(0, 90),
            read: String(j.session?.read ?? ""), status: String(j.session?.status ?? ""),
            updatedAt: String(j.session?.updatedAt ?? ""),
          });
        } catch { /* skip unreadable */ }
      }
      if (!cancelled) setItems(out);
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <div className="wrap">
      <div className="column">
        <p className="micro-label">CLINCH</p>
        <h1 className="hero-question display">Recent decisions</h1>
        <p className="body-text">Only this browser, only your sessions. Clearing site data removes access.</p>
        <main>
          {items.length === 0 && <p className="body-text">No saved research in this browser yet.</p>}
          {items.map((it) => (
            <section key={it.id} className="brief-card" aria-label={`Research ${it.asset}`}>
              <p className="section-title">{it.asset} <span className="secondary-text">· {it.read}</span></p>
              <p className="secondary-text">{it.decision}</p>
              <p className="secondary-text">{it.status}{it.updatedAt ? ` · ${shortDate(it.updatedAt)}` : ""}</p>
              <p><a href={`/?s=${encodeURIComponent(it.id)}`}>Open research</a></p>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
