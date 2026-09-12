import { COPY } from "@/lib/copy";
import { FixtureBanner, FreshnessBadge, HingeCard, SkipRecord, CurrentRead } from "@/components/research";

// P9 static foundation. Every market fact below is a DEVELOPMENT FIXTURE using
// only spot-structure / perp-positioning shapes. Nothing here is live truth.
export default function Page() {
  return (
    <div className="wrap">
      <div className="column">
        <header>
          <p className="micro-label">CLINCH</p>
          <h1 className="hero-question display">{COPY.heroQuestion}</h1>
          <p className="body-text">{COPY.heroSupport}</p>
        </header>
        <FixtureBanner />
        <main>
          <section aria-label="Decision input">
            <label className="micro-label" htmlFor="dilemma">
              {COPY.inputLabel}
            </label>
            <textarea id="dilemma" className="input-box" defaultValue="" placeholder={COPY.inputPlaceholder} />
            <div className="chip-row" aria-label="Example dilemmas">
              <button type="button" className="chip">rNVDA off-hours dip</button>
              <button type="button" className="chip">Thin rTSLA move</button>
              <button type="button" className="chip">Crowded rAAPL entry</button>
            </div>
            <button type="button" className="cta-primary">{COPY.ctaCheck}</button>
            <p className="secondary-text">{COPY.trustLine}</p>
          </section>

          <section aria-label="Decision restatement">
            <h2 className="section-title">Your decision</h2>
            <p className="body-text">RNVDA. Considering: enter now. Evening decline. [fixture]</p>
          </section>

          <section aria-label="Market context">
            <h2 className="section-title">Live context [fixture]</h2>
            <div className="context-strip">
              <span>RNVDA 218.24 (-0.4%)</span>
              <span>Observed 23:04 UTC</span>
              <FreshnessBadge status="live" label="Live" />
            </div>
          </section>

          <HingeCard
            n={1}
            question="Is this a real move or a thin-liquidity print?"
            why="A spread-driven artifact makes entering now a different decision from buying real selling."
            changes="Sustained closes on rebuilding depth would reopen the entry question."
          />

          <section aria-label="Research progress">
            <h2 className="section-title">Research in progress [fixture]</h2>
            <p className="body-text">Checking whether the move is supported by real liquidity.</p>
          </section>

          <section aria-label="Evidence finding">
            <h2 className="section-title">Finding [fixture]</h2>
            <p className="body-text">
              Observed: three lower 15-minute closes on thinning volume after 22:00 UTC.
            </p>
            <p className="body-text">
              Changed: this keeps the hold-off read in place.
            </p>
            <p className="secondary-text">Bitget Reality, RNVDAUSDT, observed 23:04 UTC.</p>
          </section>

          <CurrentRead read="Holding off" note="Current research read, not a prediction. You decide." />

          <SkipRecord
            check="Positioning context"
            reason="Even calm positioning would not make this entry attractive while spot liquidity stays impaired."
          />

          <section aria-label="Stop state">
            <h2 className="section-title">CLINCH is stopping here</h2>
            <p className="body-text">
              The checks still available are unlikely to change this read.
            </p>
          </section>

          <section className="brief-card" aria-label="Final brief">
            <h2 className="section-title">Research brief [fixture]</h2>
            <p className="body-text">Read: Holding off. Two findings above. One skip with reason.</p>
            <p className="secondary-text">Observed 23:04 to 23:06 UTC. Sources below.</p>
            <p className="body-text">Research finished. The trading decision is yours.</p>
          </section>

          <section aria-label="Cannot resolve example">
            <h2 className="section-title">Cannot resolve with current evidence [fixture]</h2>
            <p className="body-text">
              Checked: spot market structure. Missing: usable positioning coverage for this instrument.
            </p>
          </section>

          <section aria-label="Recovery example">
            <h2 className="section-title">Research paused after Hinge 1 [fixture]</h2>
            <p className="body-text">Saved 23:04 UTC. Prices may have moved.</p>
          </section>
        </main>
        <footer className="product-foot">
          <p className="secondary-text">{COPY.privacyNote}</p>
        </footer>
      </div>
    </div>
  );
}
