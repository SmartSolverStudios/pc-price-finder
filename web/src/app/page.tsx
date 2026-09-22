import Link from "next/link";
import { Clock, Database } from "lucide-react";
import { BuildNotes } from "@/components/build-notes";
import { BreakdownChart } from "@/components/dashboard/breakdown-chart";
import { ComponentTable } from "@/components/dashboard/component-table";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { ScraperErrors } from "@/components/scraper-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { componentShortLabel } from "@/lib/components-meta";
import { getBuildResults, summarizeBuild } from "@/lib/data";
import { formatScanTime } from "@/lib/format";
import { recommendationRows } from "@/lib/rows";

export default async function DashboardPage() {
  const res = await getBuildResults();
  if (!res.ok) return <ErrorState detail={[res.error, res.detail].filter(Boolean).join("\n")} />;

  const results = res.data;
  const summary = summarizeBuild(results);
  const scan = formatScanTime(results.generatedAt);
  const breakdown = summary.lines.flatMap((l) =>
    l.productPrice !== null ? [{ key: l.component, label: componentShortLabel(l.component), price: l.productPrice }] : [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="PC Build Price Finder"
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> Last scan {scan.full}
            </span>
            <span className="flex items-center gap-1.5">
              <Database className="size-3.5" /> {results.source.name}
            </span>
          </span>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/build">Build summary</Link>
          </Button>
        }
      />

      <ScraperErrors errors={results.errors} />
      <SummaryCards results={results} summary={summary} />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Components</h2>
          <span className="text-xs text-muted-foreground">Recommended by current build configuration</span>
        </div>
        <ComponentTable rows={recommendationRows(results.components)} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm">Where the money goes</CardTitle>
            <CardDescription className="text-xs">Product price per component, excluding shipping.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownChart data={breakdown} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Build notes</CardTitle>
          </CardHeader>
          <CardContent>
            <BuildNotes results={results} summary={summary} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
