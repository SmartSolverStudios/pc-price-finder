"use client";

import { useMemo, useState } from "react";
import { Delivery, Price, QualityAdjustment, Shipping } from "@/components/cells";
import { Badge } from "@/components/ui/badge";
import { ExternalLinkButton } from "@/components/external-link";
import { MarketplaceBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { factRows } from "@/lib/facts";
import { formatEur } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type AltSort = "effective" | "price" | "difference";

const SORT_LABELS: Record<AltSort, string> = {
  effective: "Quality-adjusted price",
  price: "Product price",
  difference: "Checkout difference",
};

function checkout(p: Product): number | null {
  const o = p.offer;
  return o && o.price !== null && o.shipping !== null ? o.price + o.shipping : null;
}

function Difference({ value, basis }: { value: number | null; basis: string }) {
  if (value === null) return <span className="text-xs text-muted-foreground">Difference unknown</span>;
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return <span className="text-xs text-muted-foreground">Same {basis} as recommendation</span>;
  return (
    <span className={cn("text-xs tabular", rounded < 0 ? "text-success" : "text-muted-foreground")}>
      {formatEur(Math.abs(rounded))} {rounded < 0 ? "less" : "more"} {basis}
    </span>
  );
}

export function AlternativesList({ recommended, alternatives }: { recommended: Product | null; alternatives: Product[] }) {
  const [sort, setSort] = useState<AltSort>("effective");
  const recPrice = recommended?.offer?.price ?? null;
  const recCheckout = recommended ? checkout(recommended) : null;

  const sorted = useMemo(() => {
    const key = (p: Product): number | null => {
      if (sort === "price") return p.offer?.price ?? null;
      if (sort === "difference") {
        const c = checkout(p);
        return c !== null && recCheckout !== null ? c - recCheckout : null;
      }
      return p.quality.effectivePrice;
    };
    return [...alternatives].sort((a, b) => {
      const va = key(a);
      const vb = key(b);
      if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
      return va - vb || (a.offer?.price ?? 0) - (b.offer?.price ?? 0);
    });
  }, [alternatives, sort, recCheckout]);

  if (alternatives.length === 0) {
    return <p className="text-sm text-muted-foreground">No other valid products were found for this component.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {alternatives.length} valid alternative{alternatives.length === 1 ? "" : "s"} from the scraper output.
        </p>
        <Select value={sort} onValueChange={(v) => setSort(v as AltSort)}>
          <SelectTrigger size="sm" className="w-52" aria-label="Sort alternatives">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as AltSort[]).map((k) => (
              <SelectItem key={k} value={k}>
                Sort: {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ul className="divide-y rounded-xl border">
        {sorted.map((p, i) => {
          const o = p.offer;
          const specs = factRows(p.facts);
          const c = checkout(p);
          return (
            <li key={`${p.id}-${o?.price ?? "none"}-${i}`} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0 space-y-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{p.title}</div>
                    {p.priceNote && (
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        Less favorable
                      </Badge>
                    )}
                  </div>
                  {p.priceNote && <p className="mt-1 text-xs text-muted-foreground">{p.priceNote}</p>}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {p.brand && <span>{p.brand}</span>}
                    {o && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="text-foreground/80">{o.shop.name}</span>
                        {o.shop.kind === "marketplace" && <MarketplaceBadge />}
                      </>
                    )}
                    <span aria-hidden>·</span>
                    <span>
                      {p.shopCount} shop{p.shopCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                {specs.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {specs.map((s) => (
                      <li key={s.key} className="rounded-md border bg-muted/30 px-1.5 py-0.5 text-xs">
                        <span className="text-muted-foreground">{s.label}</span> {s.value}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Quality adjustment</span>
                    <QualityAdjustment value={p.quality.adjustmentEur} notes={p.quality.notes} />
                  </span>
                  {p.quality.notes.length > 0 && <span className="text-muted-foreground">{p.quality.notes.join(" · ")}</span>}
                </div>
                {o && <Delivery text={o.delivery} className="text-xs text-muted-foreground" />}
              </div>

              <div className="flex flex-col gap-2 md:items-end md:text-right">
                <div className="flex items-baseline gap-2 md:flex-col md:items-end md:gap-0.5">
                  <Price value={o?.price ?? null} className="text-base font-semibold" />
                  <Shipping value={o?.shipping ?? null} className="text-xs" />
                </div>
                <div className="flex flex-col gap-0.5 md:items-end">
                  <Difference
                    value={o?.price != null && recPrice !== null ? o.price - recPrice : null}
                    basis="product price"
                  />
                  <Difference value={c !== null && recCheckout !== null ? c - recCheckout : null} basis="at checkout" />
                  <span className="text-xs text-muted-foreground">
                    Quality-adjusted <Price value={p.quality.effectivePrice} />
                  </span>
                </div>
                <div className="flex gap-2">
                  {o?.url && (
                    <ExternalLinkButton href={o.url} size="xs" variant="secondary">
                      View offer
                    </ExternalLinkButton>
                  )}
                  <ExternalLinkButton href={p.sourceUrl} size="xs">
                    Tweakers
                  </ExternalLinkButton>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
