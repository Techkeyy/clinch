"use client";

import { useMemo, useState } from "react";
import { StockIdentity } from "@/components/stock-identity";
import { featuredSupportedStocks, stockMatchesQuery, type StockIdentityData } from "@/lib/stocks";

interface StockDiscoveryProps {
  stocks: StockIdentityData[];
  selectedStock: StockIdentityData | null;
  verifiedMarkCount: number | null;
  fallbackMarkCount: number | null;
  loading: boolean;
  error: boolean;
  onSelect: (stock: StockIdentityData) => void;
  onClear: () => void;
}

const INITIAL_RESULT_LIMIT = 24;
const RESULT_PAGE_SIZE = 24;

export function StockDiscovery({
  stocks,
  selectedStock,
  verifiedMarkCount,
  fallbackMarkCount,
  loading,
  error,
  onSelect,
  onClear,
}: StockDiscoveryProps) {
  const [browseOpen, setBrowseOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_RESULT_LIMIT);
  const featured = useMemo(() => featuredSupportedStocks(stocks), [stocks]);
  const matches = useMemo(() => stocks.filter((stock) => stockMatchesQuery(stock, query)), [query, stocks]);
  const visibleMatches = matches.slice(0, visibleLimit);
  const resultsVisible = browseOpen || query.trim().length > 0;

  const choose = (stock: StockIdentityData) => {
    onSelect(stock);
    setBrowseOpen(false);
    setQuery("");
    setVisibleLimit(INITIAL_RESULT_LIMIT);
  };

  return (
    <section className="stock-discovery" aria-labelledby="stock-discovery-title">
      <div className="stock-discovery-header">
        <div>
          <p className="example-label">Supported stock universe</p>
          <h3 id="stock-discovery-title" className="stock-discovery-title">Choose a stock</h3>
          <p className="stock-discovery-copy">Search the supported Bitget stock universe or start with a featured name.</p>
        </div>
        {!loading && !error && stocks.length > 0 && <p className="stock-browser-status stock-discovery-count" role="status">{stocks.length} supported Reality instruments · {verifiedMarkCount ?? 0} verified marks · {fallbackMarkCount ?? 0} fallbacks</p>}
      </div>

      {selectedStock && <div className="selected-stock-summary" role="status" aria-live="polite">
        <div>
          <p className="eyebrow">SELECTED STOCK</p>
          <StockIdentity stock={selectedStock} size="lg" />
        </div>
        <button type="button" className="stock-change-button" onClick={onClear}>Change</button>
      </div>}

      <div className="stock-search-block">
        <label className="stock-search-label" htmlFor="stock-search">Search by company, ticker, or rToken</label>
        <input
          id="stock-search"
          className="stock-search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setVisibleLimit(INITIAL_RESULT_LIMIT); }}
          placeholder="Search by company, ticker, or rToken"
          autoComplete="off"
        />
        <p className="stock-search-help">Try NVIDIA, NVDA, or rNVDA. Selecting a stock sets context only; CLINCH will not start research until you submit your decision.</p>
      </div>

      {loading && <p className="stock-browser-status" role="status">Loading supported stocks...</p>}
      {!loading && error && <p className="stock-browser-status" role="status">Supported stocks are unavailable right now. You can still describe a stock in your own words.</p>}

      {!loading && !error && stocks.length > 0 && <>
        {featured.length > 0 && <div className="stock-featured-section">
          <div className="stock-section-heading"><div><p className="eyebrow">FEATURED STOCKS</p><p className="stock-section-note">Recognizable names currently available in the live supported universe.</p></div></div>
          <div className="stock-feature-grid">
            {featured.map((stock) => {
              const selected = selectedStock?.ticker === stock.ticker;
              return <button
                type="button"
                className={`stock-feature-card ${selected ? "is-selected" : ""}`.trim()}
                key={stock.ticker}
                aria-label={`Select ${stock.companyName}, ticker ${stock.ticker}`}
                aria-pressed={selected}
                onClick={() => choose(stock)}
              >
                <StockIdentity stock={stock} size="sm" showToken={false} />
                <span className="stock-selection-indicator" aria-hidden="true">{selected ? "Selected" : ""}</span>
              </button>;
            })}
          </div>
        </div>}

        <div className="stock-browse-section">
          <button type="button" className="stock-browser-toggle" aria-expanded={browseOpen} aria-controls="stock-browser-panel" onClick={() => setBrowseOpen((open) => !open)}>{browseOpen ? "Hide supported stocks" : "Browse supported stocks"}</button>
          {resultsVisible && <div className="stock-browser-panel" id="stock-browser-panel">
            <div className="stock-result-heading"><p className="stock-section-note">{query.trim() ? `${matches.length} matching instrument${matches.length === 1 ? "" : "s"}` : "Showing the first supported instruments. Search to narrow the list."}</p></div>
            <div className="stock-result-list" aria-label="Supported stocks">
              {visibleMatches.map((stock) => {
                const selected = selectedStock?.ticker === stock.ticker;
                return <button
                  type="button"
                  className={`stock-result ${selected ? "is-selected" : ""}`.trim()}
                  key={stock.ticker}
                  aria-label={`Select ${stock.companyName}, ticker ${stock.ticker}`}
                  aria-pressed={selected}
                  onClick={() => choose(stock)}
                >
                  <StockIdentity stock={stock} />
                  <span className="stock-selection-indicator" aria-hidden="true">{selected ? "Selected" : ""}</span>
                </button>;
              })}
              {visibleMatches.length === 0 && <p className="stock-browser-status">No supported stock matches that search.</p>}
            </div>
            {visibleMatches.length < matches.length && <button type="button" className="stock-load-more" onClick={() => setVisibleLimit((limit) => limit + RESULT_PAGE_SIZE)}>Show more supported stocks <span aria-hidden="true">↓</span></button>}
          </div>}
        </div>
      </>}
    </section>
  );
}
