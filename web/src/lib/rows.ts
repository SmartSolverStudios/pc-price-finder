import type { DisplayStatus } from "@/components/status-badge";
import { componentLabel } from "@/lib/components-meta";
import type { ComponentResult, Product, ShopKind } from "@/lib/types";

/** Flat, serializable row for client-side tables (dashboard + product explorer). */
export interface ProductRow {
  id: string;
  component: string;
  componentLabel: string;
  /** "recommended" | "alternative" | "manual" | "rejected" */
  role: "recommended" | "alternative" | "manual" | "rejected";
  title: string | null;
  brand: string | null;
  shop: string | null;
  shopKind: ShopKind | null;
  price: number | null;
  shipping: number | null;
  checkout: number | null;
  effectivePrice: number | null;
  adjustment: number;
  qualityNotes: string[];
  status: DisplayStatus;
  sourceUrl: string | null;
  shopUrl: string | null;
  delivery: string | null;
  usedOffers: number;
  reason: string | null;
}

function fromProduct(p: Product, role: ProductRow["role"]): ProductRow {
  const o = p.offer;
  return {
    id: `${p.component}:${role}:${p.id}:${o?.price ?? "none"}:${o?.shop.name ?? ""}`,
    component: p.component,
    componentLabel: componentLabel(p.component),
    role,
    title: p.title,
    brand: p.brand,
    shop: o?.shop.name ?? null,
    shopKind: o?.shop.kind ?? null,
    price: o?.price ?? null,
    shipping: o?.shipping ?? null,
    checkout: o && o.price !== null && o.shipping !== null ? Math.round((o.price + o.shipping) * 100) / 100 : null,
    effectivePrice: p.quality.effectivePrice,
    adjustment: p.quality.adjustmentEur,
    qualityNotes: p.quality.notes,
    status: p.status,
    sourceUrl: p.sourceUrl,
    shopUrl: o?.url ?? null,
    delivery: o?.delivery ?? null,
    usedOffers: p.usedOffers.length,
    reason: p.manualChecks[0] ? p.manualChecks.map((m) => m.subject).join(", ") : null,
  };
}

/** One row per component: its recommendation, or a placeholder when nothing was valid. */
export function recommendationRows(components: ComponentResult[]): ProductRow[] {
  return components.map((c) => {
    if (c.recommended) return fromProduct(c.recommended, "recommended");
    return {
      id: `${c.key}:none`,
      component: c.key,
      componentLabel: componentLabel(c.key),
      role: "recommended",
      title: null,
      brand: null,
      shop: null,
      shopKind: null,
      price: null,
      shipping: null,
      checkout: null,
      effectivePrice: null,
      adjustment: 0,
      qualityNotes: [],
      status: c.manualCheckProducts.length > 0 ? "MANUAL_CHECK" : "NO_MATCH",
      sourceUrl: null,
      shopUrl: null,
      delivery: null,
      usedOffers: 0,
      reason: c.manualCheckProducts.length > 0 ? `${c.manualCheckProducts.length} products need a manual check` : null,
    };
  });
}

/** Every product the scraper discovered, across all components. */
export function allProductRows(components: ComponentResult[]): ProductRow[] {
  return components.flatMap((c) => [
    ...(c.recommended ? [fromProduct(c.recommended, "recommended")] : []),
    ...c.alternatives.map((p) => fromProduct(p, "alternative")),
    ...c.manualCheckProducts.map((p) => fromProduct(p, "manual")),
    ...c.rejected.map<ProductRow>((r, i) => ({
      id: `${c.key}:rejected:${i}:${r.sourceUrl}`,
      component: c.key,
      componentLabel: componentLabel(c.key),
      role: "rejected",
      title: r.title,
      brand: null,
      shop: null,
      shopKind: null,
      price: r.price,
      shipping: null,
      checkout: null,
      effectivePrice: null,
      adjustment: 0,
      qualityNotes: [],
      status: "REJECTED",
      sourceUrl: r.sourceUrl,
      shopUrl: null,
      delivery: null,
      usedOffers: 0,
      reason: r.reasons.map((x) => x.label).join(", ") || null,
    })),
  ]);
}
