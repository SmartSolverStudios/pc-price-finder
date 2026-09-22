import type { ComponentKey } from "@/lib/types";

/** Display names for the scraper's component keys. Unknown keys still render with a humanized name. */
const LABELS: Record<string, { label: string; short: string }> = {
  case: { label: "Case", short: "Case" },
  cpu: { label: "CPU", short: "CPU" },
  gpu: { label: "GPU", short: "GPU" },
  motherboard: { label: "Motherboard", short: "Board" },
  ram: { label: "RAM", short: "RAM" },
  cooler: { label: "CPU Cooler", short: "Cooler" },
  ssd: { label: "SSD", short: "SSD" },
  psu: { label: "PSU", short: "PSU" },
  fans: { label: "Fans", short: "Fans" },
};

export function componentLabel(key: ComponentKey): string {
  return LABELS[key]?.label ?? key.replace(/[_-]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function componentShortLabel(key: ComponentKey): string {
  return LABELS[key]?.short ?? componentLabel(key);
}

/** Human labels for the limit keys in results.json. */
export const LIMIT_LABELS: Record<string, string> = {
  gpu_mm: "Max GPU length",
  cooler_mm: "Max CPU cooler height",
  psu_mm: "Max PSU length",
};

/** Human labels for quality_bonus_eur keys in build_config.json. */
export const QUALITY_RULE_LABELS: Record<string, string> = {
  cpu_boxed: "Boxed CPU bonus",
  ram_best_cl: "RAM lowest-CL bonus",
  psu_atx31: "PSU ATX 3.1 bonus",
  psu_above_gold: "PSU above-Gold bonus",
  ssd_qlc_penalty: "QLC SSD penalty",
  ssd_oem_penalty: "OEM SSD penalty",
};
