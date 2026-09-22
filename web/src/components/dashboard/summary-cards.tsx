import Link from "next/link";
import { ArrowDownRight, Clock, Database, Layers, Receipt } from "lucide-react";
import { ExternalLink } from "@/components/external-link";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { componentLabel } from "@/lib/components-meta";
import { formatEur, formatScanTime } from "@/lib/format";
import type { BuildResults, BuildSummary } from "@/lib/types";

function Stat({
  icon: Icon,
  label,
  children,
  footer,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card size="sm" className="gap-2">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5 text-xs">
          <Icon className="size-3.5" />
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-2">
        <div>{children}</div>
        {footer && <div className="text-xs text-muted-foreground">{footer}</div>}
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ results, summary }: { results: BuildResults; summary: BuildSummary }) {
  const scan = formatScanTime(results.generatedAt);
  const matchesScraper = summary.scraperTotal !== null && Math.abs(summary.scraperTotal - summary.productSubtotal) < 0.01;
  const topLower = [...summary.lowerPriceAlternatives].sort((a, b) => b.lowerByEur - a.lowerByEur);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
      <Card size="sm" className="gap-2 sm:col-span-2 xl:col-span-4">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5 text-xs">
            <Receipt className="size-3.5" />
            Build total · product prices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-semibold tracking-tight tabular">{formatEur(summary.productSubtotal)}</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="text-right tabular">
              {formatEur(summary.shippingSubtotal)}
              {summary.shippingUnknown.length > 0 && ` + ${summary.shippingUnknown.length} unknown`}
            </dd>
            <dt className="text-muted-foreground">Checkout estimate</dt>
            <dd className="text-right font-medium tabular">
              {formatEur(summary.checkoutEstimate)}
              {summary.shippingUnknown.length > 0 && "+"}
            </dd>
          </dl>
          <p className="text-xs text-muted-foreground">
            {matchesScraper
              ? "Matches the scraper's build total (product prices, excluding shipping)."
              : summary.scraperTotal !== null
                ? `Scraper reported ${formatEur(summary.scraperTotal)}.`
                : "Calculated from the recommended offers."}{" "}
            <Link href="/build" className="text-foreground underline-offset-4 hover:underline">
              Breakdown
            </Link>
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2 xl:col-span-8 xl:grid-cols-4">
        <Stat
          icon={Layers}
          label="Components"
          footer={summary.complete ? "Every component has a verified offer." : "Some components have no verified offer."}
        >
          <div className="text-2xl font-semibold tabular">
            {summary.componentsFound}
            <span className="text-muted-foreground"> / {summary.componentsTotal}</span>
          </div>
          <Progress value={(summary.componentsFound / Math.max(summary.componentsTotal, 1)) * 100} className="mt-2 h-1" />
        </Stat>

        <Stat icon={Clock} label="Last scan" footer={`Scraper v${results.version}`}>
          <div className="text-lg font-medium tabular">{scan.date}</div>
          <div className="text-sm text-muted-foreground tabular">{scan.time}</div>
        </Stat>

        <Stat icon={Database} label="Data source" footer="Prices and specs as listed by the source.">
          <ExternalLink href={results.source.baseUrl} className="text-lg font-medium">
            {results.source.name}
          </ExternalLink>
        </Stat>

        <Stat
          icon={ArrowDownRight}
          label="Lower-price alternatives"
          footer={
            topLower.length > 0
              ? "Valid, but ranked lower after quality adjustment."
              : "No valid alternative is cheaper than a recommendation."
          }
        >
          {topLower.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {topLower.slice(0, 3).map((l) => (
                <li key={l.component} className="flex items-baseline justify-between gap-2">
                  <Link href={`/components/${l.component}`} className="truncate hover:underline">
                    {componentLabel(l.component)}
                  </Link>
                  <span className="shrink-0 text-success tabular">−{formatEur(l.lowerByEur)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-2xl font-semibold">0</div>
          )}
        </Stat>
      </div>
    </div>
  );
}
