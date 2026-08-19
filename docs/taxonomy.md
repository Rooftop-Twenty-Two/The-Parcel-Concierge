# Tag taxonomy

Locked, lowercase, colon-namespaced. No free tagging.

The single source of truth is `src/lib/commerce/taxonomy.ts`. The ingest
tool imports it to reject anything outside it at write time, the route
registry imports it to build listing queries, and the sitemap imports it to
decide what can exist. A tag that is not in that file cannot be written to
Shopify and cannot drive a route.

## The tags

```
occasion:christmas | occasion:new-baby | occasion:sympathy |
occasion:anniversary | occasion:thank-you | occasion:birthday |
occasion:wedding | occasion:corporate

recipient:her | recipient:him | recipient:couple | recipient:family |
recipient:client

type:hamper | type:wine | type:spirit | type:addon

price:under-50 | price:50-100 | price:100-150 | price:150-plus

badge:exclusive | badge:irish-made | badge:guaranteed-irish |
badge:hand-delivered
```

## Rules the ingest tool enforces

- **Every tag must be in the list above.** Every offending tag in a run is
  reported, not just the first, so a catalogue export can be fixed in one
  pass.
- **Exactly one `type:` tag per product.** It decides which template
  renders, which hub the product lives under, and therefore its canonical
  URL.
- **Exactly one `price:` tag per product, and it must match the price.** A
  product priced at €210 tagged `price:50-100` would appear on the wrong
  budget page, so it is rejected rather than corrected: a silent correction
  hides a data problem upstream.
- **`badge:exclusive` and `wine.is_exclusive_import` must agree**, in both
  directions. The badge drives the card flag and the boolean drives
  `/wine/exclusive-to-us`, and a product with one and not the other appears
  in one place and not the other.
- **`hamper.occasion_tags` should mirror the `occasion:` product tags.** A
  mismatch is a warning rather than an error, because the tags are what
  actually drive the routes and the metafield is what the product page
  renders. But it means the two disagree, which is worth fixing.

## Price bands

The bands in `PRICE_BANDS` are the one definition used by three things: the
`/gifts-by-budget/*` routes, the `price:` tags, and the GA4 budget-band
dimension. A shopper, a tag and an analytics report can therefore never
disagree about which band a product is in.

| Tag | Range |
|---|---|
| `price:under-50` | €0 to €49.99 |
| `price:50-100` | €50 to €99.99 |
| `price:100-150` | €100 to €149.99 |
| `price:150-plus` | €150 and over |

The bands are exhaustive from zero upwards and do not overlap. There is a
test that fails if that ever stops being true.

Note that the hamper budget bands (`/hampers/under-75` and so on) use
different boundaries, straight from the brief. See the open question in
`docs/ia-and-routes.md`.

## Badges

Badges are claims, so they only go on a product where the claim is true and
we can show why.

| Badge | When it applies |
|---|---|
| `badge:exclusive` | We are the only Irish stockist. Must be backed by `wine.is_exclusive_import` |
| `badge:irish-made` | Made in Ireland |
| `badge:guaranteed-irish` | Covered by our Guaranteed Irish membership |
| `badge:hand-delivered` | Available for free local hand delivery |

There is no `badge:bestseller` and there will not be one until there is
sales data behind it. The ingest validator rejects any description
containing a popularity claim for the same reason.
