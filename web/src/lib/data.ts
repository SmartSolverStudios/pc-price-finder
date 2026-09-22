import { cache } from "react";
import type {
  BuildResults,
  BuildSummary,
  ComponentKey,
  ComponentResult,
  LoadResult,
  LowerPriceAlternative,
  Product,
} from "@/lib/types";
import { DataLoadError, getDataSource } from "@/lib/data/sources";

/** Single entry point for build data. Pages and components never read results.json directly. */
export const getBuildResults = cache(async (): Promise<LoadResult<BuildResults>> => {
  try {
    return { ok: true, data: await getDataSource().load() };
  } catch (e) {
    if (e instanceof DataLoadError) return { ok: false, error: e.message, detail: e.detail };
    return { ok: false, error: "Unexpected error while loading build data.", detail: String(e) };
  }
});

export async function getAllComponents(): Promise<LoadResult<ComponentResult[]>> {
  const res = await getBuildResults();
  return res.ok ? { ok: true, data: res.data.components } : res;
}

export async function getComponentResult(key: ComponentKey): Promise<LoadResult<ComponentResult | null>> {
  const res = await getBuildResults();
  return res.ok ? { ok: true, data: res.data.components.find((c) => c.key === key) ?? null } : res;
}

export async function getBuildSummary(): Promise<LoadResult<BuildSummary>> {
  const res = await getBuildResults();
  return res.ok ? { ok: true, data: summarizeBuild(res.data) } : res;
}

export function checkoutEstimate(product: Product | null): number | null {
  const offer = product?.offer;
  if (!offer || offer.price === null || offer.shipping === null) return null;
  return round2(offer.price + offer.shipping);
}

export function summarizeBuild(results: BuildResults): BuildSummary {
  const lines = results.components.map((c) => {
    const product = c.recommended;
    return {
      component: c.key,
      product,
      productPrice: product?.offer?.price ?? null,
      shipping: product?.offer?.shipping ?? null,
      checkoutEstimate: checkoutEstimate(product),
    };
  });

  const productSubtotal = round2(lines.reduce((s, l) => s + (l.productPrice ?? 0), 0));
  const shippingSubtotal = round2(lines.reduce((s, l) => s + (l.shipping ?? 0), 0));
  const shippingUnknown = lines.filter((l) => l.product && l.shipping === null).map((l) => l.component);
  const componentsFound = lines.filter((l) => l.productPrice !== null).length;

  const byShop = new Map<string, ComponentKey[]>();
  for (const l of lines) {
    const shop = l.product?.offer?.shop.name;
    if (shop) byShop.set(shop, [...(byShop.get(shop) ?? []), l.component]);
  }

  const lowerPriceAlternatives: LowerPriceAlternative[] = [];
  for (const c of results.components) {
    const recPrice = c.recommended?.offer?.price;
    if (recPrice == null) continue;
    const cheapest = c.alternatives
      .filter((a) => a.offer?.price != null && a.offer.price < recPrice)
      .sort((a, b) => a.offer!.price! - b.offer!.price!)[0];
    if (cheapest) {
      lowerPriceAlternatives.push({
        component: c.key,
        alternative: cheapest,
        lowerByEur: round2(recPrice - cheapest.offer!.price!),
      });
    }
  }

  return {
    lines,
    componentsTotal: lines.length,
    componentsFound,
    productSubtotal,
    shippingSubtotal,
    shippingUnknown,
    checkoutEstimate: round2(productSubtotal + shippingSubtotal),
    complete: componentsFound === lines.length && shippingUnknown.length === 0,
    scraperTotal: results.scraperSummary?.buildTotalEur ?? null,
    sharedShops: [...byShop.entries()]
      .filter(([, comps]) => comps.length > 1)
      .map(([shop, components]) => ({ shop, components })),
    lowerPriceAlternatives,
    usedOfferCount: results.components.reduce((n, c) => n + (c.recommended?.usedOffers.length ?? 0), 0),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
