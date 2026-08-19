# The ingest tool

Writes the rationalised catalogue into Shopify via the Admin API. It is a
tool, not a one-off script: the catalogue will be re-ingested many times as
copy is approved in batches.

```bash
# Dry run. Validates, plans, prints the diff. Writes nothing.
npm run ingest -- --input data/catalogue/fixtures.json

# Validate a file without contacting Shopify at all.
npm run ingest -- --input <file> --offline

# Apply. Requires the explicit flag.
npm run ingest -- --input <file> --write

# Metafield definitions. Run this first against a new store.
npm run ingest:definitions
npm run ingest:definitions -- --write
```

## Environment

```
SHOPIFY_STORE_DOMAIN=the-parcel-concierge.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_...
SHOPIFY_API_VERSION=2025-07
```

The Admin token is server side only. Nothing under `src/` reads it, and it
must never reach a client bundle. Create a custom app scoped to
`write_products`, `read_products` and `write_metaobject_definitions`.

## What it guarantees

**Dry run is the default.** Writing needs `--write`. There is no
configuration that changes that.

**Idempotent on SKU.** The first variant's SKU is the key. A product whose
SKU already exists is an update; everything else is a create. Re-running the
same catalogue produces the same store and never a duplicate.

**Validation blocks, and there is no flag to skip it.** No product with
empty allergens, contents or images is ever written. If we do not know the
allergens, the product does not go live and the description says nothing
about allergens rather than inventing something.

**Definitions first, then products.** A metafield written without a
definition is untyped, invisible in the Shopify admin and unreadable by the
Storefront API. `--write` checks the definitions and creates any that are
missing before it writes a single product.

**Rate-limit aware.** Admin GraphQL is cost based rather than request based.
Every response carries the query's cost and the state of a leaky bucket, so
the client reads `throttleStatus` and waits for the bucket to refill rather
than sleeping a fixed amount and hoping.

**Everything is logged.** Every write, successful or not, goes into a run
report CSV under `data/ingest-reports/`.

**Products are created as DRAFT.** Going live is a deliberate step in the
Shopify admin, and nothing should go live before its redirect row exists and
has been tested.

## The run report

`data/ingest-reports/ingest-<timestamp>.csv`:

| Column | |
|---|---|
| `handle` | |
| `sku` | The idempotency key |
| `action` | create, update or skip |
| `status` | ok or failed |
| `productId` | The Shopify GID |
| `message` | Which fields changed, or the error |
| `rollbackHint` | Enough to undo the write by hand |

### Rolling a run back

For a create, `rollbackHint` names the product id to delete. For an update,
it lists the previous value of every field that changed.

There is no automated rollback, deliberately. An automated rollback of a
partially-applied catalogue write is a second unreviewed bulk write, which
is how one bad run becomes two. The report gives you exactly what you need
to undo it by hand or to build a targeted correction file.

## What validation checks

Errors block the run. Every error in a run is reported, not just the first,
so a catalogue export can be fixed in one pass.

**Errors**

- Handle is not a clean slug, or collides with a listing route slug (which
  would make the product permanently unreachable)
- Duplicate handle or duplicate SKU within the file
- Any tag outside the locked taxonomy
- Not exactly one `type:` tag, or not exactly one `price:` tag
- A `price:` tag that disagrees with the price
- No images, empty alt text, or alt text that describes nothing ("Image 2")
- Fewer than four images on a hamper
- Empty allergens or empty contents on a hamper
- Missing or empty variants, non-positive price, compare-at price below the
  selling price
- `badge:exclusive` and `wine.is_exclusive_import` disagreeing
- Em dash or en dash in the description
- Any banned word
- Any popularity claim
- `needsReview` set

**Warnings** (do not block)

- No packaging description on a hamper
- No ABV on a drink
- A price-shaped string in `wine.rrp_comparison`
- `hamper.occasion_tags` not mirrored in the product tags
- Description word count outside the expected range for its type

## Input format

`src/lib/catalogue/schema.ts`. One JSON file:

```json
{
  "source": "Retained catalogue export, 2026-09-01",
  "currencyCode": "EUR",
  "products": [ ... ]
}
```

The same format the front end reads as its fixture catalogue, so data that
passes ingest renders correctly and vice versa.
