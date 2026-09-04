# Information architecture and routes

Phase 1 deliverable. **Needs client approval before any further build.**

Two open questions are at the end. Everything else is implemented.

---

## Sitemap

```
/
├── /hampers                                      [HUB, the hero]
│   ├── /hampers/under-75
│   ├── /hampers/75-125
│   ├── /hampers/125-200
│   ├── /hampers/luxury-200-plus
│   ├── /hampers/wine · /food · /whiskey · /pamper
│   ├── /hampers/new-baby · /sympathy · /anniversary · /thank-you
│   ├── /hampers/corporate
│   └── /build-your-own-hamper                    [ON DOMAIN]
│
├── /wine                                         [HUB, "The Wine Vault"]
│   ├── /wine/exclusive-to-us
│   ├── /wine/value-edit
│   ├── /wine/champagne-sparkling
│   ├── /wine/red · /white · /rose
│   ├── /wine/port-dessert
│   ├── /wine/irish-whiskey · /gin-and-spirits
│   ├── /wine/gift-sets
│   └── /wine/under-25 · /25-50 · /50-plus
│
├── /corporate-gifting                            [FULL B2B FLOW]
│   └── /corporate-gifting/enquiry
│
├── /occasions
│   ├── /occasions/christmas                      [evergreen URL]
│   ├── /occasions/mothers-day · /fathers-day · /valentines · /easter
│   ├── /occasions/new-baby · /sympathy
│   ├── /occasions/wedding-engagement
│   └── /occasions/get-well
│
├── /gifts-for/her · /him · /couples · /clients
├── /gifts-by-budget/under-50 · /50-100 · /100-150 · /150-plus
│
├── /gifts                                        [ADD-ON BAND ONLY]
│   ├── /gifts/candles-diffusers
│   ├── /gifts/chocolate-treats
│   ├── /gifts/crystal-glassware
│   └── /gift-card
│
├── /guides · /guides/[slug]
├── /about · /about/our-makers · /about/guaranteed-irish
├── /delivery
├── /faq
├── /contact
└── /legal/terms · /privacy · /returns · /cookies
```

Product routes: `/hampers/[handle]`, `/wine/[handle]`, `/gifts/[handle]`.

## How listings and products share a segment

Both live one segment under their hub, which is what the agreed sitemap
specifies. So a single dynamic route resolves the segment, checking the
collection registry first and the product catalogue second
(`src/lib/resolve-route.ts`).

Collection first matters. A collection slug is a URL we control and have
promised to search engines; a product handle is data. If a product ever
lands with the handle `under-75`, the listing must win. The ingest tool
blocks that collision at write time so it cannot happen silently, and there
is a test for it.

A product only renders under its own canonical hub. Reaching a hamper at
`/wine/the-meath-larder` returns 404 rather than serving a second URL for
the same product, which is exactly what the old site did.

## The route registry

Every listing on the site is one row in
`src/lib/commerce/collections.ts`. Adding a listing means adding a row, not
adding a route file. The registry drives the dynamic routes, the sitemap,
breadcrumbs, structured data and the min-four rule.

Each row carries: slug, hub, path, title, H1, the query that fills it,
whether it can contain alcohol, which facets it exposes, and its parent.

## Rules

**No empty listings ship.** Fewer than four products and the route redirects
to its parent and is excluded from the sitemap. Implemented in
`ListingPage`, so it cannot be forgotten, and in `sitemap.ts`, so an
under-populated listing is never submitted for indexing. `npm run
content:report` lists any listing that would fall below the floor.

The rule applies to the unfiltered listing. A filter that returns nothing is
a legitimate empty state with a "clear filters" link, not a broken route.

**Filters are URL driven and server rendered**, so `?grape=malbec&price=50-100`
is shareable and crawlable. Every filter control is a link, so the whole
thing works without JavaScript and the keyboard order is the reading order.
Any active filter puts the view behind `noindex, follow`: shareable, but not
competing with the listing it came from.

**Grape variety, region, style and budget are facets, not routes.** The old
site's roughly 50 grape sub-collections do not come back. There is a test
that fails if one does.

**Every listing page has the same copy order:** H1, 60 to 100 words of
intent-matching copy above the grid, the grid, filters, then a 150 to 250
word SEO block below. All of it from the CMS. A route with no copy still
renders, minus those two blocks, and appears in the content report.

## Navigation

Top level is exactly: **Hampers · Wine & Spirits · Corporate · Occasions ·
Gifts · Guides · About**.

Maximum depth is two. The old mega-menu was three deep and unusable on a
phone, which is where most gift buying happens.

Every mega-menu panel carries one hamper image and one promoted listing, not
just a list of links. "Build your own hamper" has a persistent, visually
distinct entry point in the header on desktop and at the foot of the mobile
menu.

## Two open questions

### 1. Five occasion routes have no tag in the locked taxonomy

`/occasions/mothers-day`, `/fathers-day`, `/valentines`, `/easter` and
`/get-well` are in section 4's sitemap. Section 6's locked taxonomy has no
tag for any of them.

Built as CMS-curated listings, which is allowed and works today. The
alternative is five new tags.

Our recommendation: keep the seasonal four curated, because the right
products for Mother's Day change every year and a tag would have to be
re-applied across the catalogue annually. Get well is a closer call and
would be reasonable as a tag. Your call.

### 2. Hamper budget bands and gift budget bands use different numbers

Hampers split at 75, 125 and 200. Gifts split at 50, 100 and 150, which is
also what the `price:` tags and the GA4 budget dimension use. Both are
straight from the brief.

Both are defensible: hampers sit higher up the price line than the catalogue
as a whole, so a hamper-specific set of bands genuinely serves the shopper
better. The cost is that "the €100 band" means two different things
depending on the page, and a report segmented by `price:` tag will not line
up with hamper band performance.

If you want them to match, it is four rows in the registry.
