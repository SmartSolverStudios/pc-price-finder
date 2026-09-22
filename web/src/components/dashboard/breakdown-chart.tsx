"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatEur } from "@/lib/format";

export interface BreakdownDatum {
  key: string;
  label: string;
  price: number;
}

const config = {
  price: { label: "Product price", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function BreakdownChart({ data }: { data: BreakdownDatum[] }) {
  const total = data.reduce((s, d) => s + d.price, 0);
  const rows = [...data]
    .sort((a, b) => b.price - a.price)
    .map((d) => ({ ...d, share: total > 0 ? d.price / total : 0 }));
  const max = rows[0]?.price ?? 0;

  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No priced recommendations to chart.</p>;
  }

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: rows.length * 34 + 8 }}>
      <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 112, top: 0, bottom: 0 }} barCategoryGap={6}>
        <XAxis type="number" hide domain={[0, max]} />
        <YAxis
          type="category"
          dataKey="label"
          width={96}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            const d = payload?.[0]?.payload as (BreakdownDatum & { share: number }) | undefined;
            if (!active || !d) return null;
            return (
              <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                <div className="font-medium">{d.label}</div>
                <div className="text-muted-foreground tabular">
                  {formatEur(d.price)} · {(d.share * 100).toFixed(1)}% of product subtotal
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="price" radius={3} isAnimationActive={false}>
          {rows.map((r, i) => (
            <Cell key={r.key} fill="var(--color-price)" fillOpacity={i === 0 ? 1 : 0.55} />
          ))}
          <LabelList
            dataKey="price"
            position="right"
            className="fill-muted-foreground tabular"
            fontSize={11}
            formatter={(value) => {
              const v = Number(value);
              return `${formatEur(v)}  ${total > 0 ? ((v / total) * 100).toFixed(0) : 0}%`;
            }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
