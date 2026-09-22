import { CircleCheck, CircleX, TriangleAlert, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DisplayStatus = "VALID" | "MANUAL_CHECK" | "REJECTED" | "NO_MATCH";

const STYLES: Record<DisplayStatus, { label: string; icon: LucideIcon; className: string }> = {
  VALID: { label: "Valid", icon: CircleCheck, className: "border-success/25 bg-success/10 text-success" },
  MANUAL_CHECK: { label: "Manual check", icon: TriangleAlert, className: "border-warning/25 bg-warning/10 text-warning" },
  REJECTED: { label: "Rejected", icon: CircleX, className: "border-destructive/25 bg-destructive/10 text-destructive" },
  NO_MATCH: { label: "No valid product", icon: CircleX, className: "border-border bg-muted text-muted-foreground" },
};

export function statusLabel(status: DisplayStatus): string {
  return STYLES[status].label;
}

export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  const s = STYLES[status];
  return (
    <Badge variant="outline" className={cn("gap-1 font-normal", s.className, className)}>
      <s.icon aria-hidden />
      {s.label}
    </Badge>
  );
}

export function UsedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-warning/30 font-mono text-[10px] tracking-wider text-warning", className)}>
      USED
    </Badge>
  );
}

export function MarketplaceBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-normal text-muted-foreground", className)}>
      Marketplace
    </Badge>
  );
}
