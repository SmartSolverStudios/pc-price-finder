import type {
  BuildResults,
  ComponentConfig,
  ComponentResult,
  ConfigValue,
  ManualCheck,
  Offer,
  Product,
  RejectCategory,
  RejectedProduct,
  RejectReason,
  Shop,
  SourceId,
} from "@/lib/types";
import type { RawConfig, RawProduct, RawRejected, RawResults } from "./schema";

const SOURCE: SourceId = "tweakers";

/** Shop names that denote a third-party seller platform rather than the retailer itself. */
const MARKETPLACE_PATTERNS = [/marketplace/i, /\bplaza\b/i];

export function toShop(name: string | null): Shop {
  const shopName = name?.trim() || "Unknown shop";
  return {
    name: shopName,
    kind: MARKETPLACE_PATTERNS.some((p) => p.test(shopName)) ? "marketplace" : "retailer",
  };
}

/** Brands whose name spans more than one word in product titles. */
const MULTI_WORD_BRANDS = [
  "be quiet!",
  "Team Group",
  "Cooler Master",
  "SK hynix",
  "Western Digital",
  "Silicon Power",
  "Fractal Design",
  "Lian Li",
];

export function deriveBrand(title: string): string | null {
  const t = title.trim();
  const multi = MULTI_WORD_BRANDS.find((b) => t.toLowerCase().startsWith(b.toLowerCase() + " "));
  if (multi) return t.slice(0, multi.length);
  const first = t.split(/\s+/)[0];
  return first && /[a-z]/i.test(first) ? first : null;
}

const REJECT_RULES: { test: RegExp; category: RejectCategory; label: (raw: string) => string }[] = [
  { test: /^geen actuele aanbieding/i, category: "no_offer", label: () => "No current offer" },
  {
    test: /^verkeerde categorie/i,
    category: "wrong_category",
    label: (raw) => {
      const found = raw.match(/verkeerde categorie:\s*([^()]+?)\s*(\(|$)/i)?.[1];
      return found && found !== "None" ? `Wrong category: ${found}` : "Wrong category";
    },
  },
  { test: /^titel past niet/i, category: "title_filter", label: () => "Title did not match search filter" },
  { test: /te (lang|hoog)/i, category: "does_not_fit", label: () => "Does not fit the case" },
  { test: /(kleur|frame) niet/i, category: "colour", label: () => "Wrong colour" },
];

export function toRejectReason(raw: string): RejectReason {
  const rule = REJECT_RULES.find((r) => r.test.test(raw));
  return rule
    ? { category: rule.category, label: rule.label(raw), raw }
    : { category: "spec_mismatch", label: "Specification mismatch", raw };
}

/** Parses "controleer: lengte_mm (spec ontbreekt op Tweakers)". */
export function toManualCheck(raw: string): ManualCheck {
  const m = raw.match(/^controleer:\s*(.+?)\s*(?:\((.+)\))?$/i);
  if (!m) return { subject: raw, detail: null, raw };
  const detail = m[2]?.match(/spec ontbreekt/i) ? "Specification missing on Tweakers" : (m[2] ?? null);
  return { subject: m[1], detail, raw };
}

function toProduct(component: string, raw: RawProduct): Product {
  const shop = toShop(raw.shop);
  const offer: Offer | null =
    raw.price !== null
      ? {
          source: SOURCE,
          shop,
          price: raw.price,
          shipping: raw.shipping,
          delivery: raw.delivery,
          url: raw.shop_url,
          condition: "new",
          conditionNote: null,
        }
      : null;

  const offers: Offer[] = raw.top_offers.map((o) => ({
    source: SOURCE,
    shop: toShop(o.shop),
    price: o.price,
    shipping: o.shipping,
    delivery: o.delivery,
    // Only the selected offer carries a click-out URL in the v5 output.
    url: offer && o.shop === raw.shop && o.price === raw.price ? offer.url : null,
    condition: "new",
    conditionNote: null,
  }));

  return {
    id: raw.product_id,
    component,
    title: raw.title,
    brand: deriveBrand(raw.title),
    status: raw.status,
    source: SOURCE,
    sourceUrl: raw.url,
    foundBy: raw.found_by,
    offer,
    offers,
    usedOffers: raw.cheaper_secondhand.map((o) => ({
      source: SOURCE,
      shop: toShop(o.shop),
      price: o.price,
      shipping: null,
      delivery: null,
      url: null,
      condition: "used",
      conditionNote: o.condition,
    })),
    shopCount: raw.shop_count,
    facts: raw.facts,
    quality: {
      adjustmentEur: raw.quality_bonus_eur,
      notes: raw.quality_notes,
      effectivePrice: raw.effective_price,
    },
    manualChecks: raw.manual_checks.map(toManualCheck),
    rejectReasons: raw.reject_reasons.map(toRejectReason),
    priceNote: raw.price_note,
  };
}

function toRejected(component: string, raw: RawRejected): RejectedProduct {
  return {
    component,
    title: raw.title,
    sourceUrl: raw.url,
    price: raw.price,
    reasons: raw.reject_reasons.map(toRejectReason),
    facts: raw.facts,
  };
}

function toConfig(raw: Record<string, unknown> | undefined): ComponentConfig | null {
  if (!raw) return null;
  const { queries, title_filter, comment, ...rest } = raw;
  void comment;
  return {
    queries: Array.isArray(queries) ? queries.filter((q): q is string => typeof q === "string") : [],
    titleFilter: typeof title_filter === "string" ? title_filter : null,
    parameters: rest as Record<string, ConfigValue>,
  };
}

export function normalizeResults(raw: RawResults, config: RawConfig | null): BuildResults {
  const components: ComponentResult[] = Object.entries(raw.components).map(([key, c]) => ({
    key,
    recommended: c.recommended ? toProduct(key, c.recommended) : null,
    alternatives: c.alternatives.map((p) => toProduct(key, p)),
    manualCheckProducts: c.needs_manual_check.map((p) => toProduct(key, p)),
    rejected: c.rejected.map((r) => toRejected(key, r)),
    counts: c.counts
      ? {
          discovered: c.counts.discovered,
          valid: c.counts.valid,
          manualCheck: c.counts.manual_check,
          rejected: c.counts.rejected,
        }
      : {
          discovered: (c.recommended ? 1 : 0) + c.alternatives.length + c.needs_manual_check.length + c.rejected.length,
          valid: (c.recommended ? 1 : 0) + c.alternatives.length,
          manualCheck: c.needs_manual_check.length,
          rejected: c.rejected.length,
        },
    config: toConfig(config?.build[key]),
  }));

  const qualityRules = Object.fromEntries(
    Object.entries(config?.quality_bonus_eur ?? {}).filter((e): e is [string, number] => typeof e[1] === "number"),
  );

  return {
    version: raw.version,
    generatedAt: raw.generated_at,
    source: { name: raw.source.name, baseUrl: raw.source.base_url },
    components,
    limits: raw.limits,
    errors: raw.errors,
    scraperSummary: raw.summary
      ? {
          recommendedCount: raw.summary.recommended_count,
          buildTotalEur: raw.summary.build_total_eur,
          buildTotalComplete: raw.summary.build_total_complete,
        }
      : null,
    qualityRules,
  };
}
