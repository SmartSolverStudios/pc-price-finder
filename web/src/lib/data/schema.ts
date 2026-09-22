import { z } from "zod";

/** Shape of the v5 scraper's results.json (snake_case, as written by pc_price_finder.py). */

const nullableNumber = z.number().nullable().optional().transform((v) => v ?? null);
const nullableString = z.string().nullable().optional().transform((v) => v ?? null);
const factValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const rawOfferSchema = z.object({
  shop: z.string().nullable(),
  price: z.number().nullable(),
  shipping: nullableNumber,
  delivery: nullableString,
});

export const rawSecondhandSchema = z.object({
  shop: z.string().nullable(),
  price: z.number().nullable(),
  condition: nullableString,
});

export const rawProductSchema = z.object({
  product_id: z.string(),
  title: z.string(),
  url: z.string(),
  found_by: nullableString,
  status: z.enum(["VALID", "MANUAL_CHECK", "REJECTED"]),
  price: nullableNumber,
  shop: nullableString,
  shipping: nullableNumber,
  delivery: nullableString,
  shop_url: nullableString,
  shop_count: z.number().optional().default(0),
  top_offers: z.array(rawOfferSchema).optional().default([]),
  cheaper_secondhand: z.array(rawSecondhandSchema).optional().default([]),
  facts: z.record(z.string(), factValue).nullable().optional().transform((v) => v ?? {}),
  quality_bonus_eur: z.number().optional().default(0),
  quality_notes: z.array(z.string()).optional().default([]),
  effective_price: nullableNumber,
  reject_reasons: z.array(z.string()).optional().default([]),
  manual_checks: z.array(z.string()).optional().default([]),
});

export const rawRejectedSchema = z.object({
  title: z.string(),
  url: z.string(),
  price: nullableNumber,
  reject_reasons: z.array(z.string()).optional().default([]),
  facts: z.record(z.string(), factValue).nullable().optional().transform((v) => v ?? null),
});

export const rawComponentSchema = z.object({
  recommended: rawProductSchema.nullable(),
  alternatives: z.array(rawProductSchema).optional().default([]),
  needs_manual_check: z.array(rawProductSchema).optional().default([]),
  rejected: z.array(rawRejectedSchema).optional().default([]),
  counts: z
    .object({
      discovered: z.number(),
      valid: z.number(),
      manual_check: z.number(),
      rejected: z.number(),
    })
    .optional(),
});

export const rawResultsSchema = z.object({
  version: z.string(),
  generated_at: z.string(),
  source: z.object({ name: z.string(), base_url: z.string() }),
  components: z.record(z.string(), rawComponentSchema),
  limits: z.record(z.string(), z.number()).optional().default({}),
  errors: z.array(z.string()).optional().default([]),
  summary: z
    .object({
      recommended_count: z.number(),
      build_total_eur: z.number().nullable(),
      build_total_complete: z.boolean(),
    })
    .optional(),
});

const configValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(configValue), z.record(z.string(), configValue)]),
);

/** build_config.json is optional; only the parts the UI displays are validated. */
export const rawConfigSchema = z.object({
  build: z.record(z.string(), z.record(z.string(), configValue)).optional().default({}),
  quality_bonus_eur: z.record(z.string(), configValue).optional().default({}),
});

export type RawResults = z.infer<typeof rawResultsSchema>;
export type RawProduct = z.infer<typeof rawProductSchema>;
export type RawRejected = z.infer<typeof rawRejectedSchema>;
export type RawConfig = z.infer<typeof rawConfigSchema>;
