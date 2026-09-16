import {
  siAmd,
  siApple,
  siBroadcom,
  siCoinbase,
  siGoogle,
  siIntel,
  siMeta,
  siNetflix,
  siNvidia,
  siPalantir,
  siQualcomm,
  siShopify,
  siTesla,
  siVisa,
} from "simple-icons";
import { faAmazon, faMicrosoft } from "@fortawesome/free-brands-svg-icons";
import type { StockIdentityData } from "@/lib/stocks";
import { realityTickerLabel } from "@/lib/stocks";

interface StockIdentityProps {
  stock: StockIdentityData | null | undefined;
  size?: "sm" | "md" | "lg";
  showToken?: boolean;
  className?: string;
}

interface BrandMark {
  title: string;
  source: string;
  viewBox: string;
  path: string;
  color: string;
}

function simpleMark(icon: typeof siApple): BrandMark {
  return {
    title: icon.title,
    source: `Simple Icons · ${icon.source ?? "catalogued brand source"}`,
    viewBox: "0 0 24 24",
    path: icon.path,
    color: `#${icon.hex}`,
  };
}

function fontAwesomeMark(icon: typeof faAmazon, color: string): BrandMark {
  const rawPath = icon.icon[4];
  return {
    title: icon.iconName,
    source: "Font Awesome Free Brands · CC BY 4.0",
    viewBox: `0 0 ${icon.icon[0]} ${icon.icon[1]}`,
    path: Array.isArray(rawPath) ? rawPath.join(" ") : rawPath,
    color,
  };
}

const VERIFIED_MARKS: Record<string, BrandMark> = {
  amd: simpleMark(siAmd),
  apple: simpleMark(siApple),
  amazon: fontAwesomeMark(faAmazon, "#111111"),
  broadcom: simpleMark(siBroadcom),
  coinbase: simpleMark(siCoinbase),
  google: simpleMark(siGoogle),
  intel: simpleMark(siIntel),
  meta: simpleMark(siMeta),
  microsoft: fontAwesomeMark(faMicrosoft, "#5e5e5e"),
  netflix: simpleMark(siNetflix),
  nvidia: simpleMark(siNvidia),
  palantir: simpleMark(siPalantir),
  qualcomm: simpleMark(siQualcomm),
  shopify: simpleMark(siShopify),
  tesla: simpleMark(siTesla),
  visa: simpleMark(siVisa),
};

function Mark({ stock, verified }: { stock: StockIdentityData; verified: boolean }) {
  if (!verified) {
    return <span className="stock-logo-monogram" aria-hidden="true">{stock.ticker.slice(0, 2)}</span>;
  }
  const mark = VERIFIED_MARKS[stock.logoKey];
  if (!mark) return null;
  return (
    <svg className="stock-logo-mark" viewBox={mark.viewBox} style={{ color: mark.color }} aria-hidden="true" focusable="false">
      <path fill="currentColor" d={mark.path} />
    </svg>
  );
}

export function StockIdentity({ stock, size = "md", showToken = true, className = "" }: StockIdentityProps) {
  if (!stock) return null;
  const mark = stock.markKind === "verified" ? VERIFIED_MARKS[stock.logoKey] : undefined;
  const verified = Boolean(mark);
  const tokenLabel = `Bitget rToken · ${realityTickerLabel(stock)}`;
  const markLabel = verified
    ? `${stock.companyName} catalogued package-backed brand mark`
    : `${stock.ticker} ticker monogram fallback; no package-backed brand mark is available`;
  const markTitle = verified
    ? `${mark?.title} catalogued package mark · ${mark?.source}`
    : "Fallback ticker monogram. No package-backed brand mark is available for this issuer.";
  return (
    <span className={`stock-identity stock-identity-${size} ${className}`.trim()}>
      <span className={`stock-logo ${verified ? "is-verified" : "is-fallback"}`} role="img" aria-label={markLabel} title={markTitle}>
        <Mark stock={stock} verified={verified} />
      </span>
      <span className="stock-identity-copy">
        <span className="stock-company">{stock.companyName}</span>
        <span className="stock-ticker">{stock.ticker}</span>
        {showToken && <span className="stock-token-meta" title="Bitget's rToken is the tokenized version of the underlying U.S. stock.">{tokenLabel}</span>}
      </span>
    </span>
  );
}

export type { StockIdentityData };
