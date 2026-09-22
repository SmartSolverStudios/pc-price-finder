# PC Build Price Finder — web

Dashboard for the output of the Tweakers scraper in `../pc-price-finder-v5`. Everything shown comes from the
scraper's `results.json` and `build_config.json`; the app contains no product, price or shop data of its own.

## Usage

```bash
# 1. Run the scraper (in ../pc-price-finder-v5)
python pc_price_finder.py

# 2. Start the app — `predev`/`prebuild` copy the latest results into ./data
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

`npm run sync-data` copies the files manually. If the scraper folder is missing (e.g. on Vercel), the committed
files in `./data` are used as-is.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PC_FINDER_SCRAPER_DIR` | `../pc-price-finder-v5` | Where `sync-data` reads the scraper output |
| `PC_FINDER_DATA_DIR` | `./data` | Where the app reads `results.json` at build/run time |

Checks: `npm run typecheck`, `npm run lint`, `npm run build`.

## Pages

- `/` — build totals, component table (search, filter, sort), price breakdown, build notes
- `/build` — checkout estimate per component: product subtotal, shipping subtotal, estimated total
- `/components` — all discovered products (recommended, alternatives, manual checks, rejected)
- `/components/[key]` — recommendation, specs, offers, used offers, alternatives, manual checks, rejected products

## Price terms

- **Product price** — the offer price the scraper selected.
- **Checkout estimate** — product price + shipping. Only this is summed into totals.
- **Quality-adjusted** — product price minus the scraper's quality bonus/penalty. Used for ranking only, never
  added to a total.
- Used offers are shown separately with a USED badge and are never recommended or totalled.

## Structure

```
src/lib/types.ts          domain model (Product, Offer, ComponentResult, PriceSnapshot, …)
src/lib/data/schema.ts    zod schema of the raw scraper JSON
src/lib/data/normalize.ts raw JSON → domain model
src/lib/data/sources.ts   BuildDataSource interface + LocalJsonSource
src/lib/data.ts           getBuildResults / getComponentResult / getAllComponents / getBuildSummary
```

Pages only use `src/lib/data.ts`. Adding another source (a second shop, Supabase, a GitHub Actions artifact) means
implementing `BuildDataSource` and returning it from `getDataSource()`. `PriceSnapshot` is the planned shape for
price history; nothing writes it yet.
