import type { Metadata } from "next";
import Link from "next/link";
import { BuildNotes } from "@/components/build-notes";
import { Price, Shipping } from "@/components/cells";
import { ComponentIconTile } from "@/components/component-icon";
import { BreakdownChart } from "@/components/dashboard/breakdown-chart";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { ScraperErrors } from "@/components/scraper-errors";
import { MarketplaceBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { componentLabel, componentShortLabel, QUALITY_RULE_LABELS } from "@/lib/components-meta";
import { getBuildResults, summarizeBuild } from "@/lib/data";
import { formatEur, formatScanTime } from "@/lib/format";
import type { BuildLine } from "@/lib/types";

export const metadata: Metadata = { title: "Build" };

function Checkout({ line }: { line: BuildLine }) {
  if (!line.product) return <span className="text-xs text-muted-foreground">No valid product</span>;
  if (line.checkoutEstimate === null) {
    return <span className="text-xs text-muted-foreground">{line.productPrice === null ? "Price unavailable" : "Shipping unknown"}</span>;
  }
  return <span className="font-medium tabular">{formatEur(line.checkoutEstimate)}</span>;
}

export default async function BuildPage() {
  const res = await getBuildResults();
  if (!res.ok) return <ErrorState detail={[res.error, res.detail].filter(Boolean).join("\n")} />;

  const results = res.data;
  const s = summarizeBuild(results);
  const scan = formatScanTime(results.generatedAt);
  const matchesScraper = s.scraperTotal !== null && Math.abs(s.scraperTotal - s.productSubtotal) < 0.01;
  const qualityRules = Object.entries(results.qualityRules);

  const totals = [
    { label: "Product subtotal", value: s.productSubtotal, strong: false },
    { label: "Shipping subtotal", value: s.shippingSubtotal, strong: false },
    { label: "Estimated checkout total", value: s.checkoutEstimate, strong: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Build"
        title="Build summary"
        description={`${s.componentsFound} / ${s.componentsTotal} components · ${results.source.name} · scan ${scan.full}`}
      />
      <ScraperErrors errors={results.errors} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Checkout estimate per component</CardTitle>
            <CardDescription className="text-xs">
              Product price + shipping of the recommended new offer. Quality adjustments are not part of these totals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Product · shop</TableHead>
                    <TableHead className="text-right">Product price</TableHead>
                    <TableHead className="text-right">Shipping</TableHead>
                    <TableHead className="text-right">Checkout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.lines.map((l) => (
                    <TableRow key={l.component}>
                      <TableCell>
                        <Link href={`/components/${l.component}`} className="flex items-center gap-2 hover:underline">
                          <ComponentIconTile component={l.component} className="size-7" />
                          {componentLabel(l.component)}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-72 whitespace-normal">
                        <span className="line-clamp-2">{l.product?.title ?? "No valid product found"}</span>
                        {l.product?.offer && (
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            {l.product.offer.shop.name}
                            {l.product.offer.shop.kind === "marketplace" && <MarketplaceBadge />}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{l.product ? <Price value={l.productPrice} /> : "—"}</TableCell>
                      <TableCell className="text-right">{l.product ? <Shipping value={l.shipping} /> : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Checkout line={l} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-muted/20">
                  {totals.map((t) => (
                    <TableRow key={t.label}>
                      <TableCell colSpan={4} className={t.strong ? "font-medium" : "text-muted-foreground"}>
                        {t.label}
                      </TableCell>
                      <TableCell className={`text-right tabular ${t.strong ? "text-base font-semibold" : ""}`}>
                        {formatEur(t.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableFooter>
              </Table>
            </div>

            <ul className="divide-y rounded-lg border md:hidden">
              {s.lines.map((l) => (
                <li key={l.component} className="space-y-1.5 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/components/${l.component}`} className="flex items-center gap-2 font-medium">
                      <ComponentIconTile component={l.component} className="size-7" />
                      {componentLabel(l.component)}
                    </Link>
                    <Checkout line={l} />
                  </div>
                  <div className="text-xs text-muted-foreground">{l.product?.title ?? "No valid product found"}</div>
                  {l.product && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{l.product.offer?.shop.name}</span>
                      <span>
                        <Price value={l.productPrice} /> · <Shipping value={l.shipping} />
                      </span>
                    </div>
                  )}
                </li>
              ))}
              {totals.map((t) => (
                <li key={t.label} className="flex justify-between p-3 text-sm">
                  <span className={t.strong ? "font-medium" : "text-muted-foreground"}>{t.label}</span>
                  <span className={`tabular ${t.strong ? "font-semibold" : ""}`}>{formatEur(t.value)}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-1 text-xs text-muted-foreground">
              {s.shippingUnknown.length > 0 && (
                <p>
                  Shipping unknown for {s.shippingUnknown.map(componentLabel).join(", ")}; the checkout total excludes it.
                </p>
              )}
              {!s.complete && s.componentsFound < s.componentsTotal && (
                <p>
                  {s.componentsTotal - s.componentsFound} component(s) have no valid product, so this total is incomplete.
                </p>
              )}
              <p>
                {matchesScraper
                  ? `Product subtotal matches the scraper's build total (${formatEur(s.scraperTotal)}), which excludes shipping.`
                  : s.scraperTotal !== null
                    ? `The scraper reported a build total of ${formatEur(s.scraperTotal)} (product prices only).`
                    : "The scraper output has no build total; values are calculated from the recommended offers."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Where the money goes</CardTitle>
              <CardDescription className="text-xs">Product price per component.</CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownChart
                data={s.lines.flatMap((l) =>
                  l.productPrice !== null
                    ? [{ key: l.component, label: componentShortLabel(l.component), price: l.productPrice }]
                    : [],
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Build notes</CardTitle>
            </CardHeader>
            <CardContent>
              <BuildNotes results={results} summary={s} />
            </CardContent>
          </Card>
          {qualityRules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quality adjustment rules</CardTitle>
                <CardDescription className="text-xs">
                  From build_config.json. Used only to rank valid products of the same component.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y rounded-lg border text-sm">
                  {qualityRules.map(([k, v]) => {
                    const penalty = k.endsWith("_penalty");
                    return (
                      <div key={k} className="flex justify-between gap-3 px-3 py-2">
                        <dt className="text-muted-foreground">{QUALITY_RULE_LABELS[k] ?? k}</dt>
                        <dd className={`tabular ${penalty ? "text-destructive" : "text-success"}`}>
                          {penalty ? "−" : "+"}
                          {formatEur(v)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
