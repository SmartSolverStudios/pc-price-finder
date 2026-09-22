import {
  CircuitBoard,
  Cpu,
  Fan,
  Gpu,
  HardDrive,
  MemoryStick,
  Package,
  PcCase,
  Snowflake,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  case: PcCase,
  cpu: Cpu,
  gpu: Gpu,
  motherboard: CircuitBoard,
  ram: MemoryStick,
  cooler: Snowflake,
  ssd: HardDrive,
  psu: Zap,
  fans: Fan,
};

export function ComponentIcon({ component, className }: { component: string; className?: string }) {
  const Icon = ICONS[component] ?? Package;
  return <Icon className={cn("size-4 shrink-0", className)} aria-hidden />;
}

export function ComponentIconTile({ component, className }: { component: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      <ComponentIcon component={component} />
    </span>
  );
}
