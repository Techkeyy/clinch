export type FeaturedBrandAssetDecision = {
  logoKey: string;
  company: string;
  officialSourceUrl: string;
  assetFilename: string;
  assetType: string;
  usageCondition: string;
  redistributionReferenceUse: string;
  localOutcome: "neutral-fallback";
};

/**
 * The featured issuer list is deliberately conservative. An official asset
 * is not bundled merely because a public download exists: the issuer's terms
 * must also permit this commercial reference-card use.
 */
export const FEATURED_BRAND_ASSET_DECISIONS = [
  {
    logoKey: "nvidia",
    company: "NVIDIA",
    officialSourceUrl: "https://www.nvidia.com/en-sg/about-nvidia/legal-info/logo-brand-usage/",
    assetFilename: "NVIDIA vertical/horizontal logo artwork; no stable public filename",
    assetType: "Official logo artwork shown by the brand-usage resource",
    usageCondition: "NVIDIA requires express written authorization for logo/brand-asset use and warns against implying affiliation or endorsement. Its listed technology/product contexts do not describe CLINCH.",
    redistributionReferenceUse: "Not established for this stock-reference UI; do not bundle without written authorization.",
    localOutcome: "neutral-fallback",
  },
  {
    logoKey: "apple",
    company: "Apple",
    officialSourceUrl: "https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html",
    assetFilename: "Apple logo artwork; not publicly licensed for this use",
    assetType: "Official trademark artwork / license-gated graphic",
    usageCondition: "Apple requires an express written license for Apple logos and graphic symbols. The separate Mac logo artwork is available only under a signed Mac Logo Trademark License Agreement.",
    redistributionReferenceUse: "Not permitted or established for this stock-reference UI; do not bundle without the applicable license.",
    localOutcome: "neutral-fallback",
  },
  {
    logoKey: "tesla",
    company: "Tesla",
    officialSourceUrl: "https://www.tesla.com/tesla-gallery?redirect=no",
    assetFilename: "Tesla Logos gallery artwork; no stable public filename",
    assetType: "Official gallery logo artwork",
    usageCondition: "Tesla provides official logo artwork through its gallery, but the public resource does not establish permission for a commercial third-party stock-identity card.",
    redistributionReferenceUse: "Permission for this redistribution/reference use is not established; do not bundle.",
    localOutcome: "neutral-fallback",
  },
  {
    logoKey: "amazon",
    company: "Amazon",
    officialSourceUrl: "https://affiliate-program.amazon.com/help/operating/amazonmarks/",
    assetFilename: "Available at Amazon logo package; generic Amazon logo is not permitted",
    assetType: "Official affiliate/advertising logo package",
    usageCondition: "Amazon provides an 'available at Amazon' logo for specific advertising contexts and states that the generic Amazon and Amazon Smile marks are not permitted for influencers/publishers.",
    redistributionReferenceUse: "Not applicable to a generic company-identity card; do not bundle the generic mark.",
    localOutcome: "neutral-fallback",
  },
  {
    logoKey: "microsoft",
    company: "Microsoft",
    officialSourceUrl: "https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks",
    assetFilename: "Microsoft corporate logo artwork; license/context restricted",
    assetType: "Official trademark artwork / context-specific asset",
    usageCondition: "Microsoft states that its logos, app icons, and product icons require an express license. The Microsoft sign-in branding assets are scoped to that identity/sign-in context, not a generic stock card.",
    redistributionReferenceUse: "Not established for this stock-reference UI; do not bundle without the applicable license.",
    localOutcome: "neutral-fallback",
  },
  {
    logoKey: "google",
    company: "Alphabet / Google",
    officialSourceUrl: "https://about.google/brand-resource-center/guidance/",
    assetFilename: "No general redistributable corporate-logo filename identified for this use",
    assetType: "Official brand guidance; logo assets are context-specific",
    usageCondition: "Google permits plain-text informational references but restricts logo/icon use where it could imply affiliation, sponsorship, or endorsement unless the specific context and permission allow it.",
    redistributionReferenceUse: "Not established for this commercial stock-reference UI; use text identity only.",
    localOutcome: "neutral-fallback",
  },
  {
    logoKey: "meta",
    company: "Meta Platforms",
    officialSourceUrl: "https://www.meta.com/brand/resources/meta/company-brand/",
    assetFilename: "Meta logo pack; gated by brand guidelines and terms",
    assetType: "Official logo pack / approval-gated brand resource",
    usageCondition: "Meta's company-brand resource gates the logo pack behind acceptance of applicable guidelines/terms and describes approval requirements for marketing/media use.",
    redistributionReferenceUse: "Approval for this use is not established; do not bundle.",
    localOutcome: "neutral-fallback",
  },
  {
    logoKey: "amd",
    company: "AMD",
    officialSourceUrl: "https://www.amd.com/en/legal/terms-and-conditions/media-library.html",
    assetFilename: "AMD mark file from the media library; license-limited",
    assetType: "Official media-library mark",
    usageCondition: "AMD's media-library terms limit permission to advertising, marketing, promotion, or sale of products that include an AMD processor and prohibit implying endorsement or sponsorship. CLINCH is not that product.",
    redistributionReferenceUse: "Not permitted for this stock-reference UI under the stated media-library permission; do not bundle.",
    localOutcome: "neutral-fallback",
  },
] as const satisfies readonly FeaturedBrandAssetDecision[];

export const OFFICIAL_ASSET_FALLBACK_KEYS: ReadonlySet<string> = new Set(
  FEATURED_BRAND_ASSET_DECISIONS.map((decision) => decision.logoKey),
);
