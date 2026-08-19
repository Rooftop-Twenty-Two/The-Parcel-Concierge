# Redirects and catalogue migration

**This is the biggest single risk in the project.** The URL structure is
changing from Shopify's `/collections/` and `/products/` paths to the new
routes, the catalogue is dropping from roughly 2,300 SKUs to an estimated
250 to 400, and every old URL needs a rule.

---

## How it works

`data/redirects/redirects.csv` is the source of truth. It is reviewable and
diffable, and the notes column is written for the client to read at review.

`npm run redirects:build` generates `src/generated/redirects.json` from it,
which `next.config.ts` reads. **Redirects are never hand-written in the
config.** It runs as part of `npm run build`, so a deploy cannot ship
without the map.

`npm run redirects:validate` checks the map and exits non-zero on a problem,
so it can gate a deploy.

## The order of operations

1. **Pull the full URL inventory from Search Console and the existing
   sitemap.** Do this before writing any rules. A map built from what we
   assume exists will miss the pages that actually earn traffic, and those
   are the ones worth protecting.
2. **Make the retain/remove decision** and record it as a CSV with columns
   `handle,decision,kind,parent`.
3. **Generate the per-product rows:**
   ```bash
   npm run redirects:products -- --input data/catalogue/retain-remove.csv >> data/redirects/redirects.csv
   ```
   Do not hand-write 2,000 rows. The generator refuses to emit a rule for a
   removed product with no parent listing, which is the mistake that ends
   with everything pointing at the homepage.
4. **Validate and build:**
   ```bash
   npm run redirects:validate && npm run redirects:build
   ```
5. **Test against the live inventory** before anything is unpublished.
6. **Only then unpublish in Shopify.** Nothing is unpublished until its
   redirect row exists and has been tested.

## The rules

- Every retained product 301s from `/products/[handle]` to its new canonical
  route.
- **Every removed product 301s to its parent listing page, never the
  homepage.** Sending everything home throws away the link equity and dumps
  the shopper nowhere near what they wanted. There is a test that fails if
  any rule points at `/`.
- Every removed grape-variety collection 301s to `/wine` with the grape
  preserved as a filter parameter, so the shopper lands on the same set of
  wines they were looking for.
- Every rule carries a note. The client reads these at review.

## What the validator catches

| Problem | Why it matters |
|---|---|
| Duplicate source | The second rule silently never fires |
| Self-redirect | Infinite loop |
| Redirect chain | A to B to C loses PageRank and Google gives up after a few hops. Flatten it: point the source straight at the final destination |
| Loop | Same |
| Destination that is not a route | A redirect to a 404 is worse than no redirect |
| Missing note | The client cannot review a rule with no reason |

## Catalogue decisions

### Retained

Hampers (all), wine, Champagne and spirits (all), exclusive imports,
jewellery where in stock and branded, crystal and glassware where in stock,
candles and diffusers, and a tight add-on band of cards, chocolate and small
treats.

### Removed

The 254-SKU standalone plain card estate, sub-€10 singles, the chronically
out-of-stock beauty range (49% out of stock in the June sample), and
anything out of stock with no restock date.

### Still to decide

Jewellery, crystal and homeware. `/collections/jewellery` currently has a
provisional rule to `/gifts` marked for revisiting. See outstanding client
item 3.

## The off-domain builder

The custom hamper builder currently sits on `parcel-concierge.vercel.app`.
It is now `/build-your-own-hamper` on the main domain.

**The host redirect is not in this CSV** and cannot be: it is a redirect
from a different origin, so it is configured at the Vercel project or DNS
level for `parcel-concierge.vercel.app`, pointing every path at
`https://theparcelconcierge.com/build-your-own-hamper`.

It is listed here so the row exists and gets tested. The path-level rules
for `/build-a-hamper`, `/custom-hamper` and `/pages/build-your-own` are in
the CSV and cover the on-domain entry points.

## After launch

Watch Search Console coverage for the first month. The two things to look
for are a spike in 404s, which means a gap in the map, and a spike in
"redirect error", which means a chain the validator did not catch because
one end of it lives outside this file.
