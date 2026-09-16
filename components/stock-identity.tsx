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

function simpleMark(icon: typeof siBroadcom): BrandMark {
  return {
    title: icon.title,
    source: "Simple Icons · " + (icon.source ?? "catalogued brand source"),
    viewBox: "0 0 24 24",
    path: icon.path,
    color: "#" + icon.hex,
  };
}

function fontAwesomeMark(icon: typeof faAmazon): BrandMark {
  const [width, height, , , pathData] = icon.icon;
  return {
    title: icon.iconName,
    source: "Font Awesome Free Brands package",
    viewBox: "0 0 " + width + " " + height,
    path: Array.isArray(pathData) ? pathData.join(" ") : pathData,
    color: "currentColor",
  };
}

const CATALOGUED_MARKS: Record<string, BrandMark> = {
  nvidia: simpleMark(siNvidia),
  apple: simpleMark(siApple),
  tesla: simpleMark(siTesla),
  amazon: fontAwesomeMark(faAmazon),
  microsoft: fontAwesomeMark(faMicrosoft),
  google: simpleMark(siGoogle),
  meta: simpleMark(siMeta),
  amd: simpleMark(siAmd),
  broadcom: simpleMark(siBroadcom),
  coinbase: simpleMark(siCoinbase),
  intel: simpleMark(siIntel),
  netflix: simpleMark(siNetflix),
  palantir: simpleMark(siPalantir),
  qualcomm: simpleMark(siQualcomm),
  shopify: simpleMark(siShopify),
  visa: simpleMark(siVisa),
};

export function resolveCataloguedMark(logoKey: string): BrandMark | undefined {
  return CATALOGUED_MARKS[logoKey];
}

function Mark({ stock, mark }: { stock: StockIdentityData; mark: BrandMark | undefined }) {
  if (!mark) {
    return <span className="stock-logo-monogram" aria-hidden="true">{stock.ticker.slice(0, 2)}</span>;
  }
  return (
    <svg className="stock-logo-mark" viewBox={mark.viewBox} style={{ color: mark.color }} aria-hidden="true" focusable="false">
      <path fill="currentColor" d={mark.path} />
    </svg>
  );
}

export function StockIdentity({ stock, size = "md", showToken = true, className = "" }: StockIdentityProps) {
  if (!stock) return null;
  const mark = stock.markKind === "catalogued" ? resolveCataloguedMark(stock.logoKey) : undefined;
  const catalogued = mark !== undefined;
  const tokenLabel = "Bitget rToken · " + realityTickerLabel(stock);
  const fallbackReason = "No catalogued package-backed mark is available for this issuer.";
  const markLabel = mark
    ? stock.companyName + " catalogued package-backed brand mark"
    : stock.companyName + " " + stock.ticker + " neutral ticker fallback";
  const markTitle = mark
    ? mark.title + " catalogued package mark · " + mark.source
    : "Neutral ticker monogram. " + fallbackReason;
  return (
    <span className={["stock-identity", "stock-identity-" + size, className].filter(Boolean).join(" ")}>
      <span className={"stock-logo " + (catalogued ? "is-catalogued" : "is-fallback")} role="img" aria-label={markLabel} title={markTitle}>
        <Mark stock={stock} mark={mark} />
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
