export function FixtureBanner() {
  return (
    <div className="fixture-banner" role="note">
      DEVELOPMENT FIXTURE. Static preview states below. Not live market truth.
    </div>
  );
}

export function FreshnessBadge({ status, label }: { status: "live" | "stale" | "missing"; label: string }) {
  const dot = status === "live" ? "dot-live" : status === "stale" ? "dot-stale" : "dot-missing";
  return (
    <span className="badge">
      <span className={`dot ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export function HingeCard({ n, question, why, changes }: { n: number; question: string; why: string; changes: string }) {
  return (
    <section className="hinge-card" aria-label={`Decision Hinge ${n}`}>
      <p className="micro-label">Decision Hinge {n}</p>
      <h2 className="hinge-question display">{question}</h2>
      <p className="body-text">
        <strong>Why this matters.</strong> {why}
      </p>
      <p className="secondary-text">
        <strong>What would change the read.</strong> {changes}
      </p>
    </section>
  );
}

export function SkipRecord({ check, reason }: { check: string; reason: string }) {
  const label = check === "spot-structure" ? "Spot market structure" : check === "perp-positioning" ? "Positioning context" : check;
  return (
    <section className="skip-card" aria-label={`Skipped ${label}`}>
      <p className="micro-label">Skipped: {label}</p>
      <p className="body-text">Why skipped: {reason}</p>
    </section>
  );
}

export function CurrentRead({ read, note }: { read: string; note: string }) {
  return (
    <section className="read-banner" aria-label="Current research read" aria-live="polite">
      <p className="micro-label">Current read</p>
      <p className="section-title">{read}</p>
      <p className="secondary-text">{note}</p>
    </section>
  );
}
