import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Delivery, Price, Shipping } from "@/components/cells";
import { ExternalLink, ExternalLinkButton } from "@/components/external-link";
import { MarketplaceBadge, StatusBadge, UsedBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { checkoutEstimate } from "@/lib/data";
import { factRows, missingFacts } from "@/lib/facts";
import { formatEur, formatSignedEur } from "@/lib/format";
import type { ComponentConfig, ConfigValue, Product, Shop } from "@/lib/types";

function ShopLabel({ shop }: { shop: Shop }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {shop.name}
      {shop.kind === "marketplace" && <MarketplaceBadge />}
    </span>
  );
}

function MarketplaceNote({ shop }: { shop: Shop }) {
  if (shop.kind !== "marketplace") return null;
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      Sold by a third-party seller on {shop.name}. The seller&apos;s name is not included in the source data.
    </p>
  );
}

export function RecommendedCard({ product }: { product: Product }) {
  const o = product.offer;
  const checkout = checkoutEstimate(product);
  const q = product.quality;

  return (
    <Card className="gap-0 py-0">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={product.status} />
              <span className="text-xs text-muted-foreground">Recommended by current build configuration</span>
            </div>
            {product.priceNote && <p className="text-xs text-muted-foreground">{product.priceNote}</p>}
            <h2 className="text-lg font-semibold tracking-tight text-balance sm:text-xl">{product.title}</h2>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {product.brand && <span>Brand: {product.brand}</span>}
              <span>Tweakers ID {product.id}</span>
              {product.foundBy && <span>Found via &ldquo;{product.foundBy}&rdquo;</span>}
            </div>
          </div>

          {o ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Price value={o.price} className="text-3xl font-semibold tracking-tight" />
                <Shipping value={o.shipping} className="text-sm" />
              </div>
              <dl className="grid max-w-md grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Shop</dt>
                <dd>
                  <ShopLabel shop={o.shop} />
                </dd>
                <dt className="text-muted-foreground">Checkout estimate</dt>
                <dd className="tabular">{checkout === null ? "Unknown (shipping unknown)" : formatEur(checkout)}</dd>
                <dt className="text-muted-foreground">Delivery</dt>
                <dd>
                  <Delivery text={o.delivery} />
                </dd>
                <dt className="text-muted-foreground">Offers</dt>
                <dd>
                  {product.shopCount} new offer{product.shopCount === 1 ? "" : "s"} at allowed shops
                </dd>
              </dl>
              <MarketplaceNote shop={o.shop} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Price unavailable — no current offer.</p>
          )}

          <div className="flex flex-wrap gap-2">
            {o?.url && (
              <ExternalLinkButton href={o.url} variant="default">
                View offer at {o.shop.name}
              </ExternalLinkButton>
            )}
            <ExternalLinkButton href={product.sourceUrl}>Open Tweakers</ExternalLinkButton>
          </div>
        </div>

        <div className="space-y-3 border-t bg-muted/20 p-5 lg:border-t-0 lg:border-l">
          <div className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Price vs. ranking value</div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Actual product price</dt>
              <dd className="font-medium">
                <Price value={o?.price ?? null} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Quality adjustment</dt>
              <dd className={q.adjustmentEur > 0 ? "text-success tabular" : q.adjustmentEur < 0 ? "text-destructive tabular" : "tabular"}>
                {q.adjustmentEur === 0 ? "—" : formatSignedEur(q.adjustmentEur)}
              </dd>
            </div>
            <Separator />
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Quality-adjusted</dt>
              <dd className="tabular">
                <Price value={q.effectivePrice} />
              </dd>
            </div>
          </dl>
          {q.notes.length > 0 ? (
            <ul className="space-y-1 text-xs">
              {q.notes.map((n) => (
                <li key={n} className="rounded-md border bg-background/40 px-2 py-1">
                  {n}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No quality adjustment.</p>
          )}
          <p className="text-xs text-muted-foreground">
            The quality-adjusted value is only used by the scraper to rank valid products. You pay the actual price plus
            shipping.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function NoRecommendation({ manualCount }: { manualCount: number }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-2">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <div className="font-medium">No valid product found</div>
          <p className="text-sm text-muted-foreground">
            No discovered product passed every requirement with a current new offer.
            {manualCount > 0 && ` ${manualCount} product${manualCount === 1 ? " needs" : "s need"} a manual check below.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SpecsCard({ product }: { product: Product }) {
  const rows = factRows(product.facts, { includeCategory: true });
  const missing = missingFacts(product.facts);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Technical specifications</CardTitle>
        <CardDescription className="text-xs">Values the scraper verified on the Tweakers spec list.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No specifications recorded.</p>
        ) : (
          <dl className="divide-y rounded-lg border">
            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3 px-3 py-2 text-sm">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {missing.length > 0 && (
          <p className="text-xs text-muted-foreground">Not listed on Tweakers: {missing.join(", ")}.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function PriceComparison({ product }: { product: Product }) {
  const selected = product.offer;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Price comparison</CardTitle>
        <CardDescription className="text-xs">
          New offers at allowed shops for this product ({product.offers.length} of {product.shopCount} listed in the
          scraper output).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {product.offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No offers recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead className="hidden h-auto py-2 text-right leading-tight whitespace-normal sm:table-cell">
                    Product price
                  </TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Shipping</TableHead>
                  <TableHead className="h-auto py-2 text-right leading-tight whitespace-normal">Checkout estimate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.offers.map((o, i) => {
                  const isSelected = selected && o.shop.name === selected.shop.name && o.price === selected.price;
                  const total = o.price !== null && o.shipping !== null ? o.price + o.shipping : null;
                  return (
                    <TableRow key={`${o.shop.name}-${i}`}>
                      <TableCell className="whitespace-normal">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {o.url ? <ExternalLink href={o.url}>{o.shop.name}</ExternalLink> : o.shop.name}
                          {o.shop.kind === "marketplace" && <MarketplaceBadge />}
                          {isSelected && (
                            <Badge variant="outline" className="gap-1 border-brand/30 font-normal text-brand">
                              <CircleCheck />
                              Selected
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                          <Price value={o.price} /> + <Shipping value={o.shipping} />
                        </div>
                        {o.delivery && <div className="mt-0.5 text-xs text-muted-foreground">{o.delivery}</div>}
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        <Price value={o.price} />
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        <Shipping value={o.shipping} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {total === null ? <span className="text-xs text-muted-foreground">Unknown</span> : formatEur(total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Checkout estimate = product price + shipping. The scraper selects by product price; only the selected offer
          has a direct link.
        </p>
      </CardContent>
    </Card>
  );
}

export function UsedOffers({ product }: { product: Product }) {
  if (product.usedOffers.length === 0) return null;
  return (
    <Card className="ring-warning/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          Second-hand / used offers <UsedBadge />
        </CardTitle>
        <CardDescription className="text-xs">
          Cheaper than the selected new offer, but used. Never recommended and never included in any total.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-lg border">
          {product.usedOffers.map((o, i) => (
            <li key={`${o.shop.name}-${i}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <UsedBadge />
                <ShopLabel shop={o.shop} />
              </span>
              <span className="flex items-center gap-3">
                {o.conditionNote && (
                  <span className="text-xs text-muted-foreground" lang="nl">
                    {o.conditionNote}
                  </span>
                )}
                <Price value={o.price} className="font-medium" />
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ManualChecks({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-muted-foreground">
        <CircleCheck className="size-4 text-success" aria-hidden />
        All discovered products were automatically verified.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-warning/30">
      <div className="flex items-center gap-2 border-b border-warning/20 bg-warning/5 px-4 py-3 text-sm font-medium text-warning">
        <TriangleAlert className="size-4" aria-hidden />
        Manual checks required ({products.length})
      </div>
      <ul className="divide-y">
        {products.map((p) => (
          <li key={p.id} className="grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_8rem] sm:gap-4">
            <div className="min-w-0 space-y-1">
              <ExternalLink href={p.sourceUrl} className="font-medium">
                {p.title}
              </ExternalLink>
              <ul className="space-y-0.5 text-xs">
                {p.manualChecks.map((m) => (
                  <li key={m.raw}>
                    <span className="text-foreground/90">{m.subject}</span>
                    {m.detail && <span className="text-muted-foreground"> — {m.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="sm:text-right">
              <Price value={p.offer?.price ?? null} />
              {p.offer && <div className="text-xs text-muted-foreground">{p.offer.shop.name}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatConfigValue(v: ConfigValue): string {
  if (v === null) return "—";
  if (Array.isArray(v)) return v.map(formatConfigValue).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

export function ConfigCard({ config, limits }: { config: ComponentConfig | null; limits: [string, number][] }) {
  if (!config && limits.length === 0) return null;
  const params = Object.entries(config?.parameters ?? {});
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Build configuration</CardTitle>
        <CardDescription className="text-xs">From build_config.json and the scan&apos;s limits. Read-only.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {(params.length > 0 || limits.length > 0) && (
          <dl className="divide-y rounded-lg border">
            {params.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3 px-3 py-2">
                <dt className="font-mono text-xs text-muted-foreground">{k}</dt>
                <dd className="tabular">{formatConfigValue(v)}</dd>
              </div>
            ))}
            {limits.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3 px-3 py-2">
                <dt className="font-mono text-xs text-muted-foreground">{k}</dt>
                <dd className="tabular">{v} mm</dd>
              </div>
            ))}
          </dl>
        )}
        {config && config.queries.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">
              Search queries ({config.queries.length})
              {config.titleFilter && (
                <>
                  {" "}
                  · title filter <code className="font-mono text-foreground/80">{config.titleFilter}</code>
                </>
              )}
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {config.queries.map((q) => (
                <li key={q} className="rounded-md border bg-muted/30 px-1.5 py-0.5 text-xs">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
