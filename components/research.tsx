export function FixtureBanner() {
  return (
    <div className="fixture-banner" role="note">
      DEVELOPMENT FIXTURE. Static preview states below. Not live market truth.
    </div>
  );
}

export function FreshnessBadge({ status, label }: { status: "live" | "stale" | "missing"; label: string }) {
  const dot = status === "live" ? "dot-live" : status === "stale" ? "dot-stale" : "dot-missing";
  return <span className="badge"><span className={"dot " + dot} aria-hidden="true" />{label}</span>;
}

export function HingeCard({ n, question, why, changes, active = true }: { n: number; question: string; why: string; changes: string; active?: boolean }) {
  return (
    <section className={active ? "hinge-card hinge-card-active" : "hinge-card"} aria-label={"Decision Hinge " + String(n)} aria-live={active ? "polite" : undefined}>
      <div className="hinge-marker" aria-hidden="true"><span>H</span><strong>{String(n).padStart(2, "0")}</strong></div>
      <div className="hinge-copy">
        <p className="eyebrow">DECISION HINGE {n}</p>
        <h2 className="hinge-question display">{question}</h2>
        <p className="hinge-explanation"><strong>Why this matters.</strong> {why}</p>
        <p className="hinge-explanation hinge-change"><strong>What would change the read.</strong> {changes}</p>
      </div>
      {active && <span className="hinge-live">Live question</span>}
    </section>
  );
}

export function SkipRecord({ check, reason }: { check: string; reason: string }) {
  const label = check === "spot-structure" ? "Spot market structure" : check === "perp-positioning" ? "Positioning context" : check;
  return (
    <article className="skip-card" aria-label={"Skipped " + label}>
      <div className="skip-marker" aria-hidden="true">S</div>
      <div><p className="eyebrow"><span className="state-tag state-skipped">SKIPPED</span></p><h3 className="skip-title">{label}</h3><p className="body-text">{reason}</p></div>
    </article>
  );
}

export function CurrentRead({ read, note }: { read: string; note: string }) {
  return (
    <section className="read-banner" aria-label="Current research read" aria-live="polite">
      <span className="read-marker" aria-hidden="true" />
      <div><p className="eyebrow">CURRENT READ</p><p className="read-value display">{read}</p><p className="secondary-text">{note}</p></div>
    </section>
  );
}
