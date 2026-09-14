import type { StockIdentityData } from "@/lib/stocks";
import { realityTickerLabel } from "@/lib/stocks";

interface StockIdentityProps {
  stock: StockIdentityData | null | undefined;
  size?: "sm" | "md" | "lg";
  showToken?: boolean;
  className?: string;
}

function Mark({ stock }: { stock: StockIdentityData }) {
  const common = { className: "stock-logo-mark", viewBox: "0 0 32 32", role: "img", "aria-label": `${stock.companyName} logo` };
  switch (stock.logoKey) {
    case "apple":
      return <svg {...common}><path fill="currentColor" d="M20.9 8.4c1.3-1.5 1.2-3.5 1.2-3.5s-1.9.1-3.2 1.6c-1.1 1.2-1.1 2.8-1.1 2.8s1.8.5 3.1-.9ZM25.3 17.1c0-3.1 2.5-4.6 2.6-4.7-1.4-2.1-3.7-2.4-4.5-2.5-1.9-.2-3.7 1.1-4.7 1.1-1 0-2.5-1.1-4.1-1.1-2.1 0-4 1.2-5 3.1-2.2 3.8-.6 9.5 1.5 12.6 1.1 1.5 2.3 3.2 4 3.1 1.6-.1 2.2-1 4.1-1s2.5 1 4.1 1c1.7 0 2.8-1.5 3.9-3.1 1.2-1.7 1.7-3.4 1.8-3.5-.1 0-3.6-1.4-3.7-5Z" /><path fill="currentColor" d="M19 4.3c.6-.7 1-1.7 1-2.7-.9 0-2 .6-2.6 1.3-.6.6-1 1.6-.9 2.5.9.1 1.9-.4 2.5-1.1Z" /></svg>;
    case "tesla":
      return <svg {...common}><path fill="currentColor" d="M5 8.8c2.9-2.2 6.6-3.3 11-3.3s8.1 1.1 11 3.3l-1.4 1.7c-2-1.2-4.5-2-7.9-2.3v17.2l-1.7 1.1-1.7-1.1V8.2c-3.4.3-5.9 1.1-7.9 2.3L5 8.8Zm4.3-3.1C11.7 4.5 13.8 4 16 4s4.3.5 6.7 1.7l-.6 1.1c-2.1-.7-4.1-1-6.1-1s-4 .3-6.1 1l-.6-1.1Z" /></svg>;
    case "microsoft":
      return <svg {...common}><path fill="currentColor" d="M4 4h11v11H4V4Zm13 0h11v11H17V4ZM4 17h11v11H4V17Zm13 0h11v11H17V17Z" /></svg>;
    case "amazon":
      return <svg {...common}><path fill="currentColor" d="M8.1 10.4c1.4-2.5 4.1-3.9 7.4-3.9 4.5 0 7.1 2.3 7.1 6.8v5.1c0 1.2.5 2 1.2 2.7v.4h-4.2l-.5-1.8c-1.5 1.5-3.3 2.2-5.4 2.2-3.4 0-5.4-1.7-5.4-4.4 0-3 2.5-4.7 7-4.7h3.4v-.4c0-1.8-1-2.8-3-2.8-1.7 0-2.8.7-3.3 2.1l-4.3-1.3Zm10.6 5.2h-3.2c-2.2 0-3.3.6-3.3 1.9 0 1.2.9 1.9 2.3 1.9 1.8 0 3.2-.9 4.2-2.4v-1.4Z" /><path fill="currentColor" d="M4.2 24.1c5 2.6 12.9 3.2 20.1-.7l.7 1.2c-6 4.9-15.3 4.6-21.5.8l.7-1.3Z" /></svg>;
    case "meta":
      return <svg {...common}><path fill="currentColor" d="M5.4 22.9C2.6 22.9 1 21 1 18.4c0-3.9 3.2-8.7 6.7-8.7 1.8 0 3.3 1.1 4.5 2.6 1.2-1.5 2.7-2.6 4.5-2.6 3.5 0 6.7 4.8 6.7 8.7 0 2.6-1.6 4.5-4.4 4.5-2.5 0-4.7-1.8-6.8-4.5-2.1 2.7-4.3 4.5-6.8 4.5Zm2.1-9.6c-1.3 0-3.4 2.9-3.4 5.1 0 1 .4 1.4 1.4 1.4 1.4 0 3.1-1.7 4.9-4.2-1.1-1.5-1.9-2.3-2.9-2.3Zm9.2 0c-1 0-1.8.8-2.9 2.3 1.8 2.5 3.5 4.2 4.9 4.2 1 0 1.4-.4 1.4-1.4 0-2.2-2.1-5.1-3.4-5.1Z" /></svg>;
    case "google":
      return <svg {...common}><path fill="currentColor" d="M16 4a12 12 0 1 0 8.4 20.5l-2.4-2.4A8.5 8.5 0 1 1 22 16h-6v3.5h9.5A12 12 0 0 0 16 4Z" /><path fill="currentColor" d="M16 13.5h8.7V17H16v-3.5Z" /></svg>;
    case "nvidia":
      return <svg {...common}><path fill="currentColor" d="M4 15.5c4.1-5.4 9.3-7.2 15.4-5.4 2.1.6 4.1 1.8 6 3.7-3.7-1.4-6.7-1.5-9-.3-1.8.9-3.3 2.4-4.5 4.5 2.9-2.2 5.7-2.8 8.4-1.7-2.3 2.3-4.9 3.4-7.8 3.4-2.7 0-5.5-1.2-8.5-4.2Zm8.2-1.2c1.1-1.5 2.6-2.1 4.4-1.8-1.3.7-2.4 1.6-3.3 2.8l-1.1-1Z" /></svg>;
    case "amd":
      return <svg {...common}><path fill="currentColor" d="M5 5h10v3.2H8.2v6.8H5V5Zm9.8 0H27v12.2h-3.3V8.2h-5.6V5h-3.3Zm-4.3 10h3.3V27h-3.3V15Zm4.8 0h3.3v8.7h-3.3V15Z" /></svg>;
    default:
      return <span className="stock-logo-monogram" aria-hidden="true">{stock.ticker.slice(0, 2)}</span>;
  }
}

export function StockIdentity({ stock, size = "md", showToken = true, className = "" }: StockIdentityProps) {
  if (!stock) return null;
  const tokenLabel = `Bitget rToken · ${realityTickerLabel(stock)}`;
  return (
    <span className={`stock-identity stock-identity-${size} ${className}`.trim()}>
      <span className="stock-logo" aria-hidden="true"><Mark stock={stock} /></span>
      <span className="stock-identity-copy">
        <span className="stock-company">{stock.companyName}</span>
        <span className="stock-ticker">{stock.ticker}</span>
        {showToken && <span className="stock-token-meta" title="Bitget's rToken is the tokenized version of the underlying U.S. stock.">{tokenLabel}</span>}
      </span>
    </span>
  );
}

export type { StockIdentityData };
