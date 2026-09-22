"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { statusLabel, type DisplayStatus } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductRow } from "@/lib/rows";

export type SortKey = "component" | "price" | "effective" | "shipping" | "checkout";

export const SORT_LABELS: Record<SortKey, string> = {
  component: "Component",
  price: "Product price",
  effective: "Quality-adjusted price",
  shipping: "Shipping",
  checkout: "Checkout estimate",
};

const ALL = "__all";

export interface FilterState {
  query: string;
  component: string;
  shop: string;
  status: string;
  sort: SortKey;
  direction: "asc" | "desc";
}

function sortValue(row: ProductRow, key: SortKey): number | null {
  switch (key) {
    case "price":
      return row.price;
    case "effective":
      return row.effectivePrice;
    case "shipping":
      return row.shipping;
    case "checkout":
      return row.checkout;
    default:
      return null;
  }
}

export function useProductFilters(rows: ProductRow[], initial: Partial<FilterState> = {}) {
  const [state, setState] = useState<FilterState>({
    query: "",
    component: ALL,
    shop: ALL,
    status: ALL,
    sort: "component",
    direction: "asc",
    ...initial,
  });

  const componentOrder = useMemo(() => {
    const order = new Map<string, number>();
    rows.forEach((r) => order.has(r.component) || order.set(r.component, order.size));
    return order;
  }, [rows]);

  const options = useMemo(
    () => ({
      components: [...new Map(rows.map((r) => [r.component, r.componentLabel])).entries()],
      shops: [...new Set(rows.map((r) => r.shop).filter((s): s is string => !!s))].sort((a, b) =>
        a.localeCompare(b, "en", { sensitivity: "base" }),
      ),
      statuses: [...new Set(rows.map((r) => r.status))] as DisplayStatus[],
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    const out = rows.filter(
      (r) =>
        (!q || [r.title, r.brand, r.shop, r.componentLabel].some((v) => v?.toLowerCase().includes(q))) &&
        (state.component === ALL || r.component === state.component) &&
        (state.shop === ALL || r.shop === state.shop) &&
        (state.status === ALL || r.status === state.status),
    );
    const dir = state.direction === "asc" ? 1 : -1;
    return out.sort((a, b) => {
      if (state.sort === "component") {
        return ((componentOrder.get(a.component) ?? 0) - (componentOrder.get(b.component) ?? 0)) * dir;
      }
      const va = sortValue(a, state.sort);
      const vb = sortValue(b, state.sort);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va - vb) * dir;
    });
  }, [rows, state, componentOrder]);

  const isFiltered = state.query !== "" || state.component !== ALL || state.shop !== ALL || state.status !== ALL;
  const reset = () => setState((s) => ({ ...s, query: "", component: ALL, shop: ALL, status: ALL }));

  return { state, setState, options, filtered, isFiltered, reset };
}

type FiltersApi = ReturnType<typeof useProductFilters>;

export function FilterBar({
  api,
  showComponent = false,
  sortKeys = ["component", "price", "effective", "shipping"],
  placeholder = "Search products, brands, shops…",
}: {
  api: FiltersApi;
  showComponent?: boolean;
  sortKeys?: SortKey[];
  placeholder?: string;
}) {
  const { state, setState, options, isFiltered, reset } = api;
  const set = (patch: Partial<FilterState>) => setState((s) => ({ ...s, ...patch }));

  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      <div className="relative md:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={state.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder={placeholder}
          className="pl-8"
          aria-label="Search"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {showComponent && (
          <Select value={state.component} onValueChange={(v) => set({ component: v })}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by component">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All components</SelectItem>
              {options.components.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={state.shop} onValueChange={(v) => set({ shop: v })}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by shop">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All shops</SelectItem>
            {options.shops.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={state.status} onValueChange={(v) => set({ status: v })}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {options.statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={`${state.sort}:${state.direction}`}
          onValueChange={(v) => {
            const [sort, direction] = v.split(":") as [SortKey, "asc" | "desc"];
            set({ sort, direction });
          }}
        >
          <SelectTrigger className="w-full sm:w-52" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortKeys.flatMap((k) =>
              k === "component"
                ? [
                    <SelectItem key={k} value={`${k}:asc`}>
                      Sort: {SORT_LABELS[k]}
                    </SelectItem>,
                  ]
                : [
                    <SelectItem key={`${k}:asc`} value={`${k}:asc`}>
                      Sort: {SORT_LABELS[k]} ↑
                    </SelectItem>,
                    <SelectItem key={`${k}:desc`} value={`${k}:desc`}>
                      Sort: {SORT_LABELS[k]} ↓
                    </SelectItem>,
                  ],
            )}
          </SelectContent>
        </Select>
      </div>
      {isFiltered && (
        <Button variant="ghost" size="sm" onClick={reset} className="self-start md:self-auto">
          <X data-icon="inline-start" />
          Clear
        </Button>
      )}
    </div>
  );
}
