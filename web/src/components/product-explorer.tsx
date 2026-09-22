"use client";

import Link from "next/link";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { Price, QualityAdjustment, Shipping } from "@/components/cells";
import { ComponentIcon } from "@/components/component-icon";
import { FilterBar, useProductFilters } from "@/components/product-filters";
import { MarketplaceBadge, StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductRow } from "@/lib/rows";

const ROLE_LABELS: Record<ProductRow["role"], string> = {
  recommended: "Recommended",
  alternative: "Alternative",
  manual: "Manual check",
  rejected: "Rejected",
};

function Role({ row }: { row: ProductRow }) {
  return row.role === "recommended" ? (
    <Badge variant="outline" className="border-brand/30 font-normal text-brand">
      {ROLE_LABELS[row.role]}
    </Badge>
  ) : (
    <span className="text-xs text-muted-foreground">{ROLE_LABELS[row.role]}</span>
  );
}

function Title({ row }: { row: ProductRow }) {
  return (
    <div className="min-w-0">
      {row.sourceUrl ? (
        <a
          href={row.sourceUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="line-clamp-2 hover:underline"
        >
          {row.title}
          <ExternalLinkIcon className="ml-1 inline size-3 opacity-50" aria-hidden />
        </a>
      ) : (
        <span className="line-clamp-2">{row.title}</span>
      )}
      {row.reason && <div className="mt-0.5 text-xs text-muted-foreground">{row.reason}</div>}
    </div>
  );
}

export function ProductExplorer({ rows }: { rows: ProductRow[] }) {
  const filters = useProductFilters(rows, { status: "VALID" });
  const visible = filters.filtered;

  return (
    <div className="space-y-3">
      <FilterBar api={filters} showComponent sortKeys={["component", "price", "effective", "shipping", "checkout"]} />
      <p className="text-xs text-muted-foreground tabular">
        Showing {visible.length} of {rows.length} discovered products
      </p>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          No products match these filters.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border xl:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead className="h-auto py-2 text-right leading-tight whitespace-normal">Product price</TableHead>
                  <TableHead className="text-right">Shipping</TableHead>
                  <TableHead className="h-auto py-2 text-right leading-tight whitespace-normal">Quality-adjusted</TableHead>
                  <TableHead className="text-right">Quality</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/components/${row.component}`}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <ComponentIcon component={row.component} className="hidden 2xl:block" />
                        {row.componentLabel}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-96 whitespace-normal">
                      <Title row={row} />
                    </TableCell>
                    <TableCell>
                      <Role row={row} />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {row.shop ? (
                        <div className="flex flex-col items-start gap-1">
                          {row.shop}
                          {row.shopKind === "marketplace" && <MarketplaceBadge />}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Price value={row.price} />
                    </TableCell>
                    <TableCell className="text-right">
                      {row.role === "rejected" ? <span className="text-muted-foreground">—</span> : <Shipping value={row.shipping} />}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.role === "rejected" ? "—" : <Price value={row.effectivePrice} />}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.role === "rejected" ? "—" : <QualityAdjustment value={row.adjustment} notes={row.qualityNotes} />}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:hidden">
            {visible.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/components/${row.component}`} className="flex items-center gap-2 text-muted-foreground">
                    <ComponentIcon component={row.component} />
                    {row.componentLabel}
                  </Link>
                  <StatusBadge status={row.status} />
                </div>
                <Title row={row} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Role row={row} />
                  <div className="text-right">
                    <Price value={row.price} className="font-medium" />
                    {row.role !== "rejected" && (
                      <div className="text-xs">
                        <Shipping value={row.shipping} />
                      </div>
                    )}
                  </div>
                </div>
                {row.shop && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {row.shop}
                    {row.shopKind === "marketplace" && <MarketplaceBadge />}
                  </div>
                )}
                <Button asChild variant="outline" size="sm" className="self-start">
                  <Link href={`/components/${row.component}`}>View component</Link>
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
