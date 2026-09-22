"use client";

import { useMemo, useState } from "react";
import { ChevronDown, CircleX } from "lucide-react";
import { Price } from "@/components/cells";
import { ExternalLink } from "@/components/external-link";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { RejectedProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RejectedList({ items }: { items: RejectedProduct[] }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of items) {
      const label = r.reasons[0]?.label ?? "No reason recorded";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const visible = reason ? items.filter((r) => (r.reasons[0]?.label ?? "No reason recorded") === reason) : items;

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No products were rejected for this component.</p>;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <CircleX className="size-4 text-destructive/80" aria-hidden />
            Rejected products ({items.length})
          </span>
          <span className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {groups
                .slice(0, 3)
                .map(([label, n]) => `${label} (${n})`)
                .join(" · ")}
            </span>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-wrap gap-1.5 border-t px-4 py-3">
          <Button size="xs" variant={reason === null ? "secondary" : "ghost"} onClick={() => setReason(null)}>
            All ({items.length})
          </Button>
          {groups.map(([label, n]) => (
            <Button key={label} size="xs" variant={reason === label ? "secondary" : "ghost"} onClick={() => setReason(label)}>
              {label} ({n})
            </Button>
          ))}
        </div>
        <ul className="divide-y border-t">
          {visible.map((r, i) => (
            <li key={`${r.sourceUrl}-${i}`} className="grid grid-cols-1 gap-1 px-4 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] sm:gap-4">
              <ExternalLink href={r.sourceUrl} className="min-w-0 text-foreground/90">
                <span className="line-clamp-2">{r.title}</span>
              </ExternalLink>
              <Price value={r.price} className="text-muted-foreground sm:text-right" />
              <div className="space-y-0.5">
                {r.reasons.length === 0 && <span className="text-xs text-muted-foreground">No reason recorded</span>}
                {r.reasons.map((reasonItem) => (
                  <div key={reasonItem.raw}>
                    <div className="text-sm">{reasonItem.label}</div>
                    {reasonItem.raw !== reasonItem.label && (
                      <div className="text-xs text-muted-foreground" lang="nl">
                        {reasonItem.raw}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
