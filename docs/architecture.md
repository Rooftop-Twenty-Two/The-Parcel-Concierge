# Architecture

## Layers

| Layer | Tool | Owns |
|---|---|---|
| Front end | Next.js App Router, TypeScript, Tailwind | All rendering, routing, IA, merchandising logic |
| Commerce | Shopify, headless | Products, variants, prices, inventory, orders, customers, discounts, checkout |
| Content | Headless CMS (Sanity recommended). Currently a local content store | Editorial copy, hub pages, gift guides, maker profiles, homepage slots, curation |
| Search and filter | Storefront API product filters | Faceted browse |
| Reviews | Trustpilot API | Ratings, review content, rich snippets |
| Hosting | Vercel | ISR, edge middleware, redirects, image optimisation |

## Source-of-truth rules

These are not conventions, they are enforced by the type system and by the
shape of the modules.

**Shopify owns price, inventory, variants and order state.** Nothing in
`src/lib/cms/types.ts` has a price, a stock level or a variant, and there is
nowhere to put one. If a CMS field could go stale against Shopify, it does
not exist.

**The CMS owns words and curation.** Collection intro copy, SEO blocks,
occasion hubs, guides, homepage ordering, and which products appear in a
curated slot. It references Shopify products by handle only.
`npm run content:report` fails if a CMS document points at a handle that is
not in the catalogue.

**Product descriptions live in Shopify** as the product body plus
metafields, so they stay attached to the product wherever it appears. The
CMS does not own them and cannot.

## The commerce interface

Everything that touches product data goes through `src/lib/commerce`. It
dispatches to Shopify when `SHOPIFY_STORE_DOMAIN` and
`SHOPIFY_STOREFRONT_TOKEN` are present and to the fixture catalogue when
they are not.

That is not a development convenience bolted on the side. It is the reason
the pages are written once: no component knows or can find out which backend
is answering, so a page that renders in fixture mode renders against the
real store. The fixture catalogue is read from the same interchange file the
ingest tool publishes from, so the data is the same shape too.

Fixture mode is loud about itself: a red banner, `noindex`, an empty
sitemap, and a checkout button that leads to a page explaining why there is
no checkout. A site serving invented products must never look like a shop
that is open.

## Reading data

**Storefront API (GraphQL)** for everything customer facing. Queries request
only the fields a component renders. There is deliberately no
"fetch the whole product" fragment: the moment one exists, every listing
page starts paying for metafields it never shows.

**Cart API** for the cart, with `checkoutUrl` handing off to Shopify hosted
checkout. The cart id is held in an httpOnly cookie. We hold nothing else.

**Personalisation travels as cart line attributes**, so the gift message,
the ribbon colour and the branded card survive into the Shopify order and
reach the packing bench. They are not stored in a separate system that
somebody has to remember to check.

**Custom-built hampers go into the cart as a parent line plus component
lines**, linked by a `_bundleId` attribute. The decision and the reasoning
are recorded in `src/lib/hamper-builder.ts`. Short version: each component
is a real variant, so Shopify decrements the right stock and refuses to
oversell a component that has run out, and the packing bench gets a real
picking list. A Shopify bundle product would need its own inventory rules
and would happily sell a hamper whose contents are gone, which is the exact
failure the brief warns about.

## Caching and freshness

Static generation with on-demand revalidation driven by Shopify webhooks:
`products/create`, `products/update`, `products/delete`,
`inventory_levels/update`, `collections/update`. The receiver is at
`/api/webhooks/shopify` and every request is HMAC verified.

Cache tags are per product handle and per collection path, so a single
product change rebuilds that product and the listings it can appear on,
never the whole site. Time-based revalidation is a long backstop for a
missed webhook, not the primary mechanism.

**Stock and price are verified live at add-to-cart and again at checkout
handoff.** A cached page can never complete a sale for something that is
gone. This matters most for hampers, whose components sell out underneath
them, and most of all for a built hamper: the shopper has spent five minutes
choosing, and finding out at checkout that one component is gone loses the
order. `verifyLines` checks the whole bundle before anything is added, and
returns every problem rather than the first.

### Why the root layout reads no cookies

Reading a cookie in the root layout opts every page on the site out of
static rendering. The cart badge and the age gate both need per-visitor
state, so both resolve after hydration through `/api/cart` and
`/api/age-check` instead. That keeps 126 pages static, which is what the LCP
budget needs.

The age-gate cookie stays httpOnly. The client asks the server whether it is
set rather than reading it, so it cannot be forged from script.

## Non-functional requirements

**Performance budget:** LCP under 2.5s on 4G mobile, CLS under 0.1, INP
under 200ms. Hamper photography is the heaviest asset on the site, so:
`next/image` with AVIF and WebP, responsive `srcset`, `priority` on the hero
only, lazy below the fold, no autoplay carousels on mobile, and no cookie
reads in the layout. The measured pass waits on the real shoot.

**Accessibility:** WCAG 2.2 AA. Visible focus that is never removed, real
alt text on every hamper image describing contents (enforced by the ingest
validator, not by review), `prefers-reduced-motion` respected globally, a
skip link, and a real focus-trapped dialog for the age gate. Accordions are
`details`/`summary`, so they work without JavaScript.

**Age verification** on wine and spirits routes and at the cart, appropriate
to Irish and UK alcohol delivery rules. **Flagged for legal sign-off.**

**Structured data:** Product, Offer, AggregateRating, BreadcrumbList,
FAQPage, LocalBusiness. Nothing is asserted in JSON-LD that is not on the
page: a rating in the markup with no stars on the page is a manual action
waiting to happen.

**Analytics:** GA4 with full e-commerce events, plus Meta and Google Ads.
Every event carries a budget band. The purchase event is not fired here.
See `docs/analytics.md`.

**Secrets:** the Admin API token is read by `scripts/ingest` only; nothing
under `src/` touches it. The Storefront token is public scoped and read
only.

## Swapping the CMS in

`src/lib/cms/index.ts` is the only file that knows where words come from.
Today it reads `src/lib/cms/content.ts`. To move to Sanity:

1. Add the client and a projectId/dataset to the environment.
2. Replace each function body with its GROQ query, tagged with
   `cmsTag(documentType)` so the CMS webhook can revalidate it.
3. Delete `content.ts`.

No page changes.
