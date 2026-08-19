# The Parcel Concierge

Bespoke front end for The Parcel Concierge, with Shopify as a headless
commerce backend. Built by Rooftop Twenty Two against the August 2026 build
brief.

The strategic decision behind the rebuild, which everything else follows
from:

> The Parcel Concierge stops being a broad gift shop and becomes a
> hamper-led premium gifting business, with fine wine and Irish spirits as
> the second pillar.

---

## Running it

```bash
npm install
npm run dev
```

It runs with no configuration. With no Shopify credentials the front end
serves the fixture catalogue in `data/catalogue/fixtures.json`, shows a
preview banner, and sets `noindex`. Everything else, including the cart, the
personalisation, the stock check and the hamper builder, works exactly as it
will against a real store.

To connect a store, set `SHOPIFY_STORE_DOMAIN` and
`SHOPIFY_STOREFRONT_TOKEN`. Nothing else changes: every component goes
through the same interface either way.

Copy `.env.example` to `.env.local` for the full list of variables.

It deploys to Netlify or Vercel. `netlify.toml` and `.nvmrc` are committed;
see [`docs/deployment.md`](docs/deployment.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Builds the redirect map, then the site |
| `npm run check` | Typecheck, lint, redirect validation, content report, tests |
| `npm test` | Unit tests |
| `npm run ingest -- --input <file>` | Ingest dry run. Writes nothing |
| `npm run ingest -- --input <file> --write` | Applies the plan |
| `npm run ingest:definitions` | Metafield definitions dry run |
| `npm run redirects:validate` | Checks the redirect map for chains, loops and dead ends |
| `npm run redirects:build` | Generates `src/generated/redirects.json` from the CSV |
| `npm run redirects:products` | Generates per-product redirect rows from a retain/remove list |
| `npm run content:report` | What copy is still missing, and which listings fall below the floor |
| `npm run fixtures:generate` | Regenerates the fixture catalogue |

## Documentation

| Document | What is in it |
|---|---|
| [`docs/build-status.md`](docs/build-status.md) | **Start here.** What is built, what is blocked, and what we need from the client |
| [`docs/deployment.md`](docs/deployment.md) | Netlify and Vercel setup, and what a preview deploy looks like |
| [`docs/architecture.md`](docs/architecture.md) | Layers, source-of-truth rules, caching, the decisions and why |
| [`docs/ia-and-routes.md`](docs/ia-and-routes.md) | Sitemap, route list, the min-four rule, open IA questions. Phase 1 sign-off |
| [`docs/metafields.md`](docs/metafields.md) | The product data model |
| [`docs/taxonomy.md`](docs/taxonomy.md) | The locked tag taxonomy and how it is enforced |
| [`docs/copy-style-guide.md`](docs/copy-style-guide.md) | House style, templates, the banned-word list |
| [`docs/redirects.md`](docs/redirects.md) | The migration process. The biggest single risk in the project |
| [`docs/ingest.md`](docs/ingest.md) | How the ingest tool works and how to roll a run back |
| [`docs/analytics.md`](docs/analytics.md) | GA4 events, and how to prove purchase fires once across the handoff |
| [`docs/design-direction.md`](docs/design-direction.md) | The visual language and where it came from |

## How it is put together

```
src/
  app/                     Routes. One dynamic route per hub resolves
                           listings and products on the same segment.
  components/
    builder/               The on-domain hamper builder
    cart/  commerce/       Cart, delivery promise, age gate
    listing/               ListingPage and HubPage. Every listing renders
                           through ListingPage, which is where the
                           min-four rule and the filter noindex live.
    product/               Hamper, wine and add-on templates
  lib/
    catalogue/             The interchange format shared with the ingest tool
    cms/                   Content adapter. Swap point for Sanity.
    commerce/              The one interface to product data. Dispatches to
                           Shopify or to fixtures.
    shopify/               Storefront client, queries, normalisation, cache tags
scripts/
  ingest/                  The Admin API ingest tool
  redirects/               Redirect map build and validation
  content/                 Content integrity report
  fixtures/                Fixture catalogue generator
data/
  catalogue/               Product interchange files
  redirects/redirects.csv  The redirect map. Source of truth.
docs/reference/            The supplied brand guidelines, design and assets
```

## The rules this codebase enforces

These are from section 12 of the brief. They are enforced in code rather
than left to review, so a regression fails a command rather than reaching a
shopper.

| Rule | Where it is enforced |
|---|---|
| No custom checkout | `lib/commerce/cart.ts` hands off to Shopify `checkoutUrl` |
| No price or stock in the CMS | `lib/cms/types.ts` has no price or stock fields |
| Grape variety is a filter, not 50 routes | `lib/commerce/collections.ts`, tested in `tests/routes.test.ts` |
| No product ingested with empty allergens, contents or images | `scripts/ingest/validate.ts`, tested |
| No "bestseller" without data | `scripts/ingest/validate.ts`, tested |
| The hamper builder stays on this domain | `/build-your-own-hamper` |
| No em dashes | `scripts/ingest/validate.ts`, tested |
| No competitor prices in copy | `scripts/ingest/validate.ts` warns on any figure in `rrp_comparison` |
| No listing under four products | `components/listing/ListingPage.tsx` and `app/sitemap.ts` |
| Nothing unpublished before its redirect exists | `npm run redirects:validate` gates the build |
| No out-of-stock product as an indexable page | Product queries exclude them; PDPs set `noindex` when sold out |
