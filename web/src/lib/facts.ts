import type { FactValue, Facts } from "@/lib/types";
import { formatNumber } from "@/lib/format";

interface FactMeta {
  label: string;
  unit?: string;
}

/** Display labels for fact keys emitted by the scraper's rules.py. Unknown keys fall back to a humanized key. */
const FACT_META: Record<string, FactMeta> = {
  categorie: { label: "Tweakers category" },
  kleur: { label: "Colour" },
  socket: { label: "Socket" },
  verkoopstatus: { label: "Sales package" },
  videochip: { label: "GPU chip" },
  vram_gb: { label: "VRAM", unit: "GB" },
  lengte_mm: { label: "Length", unit: "mm" },
  hoogte_mm: { label: "Height", unit: "mm" },
  diameter_mm: { label: "Fan size", unit: "mm" },
  stroomconnector: { label: "Power connector" },
  chipset: { label: "Chipset" },
  form_factor: { label: "Form factor" },
  geheugentype: { label: "Memory slots" },
  wifi: { label: "Wi-Fi" },
  capaciteit_gb: { label: "Capacity", unit: "GB" },
  modules: { label: "Modules" },
  module_gb: { label: "Module size", unit: "GB" },
  type: { label: "Memory type" },
  snelheid_mts: { label: "Speed", unit: "MT/s" },
  cl: { label: "CAS latency", unit: "CL" },
  profielen: { label: "Overclock profiles" },
  type_koeling: { label: "Cooling type" },
  formaat: { label: "Form factor" },
  interface: { label: "Interface" },
  nand: { label: "NAND" },
  watt: { label: "Wattage", unit: "W" },
  efficientie: { label: "Efficiency" },
  voedingtype: { label: "ATX spec" },
  aantal: { label: "Fans in pack" },
  fan_connector: { label: "Fan connector" },
  led_connector: { label: "LED connector" },
  max_gpu_mm: { label: "Max GPU length", unit: "mm" },
  max_cooler_mm: { label: "Max cooler height", unit: "mm" },
  max_psu_mm: { label: "Max PSU length", unit: "mm" },
};

export function factLabel(key: string): string {
  return FACT_META[key]?.label ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function formatFact(key: string, value: FactValue): string | null {
  if (value === null || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    const unit = FACT_META[key]?.unit;
    if (unit === "CL") return `CL${formatNumber(value)}`;
    return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);
  }
  return value;
}

export interface FactRow {
  key: string;
  label: string;
  value: string;
}

/** Facts with a value, in scraper order. `categorie` is omitted unless requested. */
export function factRows(facts: Facts | null, { includeCategory = false } = {}): FactRow[] {
  if (!facts) return [];
  return Object.entries(facts).flatMap(([key, value]) => {
    if (key === "categorie" && !includeCategory) return [];
    const formatted = formatFact(key, value);
    return formatted === null ? [] : [{ key, label: factLabel(key), value: formatted }];
  });
}

/** Facts the scraper looked for but the source did not provide. */
export function missingFacts(facts: Facts | null): string[] {
  if (!facts) return [];
  return Object.entries(facts)
    .filter(([, v]) => v === null)
    .map(([k]) => factLabel(k));
}
