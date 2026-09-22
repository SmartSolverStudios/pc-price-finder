import type { Metadata } from "next";
import Link from "next/link";
import { ComponentIconTile } from "@/components/component-icon";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { ProductExplorer } from "@/components/product-explorer";
import { StatusBadge } from "@/components/status-badge";
import { componentLabel } from "@/lib/components-meta";
import { getBuildResults } from "@/lib/data";
import { formatEur } from "@/lib/format";
import { allProductRows } from "@/lib/rows";

export const metadata: Metadata = { title: "Components" };

export default async function ComponentsPage() {
  const res = await getBuildResults();
  if (!res.ok) return <ErrorState detail={[res.error, res.detail].filter(Boolean).join("\n")} />;
  const { components, source } = res.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Components"
        title="All components"
        description={`Every product the scraper discovered on ${source.name}, with its validation result.`}
      />

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {components.map((c) => (
          <li key={c.key}>
            <Link
              href={`/components/${c.key}`}
              className="flex h-full items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30"
            >
              <ComponentIconTile component={c.key} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{componentLabel(c.key)}</span>
                  <span className="text-sm tabular">
                    {c.recommended ? formatEur(c.recommended.offer?.price) : ""}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {c.recommended?.title ?? "No valid product found"}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground tabular">
                  {c.recommended ? <StatusBadge status="VALID" /> : <StatusBadge status="NO_MATCH" />}
                  {c.counts.valid} valid · {c.counts.manualCheck} manual · {c.counts.rejected} rejected
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Discovered products</h2>
        <ProductExplorer rows={allProductRows(components)} />
      </section>
    </div>
  );
}
