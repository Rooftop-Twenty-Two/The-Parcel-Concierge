# Product data model

All of this lives in Shopify metafields, so it survives in the order and
stays attached to the product wherever it appears.

Defined in three places that must stay in step:

- `scripts/ingest/metafield-definitions.ts` creates them in Shopify
- `src/lib/commerce/types.ts` is the shape the front end renders
- `src/lib/catalogue/schema.ts` is the interchange format

Every definition sets `access.storefront: PUBLIC_READ`. Without that the
front end cannot read the metafield at all, and it is the single most common
way a headless Shopify build silently loses half its product data.

---

## Hampers, `hamper.*`

| Key | Shopify type | Notes |
|---|---|---|
| `contents` | `json` | Array of `{ name, producer, size }`. Renders as the "What is inside" list. **Mandatory.** |
| `producers` | `list.single_line_text_field` | CMS maker-profile slugs. Links to maker pages |
| `allergens` | `multi_line_text_field` | **Mandatory. Blocks ingest if empty.** |
| `contains_alcohol` | `boolean` | Drives the age gate and the alcohol delivery rules |
| `packaging` | `multi_line_text_field` | What the box looks like when it arrives. This is what shoppers are paying for and it was unsaid on the old site |
| `personalisation` | `json` | Array of options offered. See below |
| `dimensions_weight` | `single_line_text_field` | Drives shipping and the "will it fit" question |
| `lead_time` | `single_line_text_field` | For hampers packed to order. Shown on the PDP and in the cart |
| `occasion_tags` | `list.single_line_text_field` | Mirrors the `occasion:` product tags |
| `recipient_tags` | `list.single_line_text_field` | Mirrors the `recipient:` product tags |

### `contents`

```json
[
  { "name": "Kilbeg Farmhouse Cheddar", "producer": "Kilbeg Dairy", "size": "200g" },
  { "name": "Sheridans Brown Bread Crackers", "producer": "Sheridans", "size": "160g" }
]
```

Renders as a list on the product page, never buried in prose. It is the
thing the shopper is actually trying to read.

### `personalisation`

```json
[
  { "kind": "gift-message", "label": "Gift message", "maxLength": 250 },
  { "kind": "ribbon-colour", "label": "Ribbon colour", "choices": ["Forest green", "Gold"] },
  { "kind": "branded-card", "label": "Add a branded card" }
]
```

Whatever the shopper enters travels to Shopify as a cart line attribute, so
it reaches the packing bench on the order.

---

## Wine and spirits, `wine.*`

| Key | Shopify type | Notes |
|---|---|---|
| `producer` | `single_line_text_field` | Estate, bodega or distillery |
| `region` | `single_line_text_field` | A filter on `/wine`, not a route |
| `country` | `single_line_text_field` | A filter on `/wine` |
| `grape` | `list.single_line_text_field` | A filter on `/wine`. **Never 50 separate collections** |
| `vintage` | `single_line_text_field` | Year, or absent for non-vintage |
| `abv` | `number_decimal` | Percentage |
| `volume` | `single_line_text_field` | e.g. `75cl` |
| `style_body` | `single_line_text_field` | `light`, `medium` or `full` |
| `style_sweetness` | `single_line_text_field` | `dry`, `off-dry` or `sweet` |
| `tasting_note` | `multi_line_text_field` | In language a gift buyer understands, not a sommelier |
| `food_pairing` | `multi_line_text_field` | |
| `awards` | `list.single_line_text_field` | Verified awards only |
| `is_exclusive_import` | `boolean` | Drives `/wine/exclusive-to-us`. Must agree with `badge:exclusive` |
| `rrp_comparison` | `single_line_text_field` | **Only where we hold dated, verified evidence** |

### `rrp_comparison`

This field is the one with a rule attached rather than a format.

It is only populated where we hold a dated, verified comparison. It never
names another retailer and never quotes a figure, because prices move and a
claim that was true last month is a problem this month. The ingest validator
warns on any price-shaped string in it.

The value edit page at `/wine/value-edit` is CMS-curated rather than
queried for the same reason: a query cannot know which wines we hold
evidence for, and the page has to come down cleanly when evidence goes
stale.

---

## Why the split is where it is

Anything a shopper needs to see on the product page, or that the client
needs on the order, is a metafield in Shopify. Anything editorial that
applies to a page rather than a product is in the CMS.

The dividing line is stale-ability. A metafield travels with the product
into the order. A CMS field does not, so if it could go out of date against
Shopify it does not exist.
