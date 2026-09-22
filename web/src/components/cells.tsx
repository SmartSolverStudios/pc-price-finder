import { Truck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatEur, formatSignedEur, isNextDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Price({ value, className }: { value: number | null; className?: string }) {
  return value === null ? (
    <span className={cn("text-xs text-muted-foreground", className)}>Price unavailable</span>
  ) : (
    <span className={cn("tabular", className)}>{formatEur(value)}</span>
  );
}

export function Shipping({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return <span className={cn("text-xs text-muted-foreground", className)}>Shipping unknown</span>;
  if (value === 0) return <span className={cn("text-muted-foreground", className)}>Free</span>;
  return <span className={cn("tabular", className)}>{formatEur(value)}</span>;
}

/** Quality adjustment in EUR with the scraper's reasons in a tooltip. */
export function QualityAdjustment({ value, notes, className }: { value: number; notes: string[]; className?: string }) {
  if (value === 0 && notes.length === 0) {
    return <span className={cn("text-xs text-muted-foreground", className)}>None</span>;
  }
  const label = (
    <span
      className={cn(
        "tabular underline decoration-dotted underline-offset-4",
        value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {formatSignedEur(value)}
    </span>
  );
  if (notes.length === 0) return label;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="cursor-help">
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <ul className="space-y-0.5">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

export function Delivery({ text, className }: { text: string | null; className?: string }) {
  if (!text) return <span className={cn("text-xs text-muted-foreground", className)}>Delivery unknown</span>;
  return (
    <span className={cn("inline-flex items-start gap-1.5", className)}>
      <Truck className={cn("mt-0.5 size-3.5 shrink-0", isNextDay(text) ? "text-success" : "text-muted-foreground")} />
      <span>{text}</span>
    </span>
  );
}
