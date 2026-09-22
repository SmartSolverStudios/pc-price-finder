import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ComponentIconTile } from "@/components/component-icon";
import { AlternativesList } from "@/components/detail/alternatives-list";
import { RejectedList } from "@/components/detail/rejected-list";
import {
  ConfigCard,
  ManualChecks,
  NoRecommendation,
  PriceComparison,
  RecommendedCard,
  SpecsCard,
  UsedOffers,
} from "@/components/detail/sections";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { componentLabel } from "@/lib/components-meta";
import { getAllComponents, getBuildResults } from "@/lib/data";
import { formatScanTime } from "@/lib/format";

export async function generateStaticParams() {
  const res = await getAllComponents();
  return res.ok ? res.data.map((c) => ({ component: c.key })) : [];
}

export async function generateMetadata({ params }: PageProps<"/components/[component]">): Promise<Metadata> {
  const { component } = await params;
  return { title: componentLabel(component) };
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default async function ComponentPage({ params }: PageProps<"/components/[component]">) {
  const { component } = await params;
  const res = await getBuildResults();
  if (!res.ok) return <ErrorState detail={[res.error, res.detail].filter(Boolean).join("\n")} />;

  const results = res.data;
  const result = results.components.find((c) => c.key === component);
  if (!result) notFound();

  const rec = result.recommended;
  const limits = Object.entries(results.limits).filter(([k]) => k.startsWith(`${component}_`));
  const { counts } = result;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/">
          <ArrowLeft data-icon="inline-start" />
          Dashboard
        </Link>
      </Button>

      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <ComponentIconTile component={component} className="size-6" />
            Component
          </span>
        }
        title={componentLabel(component)}
        description={
          <span className="tabular">
            {counts.discovered} discovered · {counts.valid} valid · {counts.manualCheck} manual check · {counts.rejected}{" "}
            rejected · scan {formatScanTime(results.generatedAt).full} · {results.source.name}
          </span>
        }
      />

      {rec ? <RecommendedCard product={rec} /> : <NoRecommendation manualCount={result.manualCheckProducts.length} />}

      {rec && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SpecsCard product={rec} />
          <div className="space-y-4">
            <PriceComparison product={rec} />
            <UsedOffers product={rec} />
          </div>
        </div>
      )}

      <Section title="Alternatives">
        <AlternativesList recommended={rec} alternatives={result.alternatives} />
      </Section>

      <Section title="Manual checks">
        <ManualChecks products={result.manualCheckProducts} />
      </Section>

      <Section title="Rejected products" aside={<span className="text-xs text-muted-foreground">Reasons as recorded by the scraper</span>}>
        <RejectedList items={result.rejected} />
      </Section>

      <ConfigCard config={result.config} limits={limits} />
    </div>
  );
}
