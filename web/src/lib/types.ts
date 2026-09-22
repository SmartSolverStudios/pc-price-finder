/**
 * Domain model used by the UI. Raw scraper JSON is mapped onto these types in `lib/data/normalize.ts`,
 * so other sources (more shops, Supabase) only need a new mapper, not UI changes.
 */

export type ComponentKey = string;

/** Identifies where an offer/product came from. Only Tweakers exists today. */
export type SourceId = "tweakers" | (string & {});

export type ProductStatus = "VALID" | "MANUAL_CHECK" | "REJECTED";

export type FactValue = string | number | boolean | null;
/** Facts differ per component (e.g. `lengte_mm` for GPUs, `cl` for RAM), so they stay a keyed map. */
export type Facts = Record<string, FactValue>;

export type ShopKind = "retailer" | "marketplace";

export interface Shop {
  name: string;
  kind: ShopKind;
}

export type OfferCondition = "new" | "used";

export interface Offer {
  source: SourceId;
  shop: Shop;
  /** Listed product price in EUR. */
  price: number | null;
  /** Shipping cost in EUR; `null` when the source did not state it. `0` means free. */
  shipping: number | null;
  delivery: string | null;
  /** Direct offer/click-out URL, only when the source provides one. */
  url: string | null;
  condition: OfferCondition;
  /** Source wording for the condition of used offers, e.g. "Lichte gebruikssporen". */
  conditionNote: string | null;
}

export interface QualityInfo {
  /** Positive = bonus, negative = penalty, in EUR. Only used by the scraper for ranking. */
  adjustmentEur: number;
  notes: string[];
  /** Product price minus the adjustment. A ranking value, not something you pay. */
  effectivePrice: number | null;
}

export interface Product {
  id: string;
  component: ComponentKey;
  title: string;
  /** Derived from the title; `null` when it cannot be derived. */
  brand: string | null;
  status: ProductStatus;
  source: SourceId;
  sourceUrl: string;
  foundBy: string | null;
  /** Offer the scraper selected: cheapest new offer at an allowed shop. */
  offer: Offer | null;
  /** Top new offers as reported by the source (may be fewer than `shopCount`). */
  offers: Offer[];
  /** Used / second-hand offers that were cheaper. Never part of any total. */
  usedOffers: Offer[];
  shopCount: number;
  facts: Facts;
  quality: QualityInfo;
  manualChecks: ManualCheck[];
  rejectReasons: RejectReason[];
}

export type RejectCategory =
  | "no_offer"
  | "wrong_category"
  | "title_filter"
  | "does_not_fit"
  | "colour"
  | "spec_mismatch";

export interface RejectReason {
  category: RejectCategory;
  /** Short English label for grouping. */
  label: string;
  /** Original scraper text. */
  raw: string;
}

export interface RejectedProduct {
  component: ComponentKey;
  title: string;
  sourceUrl: string;
  price: number | null;
  reasons: RejectReason[];
  facts: Facts | null;
}

export interface ManualCheck {
  /** What must be verified, e.g. "lengte_mm". */
  subject: string;
  /** Why, e.g. "spec missing on Tweakers". */
  detail: string | null;
  raw: string;
}

export interface ComponentCounts {
  discovered: number;
  valid: number;
  manualCheck: number;
  rejected: number;
}

export type ConfigValue = string | number | boolean | null | ConfigValue[] | { [key: string]: ConfigValue };

export interface ComponentConfig {
  queries: string[];
  titleFilter: string | null;
  /** Remaining requirement parameters from build_config.json, shown as-is. */
  parameters: Record<string, ConfigValue>;
}

export interface ComponentResult {
  key: ComponentKey;
  /** The scraper's pick under the current build configuration. */
  recommended: Product | null;
  alternatives: Product[];
  manualCheckProducts: Product[];
  rejected: RejectedProduct[];
  counts: ComponentCounts;
  config: ComponentConfig | null;
}

export interface DataSourceInfo {
  name: string;
  baseUrl: string;
}

export interface ScraperSummary {
  recommendedCount: number;
  /** Scraper's total: sum of recommended product prices, excluding shipping. */
  buildTotalEur: number | null;
  buildTotalComplete: boolean;
}

export interface BuildResults {
  version: string;
  /** Local scan time as written by the scraper, "YYYY-MM-DD HH:MM:SS" (no timezone). */
  generatedAt: string;
  source: DataSourceInfo;
  components: ComponentResult[];
  /** Physical limits used during validation (from the case specs), e.g. `gpu_mm`. */
  limits: Record<string, number>;
  errors: string[];
  scraperSummary: ScraperSummary | null;
  qualityRules: Record<string, number>;
}

export interface BuildLine {
  component: ComponentKey;
  product: Product | null;
  productPrice: number | null;
  shipping: number | null;
  /** productPrice + shipping; `null` if either is unknown. */
  checkoutEstimate: number | null;
}

export interface SharedShop {
  shop: string;
  components: ComponentKey[];
}

export interface LowerPriceAlternative {
  component: ComponentKey;
  alternative: Product;
  /** Positive amount by which the alternative's product price is lower. */
  lowerByEur: number;
}

export interface BuildSummary {
  lines: BuildLine[];
  componentsTotal: number;
  componentsFound: number;
  productSubtotal: number;
  shippingSubtotal: number;
  /** Components whose recommended offer has unknown shipping. */
  shippingUnknown: ComponentKey[];
  checkoutEstimate: number;
  /** True when every component has a recommendation with a known price and shipping. */
  complete: boolean;
  scraperTotal: number | null;
  /** Shops supplying more than one component; shipping may be combined there. */
  sharedShops: SharedShop[];
  lowerPriceAlternatives: LowerPriceAlternative[];
  usedOfferCount: number;
}

/** Future price history row (Supabase `price_snapshots`). Not persisted yet. */
export interface PriceSnapshot {
  productId: string;
  component: ComponentKey;
  source: SourceId;
  shop: string;
  price: number;
  shipping: number | null;
  /** ISO timestamp of the scrape run. */
  timestamp: string;
  scrapeRunId?: string;
}

export type LoadResult<T> = { ok: true; data: T } | { ok: false; error: string; detail?: string };
