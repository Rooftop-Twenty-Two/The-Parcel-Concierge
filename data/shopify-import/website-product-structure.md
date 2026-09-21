# What the current website actually reads

Established by reading the codebase on 21 September 2026, not from the old
site, generic Shopify convention or the export's own tags. Every claim
below names the file it came from.

The short version: **collections decide which page a product appears on,
and a product CSV cannot set collections.** Tags decide what a product
*is* and what the filters offer. So a CSV re-import can fix classification
and filtering across the catalogue, and cannot by itself put anything on a
listing page.

---

## 1. Website sections

From `src/lib/routes.ts` (nav) and `src/lib/commerce/collections.ts` (the
listing registry).

| Section | Paths |
|---|---|
| Hampers | `/hampers`, and the four price bands `/hampers/under-75`, `/75-125`, `/125-200`, `/luxury-200-plus` |
| Wine | `/wine` plus 13 listings (see below) |
| Occasions | `/occasions/christmas` and 8 others |
| Gifts for | `/gifts-for/her`, `/him`, `/couples`, `/clients` |
| Gifts by budget | four bands, all reading All Gifts |
| Gifts | `/gifts/candles-diffusers`, `/chocolate-treats`, `/crystal-glassware` |
| Corporate | `/corporate-gifting` and its enquiry and campaign flows |
| Build your own hamper | `/build-your-own-hamper` |
| Search | `/search`, reads the whole store |

Hamper *theme* listings (wine, food, pamper, new baby, sympathy,
anniversary, thank you, corporate) exist in the registry but are
suppressed while `SEASONAL_HAMPERS_ONLY` is true. They read retired
collections. **Do not tag for them.**

## 2. Shopify collections referenced

Every listing reads one native collection by handle. This is the complete
set the site reads, from `COLLECTIONS` in `collections.ts` and
`PICKER_SHELVES` in `src/lib/hamper-builder.ts`.

**Hampers, and the homepage hamper band:** `christmas-2026` (the live
range; its title is "General Hampers 2026" but Shopify kept the handle
from an earlier rename).

**Wine:** `fine-wines-1` (the master: feeds the Wine Vault, Fine wines and
all three wine price bands), `red-wines-1`, `white-wines-1`, `rose`,
`champagne-and-prosecco-1`, `port-and-sherry-1`, `organic-wine`,
`non-alcoholic-1`, `wine-gift-sets`, `exclusive-to-us` (does not exist
yet).

**Occasions:** `mothers-day-gifts`, `fathers-day`, `valentines-day`,
`easter-1`, `gifts-for-baby`, `wedding-anniversary`, `sympathy` and
`get-well` (neither exists yet).

**Gifts for:** `gifts-for-her-1`, `gifts-for-him-1`, `gifts-for-couples-1`,
`gifts-for-customers`.

**Gifts and budget:** `all-gifts`, `candles-diffusers`,
`chocolate-confectionery-1`, `glassware-crystal`.

**Build a Box picker shelves:** `all-gifts`, `all-food`,
`chocolate-confectionery-1`, `fine-wines-1`, `champagne-and-prosecco-1`,
`candles-diffusers`, `beauty`, `homeware`, `baby`, `jewellery`,
`greeting-cards`.

`/wine/value-edit` is CMS-curated by handle and reads no collection.

## 3. Tags and product fields the site reads

### Product kind, which decides the URL, the template and the age gate

`kindFromMembership` in `src/lib/shopify/normalise.ts`, in this order:

1. `Type` (product type) is `GIST_BUILDER_PRODUCT` → builder mechanism
2. tag `type:builder-item` → builder item
3. tag `type:hamper` → hamper
4. tag `type:wine` → wine
5. tag `type:spirit` → spirit
6. tag `type:addon` → add-on
7. collection membership: a collection whose handle contains "hamper" and
   does not start "gifts-", or is the live seasonal handle → hamper; one
   of 23 named wine handles → wine; any collection at all → add-on
8. otherwise the product type text

**This is the one place a CSV can change site behaviour directly.** A
`type:` tag outranks collection membership. A wine tagged `type:wine`
gets `/wine/<handle>`, the wine template and the age gate even if it is in
no wine collection.

### Filters

`cardFacetValues` in `src/lib/commerce/index.ts`.

| Filter | Source |
|---|---|
| Grape | `wine.grape` metafield if present, else product tags through `grapeFromLabel` |
| Country | `wine.country` metafield if present, else tags through `countryFromLabel` |
| Region | `wine.region` metafield if present, else tags through `regionFromLabel` |
| Style (body, sweetness) | `wine.*` metafields only. Not on the store, so this filter never shows |
| Price | computed from the product's own price, not from a tag |
| Occasion | tags beginning `occasion:` |
| Recipient | tags beginning `recipient:` |

The lookups in `src/lib/commerce/taxonomy.ts` are deliberately forgiving.
`grapeFromLabel` folds case, accents and a trailing "Wine", so "Syrah
WIne", "syrah" and "Syrah Wine" all give Syrah. `countryFromLabel` accepts
"French Wines", "french wine" and "France". `regionFromLabel` needs the
tag to be the region on its own.

**Consequence that governs this whole job: the old tags are not legacy
noise, they are the live filter feed.** Stripping "French Wines" or
"Chenin Blanc Wine" would empty the Country and Grape filters. They stay.

### Other tags read at runtime

- `contains:alcohol` — arms the age gate for a Build a Box item and marks
  a corporate gift as alcoholic. Read in `api/builder-items/route.ts`,
  `actions/corporate-campaign.ts` and `corporate-gifting/new/page.tsx`.
- `badge:*` — drives card flags. `badge:exclusive` must agree with the
  `wine.is_exclusive_import` metafield, which the store does not have, so
  it cannot be set safely from a CSV.
- `price:*` — the live site computes the price band from the price and
  ignores the tag. Defined in the locked taxonomy and used by the fixture
  catalogue, so it is safe and deterministic to carry, but it changes
  nothing on the live site today.
- `aisle:*` — defined in the taxonomy and read by nothing. Do not apply.

### Fields other than tags

`Type` matters twice: as `GIST_BUILDER_PRODUCT` for the builder boxes, and
as the last-resort kind guess. `Published` and stock decide visibility:
listings and search hide anything out of stock.

## 4. Automated collection logic

**There is none.** No code creates or maintains a Shopify collection. The
site reads collections by handle and takes whatever the merchant put in
them. The wine collections were confirmed manual by the Tokara case: a
wine correctly tagged "White Wine" and "Fine Wines" was in neither
collection and so appeared on no wine page.

Automating them on the existing tags is the recommendation in
`docs/collections-and-tags.md`. It is not in place, and it is a Shopify
admin job, not a CSV one.

## 5. Build a Box

Live behaviour, from `src/app/api/builder-items/route.ts`:

1. The picker asks for one shelf at a time. A shelf is a collection handle
   from `PICKER_SHELVES`, listed above. A search instead runs a title
   query across the whole store.
2. The route then **drops every product whose kind is `builder-item`**.

So on the live store, availability in Build a Box is decided by membership
of those 11 collections and nothing else.

**Therefore `type:builder-item` must never be applied to a real product.**
It would remove the product from the picker, from every listing, from
search and from the sitemap, leaving it with no route to purchase at all.
The tag exists for the fixture catalogue, where a different code path
(`fixtures.ts`) treats it as pickable. The two behave oppositely and the
live one is what a Shopify import hits.

The builder's own box products are excluded everywhere by handle
(`HIDDEN_FROM_LISTINGS`: `build-a-hamper`, `build-a-premium-hamper`,
`gift-bow`) and by the `GIST_BUILDER_PRODUCT` product type.

## 6. Christmas

Entirely collection-driven. `SEASONAL_HAMPERS_COLLECTION` is
`christmas-2026` and `/occasions/christmas`, the hampers hub, the hamper
price bands and the homepage band all read it.

The only tag involvement is `occasion:christmas`, which is a filter value
on listings exposing the occasion facet. It does not put a product on the
Christmas page.

Christmas photography is separate and lives in the site, not Shopify:
`src/lib/commerce/christmas-images.ts` maps a handle to a festive
photograph shown only on `/occasions/christmas`.

## 7. Old categories that are no longer standalone sections

The brief for the rebuild, recorded in
`scripts/catalogue/import-builder-items.mjs`, is that the site sells
hampers and wine, and everything else the shop carries is sold as
something you put in a hamper.

Greeting cards, jewellery, socks and accessories, homeware and kitchen,
beauty and bath, baby and children, and general food and larder lines have
no standalone storefront section. Candles and diffusers, chocolate and
treats, and crystal and glassware are the exception: they survive as three
small add-on listings under `/gifts`.

Those products must stay published and in their picker collections. Not
being a standalone category is not a reason to retire a product.

---

## What this means for the CSV

Can be done by import, and is worth doing:

- `type:` tags, which set the kind directly and outrank collections.
- `occasion:` and `recipient:` tags, which fill the occasion and recipient
  filters. The old-site vocabulary maps onto them one for one and the
  mapping is already written in `import-shopify-export.mjs`.
- `contains:alcohol` on the beer, cider and liqueur lines the wine
  importer never claimed.
- Normalising the wine tags that feed Country, Region and Grape, while
  keeping every original spelling that already works.

Cannot be done by import:

- Collection membership. There is no collection column in a Shopify
  product CSV, and these collections are manual.
- Anything needing the `wine.*` metafields, including the Style filter and
  the exclusive-import badge.

So after this import, products will be classified and filterable, and will
still only appear on a listing when they are in that listing's collection.

---

## What the run produced

`node scripts/shopify/retag-export.mjs --input <export.csv> --outdir data/shopify-import`

3,168 products across 4,835 rows. Every row written back; the only column
that differs from the original is Tags.

| Classification | Products | What was applied |
|---|---:|---|
| Build a Box item | 2,606 | no `type:` tag, plus occasion, recipient, price and alcohol where identifiable |
| Wine | 356 | `type:wine`, `contains:alcohol`, and country, region, grape and colour tags where the site could not already read one |
| Add-on gift | 144 | `type:addon` (candles and diffusers, chocolate, crystal and glassware) |
| Hamper | 46 | `type:hamper` |
| Spirit | 13 | `type:spirit`, `contains:alcohol` |
| Build a Box mechanism | 2 | untouched |
| Gift card | 1 | untouched |

5,686 tags added, 0 removed. 596 products flagged for review: 526 have no
product type and no tags at all, and 70 are wines missing a country or a
colour.

Validation, all passing: 4,835 rows in and out; 105 columns in the same
order; zero differences in any column other than Tags; all 3,168 handles
unchanged; no original tag dropped.
