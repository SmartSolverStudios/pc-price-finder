"use client";

import Link from "next/link";
import { ChevronRight, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { Price, QualityAdjustment, Shipping } from "@/components/cells";
import { ComponentIconTile } from "@/components/component-icon";
import { FilterBar, useProductFilters } from "@/components/product-filters";
import { MarketplaceBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProductRow } from "@/lib/rows";

function EffectiveHeader() {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">Quality-adjusted</TooltipTrigger>
      <TooltipContent className="max-w-64">
        Product price minus the scraper&apos;s quality adjustment. Used only to rank products — not what you pay.
      </TooltipContent>
    </Tooltip>
  );
}

function ProductName({ row }: { row: ProductRow }) {
  if (!row.title) {
    return <span className="text-muted-foreground">No valid product found</span>;
  }
  return (
    <div className="min-w-0">
      <Link href={`/components/${row.component}`} className="line-clamp-2 font-medium hover:underline">
        {row.title}
      </Link>
      {row.brand && <div className="text-xs text-muted-foreground">{row.brand}</div>}
    </div>
  );
}

function ShopName({ row }: { row: ProductRow }) {
  if (!row.shop) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col items-start gap-1">
      <span>{row.shop}</span>
      {row.shopKind === "marketplace" && <MarketplaceBadge />}
    </div>
  );
}

function OpenActions({ row }: { row: ProductRow }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {row.sourceUrl && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon-sm">
              <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label="Open on Tweakers">
                <ExternalLinkIcon />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open Tweakers</TooltipContent>
        </Tooltip>
      )}
      <Button asChild variant="outline" size="xs">
        <Link href={`/components/${row.component}`}>
          View
          <ChevronRight data-icon="inline-end" />
        </Link>
      </Button>
    </div>
  );
}

export function ComponentTable({ rows }: { rows: ProductRow[] }) {
  const filters = useProductFilters(rows);
  const visible = filters.filtered;

  return (
    <div className="space-y-3">
      <FilterBar api={filters} placeholder="Search recommendations…" />

      {visible.length === 0 && (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          No components match these filters.
        </p>
      )}

      {visible.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-xl border xl:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead className="h-auto py-2 text-right leading-tight whitespace-normal">Product price</TableHead>
                  <TableHead className="text-right">Shipping</TableHead>
                  <TableHead className="h-auto py-2 text-right leading-tight whitespace-normal">
                    <EffectiveHeader />
                  </TableHead>
                  <TableHead className="text-right">Quality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <ComponentIconTile component={row.component} className="hidden 2xl:flex" />
                        <span className="font-medium">{row.componentLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-80 whitespace-normal">
                      <ProductName row={row} />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <ShopName row={row} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.title ? <Price value={row.price} /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.title ? <Shipping value={row.shipping} /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.title ? <Price value={row.effectivePrice} /> : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.title ? <QualityAdjustment value={row.adjustment} notes={row.qualityNotes} /> : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      <OpenActions row={row} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:hidden">
            {visible.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ComponentIconTile component={row.component} className="size-7" />
                    <span className="text-sm font-medium">{row.componentLabel}</span>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <div className="text-sm">
                  <ProductName row={row} />
                </div>
                {row.title && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                    <dt className="text-xs text-muted-foreground">Product price</dt>
                    <dd className="text-right font-medium">
                      <Price value={row.price} />
                    </dd>
                    <dt className="text-xs text-muted-foreground">Shipping</dt>
                    <dd className="text-right">
                      <Shipping value={row.shipping} />
                    </dd>
                    <dt className="text-xs text-muted-foreground">Quality-adjusted</dt>
                    <dd className="text-right text-muted-foreground">
                      <Price value={row.effectivePrice} />
                    </dd>
                    <dt className="text-xs text-muted-foreground">Quality</dt>
                    <dd className="text-right">
                      <QualityAdjustment value={row.adjustment} notes={row.qualityNotes} />
                    </dd>
                    <dt className="text-xs text-muted-foreground">Shop</dt>
                    <dd className="flex justify-end text-right">
                      <ShopName row={row} />
                    </dd>
                  </dl>
                )}
                <OpenActions row={row} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
