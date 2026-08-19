# Build status

Where this build has got to, what is blocked, and what we need from the
client to finish.

Last updated: 19 August 2026.

---

## The one decision that is still open

**Section 0, item 1 of the brief asks for the stack to be confirmed before
work starts. It has not been confirmed, and this build proceeds on the
recommendation: Next.js App Router, TypeScript, Tailwind, deployed on
Vercel.**

The brief bounds the risk itself: "sections 4 to 10 hold unchanged and only
section 3 gets rewritten." That is what we have relied on. The IA, the tag
taxonomy, the metafield schema, the copy, the redirect map, the ingest tool
and the catalogue interchange format are all framework independent and
survive a change of stack intact. What would be rewritten is the routing and
rendering layer under `src/app` and `src/components`.

If R22 wants a different framework, say so and we will scope the rewrite.
Everything else stands.

---

## What is built

### Phase 1, information architecture

- Full sitemap implemented as a route registry
  (`src/lib/commerce/collections.ts`). Every listing is one row.
- Tag taxonomy locked and enforced in code
  (`src/lib/commerce/taxonomy.ts`).
- Metafield schema defined once and shared by the front end, the ingest tool
  and the Shopify definitions (`docs/metafields.md`).
- **Needs sign-off.** Two IA questions are open, listed under "Open
  questions" below.

### Phase 2, catalogue decisions

- Redirect map format, tooling and validator built.
- Structural rules and worked examples written into
  `data/redirects/redirects.csv`.
- **Blocked** on the retain/remove list and Search Console access. The
  per-product rows are generated from those, not hand-written.

### Phase 3, ingest tool

- Built, with dry-run default, SKU idempotency, validation that blocks,
  taxonomy enforcement, metafield definitions first, run-report CSV and
  cost-based throttling with backoff.
- Clean dry run against the full 85-product fixture catalogue, which is the
  phase gate. Not yet run against a real store: no Admin API access.

### Phase 4, front-end foundations

- Routing, Storefront API layer, cart with Shopify hosted checkout handoff,
  cache tags, webhook revalidation, live stock and price verification at
  add-to-cart.
- 126 pages prerendered at build. Product pages are static; listings are
  server rendered because they read filter parameters.
- **Lighthouse has not been run.** There is no real photography yet and
  hamper photography is the heaviest asset on the site, so a score measured
  against placeholder PNGs would be meaningless. The budget work that can be
  done without the shoot is done: AVIF and WebP, responsive `srcset`,
  priority on the hero only, lazy below the fold, no autoplay carousels, and
  no cookie reads in the root layout.

### Phase 5, templates

- Home with all ten required modules, hamper hub, hamper PDP, wine hub, wine
  PDP, add-on PDP, corporate flow, delivery page, cart, guides, about,
  makers, FAQ, 404.
- **Needs design review**, and needs the real photography before the hero,
  the hamper hub and the product template are signed off.

### Phase 6, hamper builder

- Built, on domain, at `/build-your-own-hamper`.
- Cart bundle decision made and documented in `src/lib/hamper-builder.ts`:
  parent line plus component lines, linked by a bundle id in line
  attributes. The reasoning is in that file.
- **Not yet tested end to end through a real Shopify checkout.** No store.

### Phase 7, content

- Listing copy written for 25 of the highest-value routes. `npm run
  content:report` lists what is outstanding.
- 85 fixture product descriptions written to house style, and the style
  rules are enforced by the ingest validator rather than by review.
- Delivery page, FAQ, three guides, about, makers and Guaranteed Irish
  written.
- **Legal pages are deliberately unwritten.** Terms, privacy, returns and
  cookies make binding statements about a business we do not run. The routes
  exist, are linked, are `noindex`, and say honestly that the text is being
  finalised. Filler that reads as real policy would be worse than the blank
  shipping page the review found.

### Phase 8, trust and conversion

- Trustpilot stars server rendered on home, listing, product and cart, with
  live API refresh when credentials arrive.
- Newsletter signup with the 10% first-order incentive.
- Cross-sell on hamper, wine and add-on pages, and at the cart.
- **The free-delivery progress nudge is built but does not render**, because
  no threshold has been set. See outstanding item 4.

### Phase 9, pre-launch

- Structured data: Product, Offer, AggregateRating, BreadcrumbList, FAQPage,
  LocalBusiness.
- Sitemap excludes under-populated listings and out-of-stock products.
- Age gate built and armed on every alcohol route and at the cart.
- Analytics events built, with the purchase event deliberately absent here.
- **Not done:** redirects live and tested against the real inventory,
  structured data validated in Google's tool against real data, analytics
  verified firing once across the handoff, legal sign-off on the age gate.

---

## What we need from the client

These are the items from section 13 of the brief, with what each one is
currently blocking.

| # | Item | Blocking |
|---|---|---|
| 1 | Brand asset pack: logo suite, colours, licensed fonts | **Part received.** Logos, colours and graphic devices arrived and are in use. The four licensed fonts (Bebas Kai, Salfish, South Epic, Futura) did not. We are running open substitutes; swapping in the real files is one file, `src/lib/brand/fonts.ts` |
| 2 | The 12 hamper shots plus a shot list mapping images to SKUs | Design sign-off on the hero, hamper hub and product template. Also the Lighthouse pass, which is not worth measuring against placeholders |
| 3 | Final retain/remove decision on jewellery, crystal, homeware | The redirect map. `/collections/jewellery` currently has a provisional rule |
| 4 | Free hand-delivery zone, by county or eircode | The delivery page names no zone and invites the shopper to check instead. Also the free-delivery cart nudge, which does not render without a threshold |
| 5 | Corporate volume pricing tiers and lead times | The bulk orders page says pricing is quoted on enquiry rather than printing a table |
| 6 | Search Console and GA4 access | The redirect map is built from what actually gets traffic, not from what we assume exists. This is the biggest risk item |
| 7 | Trustpilot account access | Stars use the verified June figures rather than live ones |
| 8 | Shopify Admin API access, and confirmation of the plan | Everything downstream: the ingest run, the real catalogue, checkout styling depth, and the end-to-end purchase test |

Also needed, and not on the section 13 list:

- **Legal sign-off on the age gate.** It is a self-declared check, which is
  the common pattern for online alcohol retail in Ireland and the UK, but
  the acceptable standard is a legal question and it differs between the two
  jurisdictions. The mechanism is built so a stronger check is a change to
  one component and one API route.
- **Policy text** for the four legal pages.
- **Phone number, email address and opening hours** for the contact page. It
  currently routes people to the corporate form and states where we are,
  rather than printing a number nobody confirmed.
- **A form destination.** Corporate enquiries and newsletter signups are
  logged server side until `CORPORATE_ENQUIRY_WEBHOOK` and
  `NEWSLETTER_WEBHOOK` point somewhere. That is fine for a preview and is a
  launch blocker.

---

## Open questions for phase 1 sign-off

**1. Five occasion routes have no tag in the locked taxonomy.**

Section 4 of the brief lists `/occasions/mothers-day`, `/fathers-day`,
`/valentines`, `/easter` and `/get-well`. Section 6's locked taxonomy has no
tag for any of them.

We have built them as CMS-curated listings, which is allowed ("the CMS owns
which products appear in a curated slot") and works today. The alternative
is to add five tags to the taxonomy.

Curated is better for the seasonal four: the right products for Mother's Day
change every year and a tag would have to be re-applied across the
catalogue annually. Get well is a closer call and could reasonably be a tag.
Tell us which you want.

**2. Hamper budget bands and gift budget bands use different numbers.**

`/hampers/*` splits at 75, 125 and 200. `/gifts-by-budget/*` splits at 50,
100 and 150, which is also what the `price:` tags and the GA4 budget
dimension use. Both come straight from the brief, and both are defensible:
hampers sit higher up the price line than the catalogue as a whole.

The cost is that "the €100 band" means two different things depending on
which page you are on, and a report that segments by `price:` tag will not
line up with hamper band performance. If you would rather they matched, the
change is four rows in the collection registry.

---

## Known limitations

- **Facet options are empty against a live store.** In fixture mode the
  filter values are computed in memory. Against Shopify they need Storefront
  product filters wired up, which needs a store to read the filter
  vocabulary from. The UI, the URL contract and the noindex rule are all
  built and working; only the source of the values is stubbed.
- **`inventory_levels/update` webhooks invalidate all listings.** The
  payload carries an inventory item id rather than a product handle, so
  there is nothing narrower to invalidate without an extra Admin API lookup.
  If inventory churn turns out to be high, add that lookup.
- **The fixture cart is in memory.** It is lost on server restart. That is
  the right trade for a stand-in and it disappears the moment Shopify is
  connected.
