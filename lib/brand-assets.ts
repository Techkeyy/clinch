export type FeaturedBrandAssetAttribution = {
  logoKey: string;
  company: string;
  packageName: "Simple Icons" | "Font Awesome Free Brands";
  packageSourceUrl: string;
  assetFilename: string;
  assetType: string;
  upstreamBrandOwner: string;
  packageLicense: string;
  usageCondition: string;
  redistributionReferenceUse: string;
  localOutcome: "package-backed";
};

const SIMPLE_ICONS_SOURCE = "https://github.com/simple-icons/simple-icons";
const FONT_AWESOME_SOURCE = "https://github.com/FortAwesome/Font-Awesome";

/**
 * These are package-backed brand reference marks, not issuer-provided assets.
 * Company name and ticker remain the authoritative stock identity.
 */
export const FEATURED_BRAND_ASSET_DECISIONS = [
  {
    logoKey: "nvidia",
    company: "NVIDIA",
    packageName: "Simple Icons",
    packageSourceUrl: SIMPLE_ICONS_SOURCE,
    assetFilename: "simple-icons/icons/nvidia.svg (package export: siNvidia)",
    assetType: "Package-backed SVG path data",
    upstreamBrandOwner: "NVIDIA Corporation",
    packageLicense: "Simple Icons package: CC0 1.0; trademark rights remain with NVIDIA.",
    usageCondition: "Use only as a catalogued brand reference beside the plain-text company name and ticker; no affiliation or endorsement is implied.",
    redistributionReferenceUse: "The package path data is locally bundled under the package license; upstream trademark rights and usage limits remain with NVIDIA.",
    localOutcome: "package-backed",
  },
  {
    logoKey: "apple",
    company: "Apple",
    packageName: "Simple Icons",
    packageSourceUrl: SIMPLE_ICONS_SOURCE,
    assetFilename: "simple-icons/icons/apple.svg (package export: siApple)",
    assetType: "Package-backed SVG path data",
    upstreamBrandOwner: "Apple Inc.",
    packageLicense: "Simple Icons package: CC0 1.0; trademark rights remain with Apple.",
    usageCondition: "Use only as a catalogued brand reference beside the plain-text company name and ticker; no affiliation or endorsement is implied.",
    redistributionReferenceUse: "The package path data is locally bundled under the package license; upstream trademark rights and usage limits remain with Apple.",
    localOutcome: "package-backed",
  },
  {
    logoKey: "tesla",
    company: "Tesla",
    packageName: "Simple Icons",
    packageSourceUrl: SIMPLE_ICONS_SOURCE,
    assetFilename: "simple-icons/icons/tesla.svg (package export: siTesla)",
    assetType: "Package-backed SVG path data",
    upstreamBrandOwner: "Tesla, Inc.",
    packageLicense: "Simple Icons package: CC0 1.0; trademark rights remain with Tesla.",
    usageCondition: "Use only as a catalogued brand reference beside the plain-text company name and ticker; no affiliation or endorsement is implied.",
    redistributionReferenceUse: "The package path data is locally bundled under the package license; upstream trademark rights and usage limits remain with Tesla.",
    localOutcome: "package-backed",
  },
  {
    logoKey: "amazon",
    company: "Amazon",
    packageName: "Font Awesome Free Brands",
    packageSourceUrl: FONT_AWESOME_SOURCE,
    assetFilename: "@fortawesome/free-brands-svg-icons/faAmazon.js (export: faAmazon)",
    assetType: "Package-backed SVG path data",
    upstreamBrandOwner: "Amazon.com, Inc.",
    packageLicense: "Font Awesome Free icon data: CC BY 4.0; package code: MIT.",
    usageCondition: "Use only as a catalogued brand reference beside the plain-text company name and ticker; no affiliation or endorsement is implied.",
    redistributionReferenceUse: "The path data is locally bundled under Font Awesome Free licensing with package attribution; upstream trademark rights and usage limits remain with Amazon.",
    localOutcome: "package-backed",
  },
  {
    logoKey: "microsoft",
    company: "Microsoft",
    packageName: "Font Awesome Free Brands",
    packageSourceUrl: FONT_AWESOME_SOURCE,
    assetFilename: "@fortawesome/free-brands-svg-icons/faMicrosoft.js (export: faMicrosoft)",
    assetType: "Package-backed SVG path data",
    upstreamBrandOwner: "Microsoft Corporation",
    packageLicense: "Font Awesome Free icon data: CC BY 4.0; package code: MIT.",
    usageCondition: "Use only as a catalogued brand reference beside the plain-text company name and ticker; no affiliation or endorsement is implied.",
    redistributionReferenceUse: "The path data is locally bundled under Font Awesome Free licensing with package attribution; upstream trademark rights and usage limits remain with Microsoft.",
    localOutcome: "package-backed",
  },
  {
    logoKey: "google",
    company: "Alphabet / Google",
    packageName: "Simple Icons",
    packageSourceUrl: SIMPLE_ICONS_SOURCE,
    assetFilename: "simple-icons/icons/google.svg (package export: siGoogle)",
    assetType: "Package-backed SVG path data",
    upstreamBrandOwner: "Google LLC / Alphabet Inc.",
    packageLicense: "Simple Icons package: CC0 1.0; trademark rights remain with Google and Alphabet.",
    usageCondition: "Use only as a catalogued brand reference beside the plain-text company name and ticker; no affiliation or endorsement is implied.",
    redistributionReferenceUse: "The package path data is locally bundled under the package license; upstream trademark rights and usage limits remain with Google and Alphabet.",
    localOutcome: "package-backed",
  },
  {
    logoKey: "meta",
    company: "Meta Platforms",
    packageName: "Simple Icons",
    packageSourceUrl: SIMPLE_ICONS_SOURCE,
    assetFilename: "simple-icons/icons/meta.svg (package export: siMeta)",
    assetType: "Package-backed SVG path data",
    upstreamBrandOwner: "Meta Platforms, Inc.",
    packageLicense: "Simple Icons package: CC0 1.0; trademark rights remain with Meta.",
    usageCondition: "Use only as a catalogued brand reference beside the plain-text company name and ticker; no affiliation or endorsement is implied.",
    redistributionReferenceUse: "The package path data is locally bundled under the package license; upstream trademark rights and usage limits remain with Meta.",
    localOutcome: "package-backed",
  },
  {
    logoKey: "amd",
    company: "AMD",
    packageName: "Simple Icons",
    packageSourceUrl: SIMPLE_ICONS_SOURCE,
    assetFilename: "simple-icons/icons/amd.svg (package export: siAmd)",
    assetType: "Package-backed SVG path data",
    upstreamBrandOwner: "Advanced Micro Devices, Inc.",
    packageLicense: "Simple Icons package: CC0 1.0; trademark rights remain with AMD.",
    usageCondition: "Use only as a catalogued brand reference beside the plain-text company name and ticker; no affiliation or endorsement is implied.",
    redistributionReferenceUse: "The package path data is locally bundled under the package license; upstream trademark rights and usage limits remain with AMD.",
    localOutcome: "package-backed",
  },
] as const satisfies readonly FeaturedBrandAssetAttribution[];

export const FEATURED_BRAND_MARK_KEYS: ReadonlySet<string> = new Set(
  FEATURED_BRAND_ASSET_DECISIONS.map((decision) => decision.logoKey),
);
