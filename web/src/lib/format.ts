const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

/** Formats EUR. Returns `fallback` for null so a missing value is never shown as €0. */
export function formatEur(value: number | null | undefined, fallback = "Price unavailable"): string {
  return value === null || value === undefined || Number.isNaN(value) ? fallback : eur.format(value);
}

export function formatSignedEur(value: number): string {
  if (value === 0) return eur.format(0);
  return `${value > 0 ? "+" : "−"}${eur.format(Math.abs(value))}`;
}

export function formatShipping(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Shipping unknown";
  return value === 0 ? "Free shipping" : `+ ${eur.format(value)} shipping`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The scraper writes local time without a timezone ("2026-09-23 01:17:06").
 * Format the parts directly instead of going through Date, which would shift it to the server's timezone.
 */
export function formatScanTime(value: string): { date: string; time: string; full: string } {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return { date: value, time: "", full: value };
  const [, y, mo, d, h, mi] = m;
  const date = `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}`;
  const time = `${h}:${mi}`;
  return { date, time, full: `${date} · ${time}` };
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("en-IE", { maximumFractionDigits: 2 });
}

/** True when the source's delivery text promises next-day delivery. */
export function isNextDay(delivery: string | null): boolean {
  return !!delivery && /(morgen|volgende werkdag) in huis/i.test(delivery);
}
