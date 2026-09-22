import Link from "next/link";
import { Ruler, Store } from "lucide-react";
import { componentLabel, LIMIT_LABELS } from "@/lib/components-meta";
import { formatNumber } from "@/lib/format";
import type { BuildResults, BuildSummary } from "@/lib/types";

/** Factual notes about the current build: case limits used, shared shops, used offers. */
export function BuildNotes({ results, summary }: { results: BuildResults; summary: BuildSummary }) {
  const limits = Object.entries(results.limits);
  return (
    <div className="space-y-5 text-sm">
      {limits.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            <Ruler className="size-3.5" /> Fit limits used by the scraper
          </h3>
          <dl className="divide-y rounded-lg border">
            {limits.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between px-3 py-2">
                <dt className="text-muted-foreground">{LIMIT_LABELS[key] ?? key}</dt>
                <dd className="tabular">{formatNumber(value)} mm</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">Taken from the Tweakers specifications of the recommended case.</p>
        </section>
      )}

      {summary.sharedShops.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            <Store className="size-3.5" /> Same shop, multiple components
          </h3>
          <ul className="space-y-1.5">
            {summary.sharedShops.map((s) => (
              <li key={s.shop} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span>{s.shop}</span>
                <span className="text-xs text-muted-foreground">
                  {s.components.map((c, i) => (
                    <span key={c}>
                      {i > 0 && ", "}
                      <Link href={`/components/${c}`} className="hover:underline">
                        {componentLabel(c)}
                      </Link>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Shipping is counted per component; ordering these together may reduce it.
          </p>
        </section>
      )}

      {summary.usedOfferCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {summary.usedOfferCount} cheaper used offer{summary.usedOfferCount === 1 ? " exists" : "s exist"} for recommended
          products. They are shown on the component pages and never included in totals.
        </p>
      )}
    </div>
  );
}
