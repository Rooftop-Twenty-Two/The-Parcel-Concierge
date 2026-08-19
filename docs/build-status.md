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
- 149 pages prerendered at build. Product pages are static; listings are
  server rendered because they read filter parameters.
- Deploys to Vercel or Netlify. `netlify.toml` and `.nvmrc` are committed:
  see `docs/deployment.md` for the two things that were breaking the
  Netlify build and how they were fixed.
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
- **Real photography is now in.** The hero, both hub heroes, the mega-menu
  panels, the corporate page, the About page and ten product pages all run
  on the supplied shots. Product framings moved from portrait to landscape
  to suit the shoot, which is 3:2 throughout.
- **Needs design review.**

### The photography

Sixteen photographs were supplied with no shot list. Originals are in
`docs/reference/photography`; `npm run photography:optimise` cuts the web
assets into `public/photography`. The originals are never served.

**Ten studio shots.** Each is one 3:2 frame of a hamper on the same set.
`scripts/photography/optimise.mjs` cuts four framings from every one: the
full frame, a closer view of the contents, a view of the box, and a squarer
detail crop. The product gallery uses all four.

Three things need the client before this is finished:

1. **Confirm which SKU each frame shows.** We mapped them by looking at
   what is in each box: the two teddy bear frames to new baby hampers, the
   Irish food frame to The Boyne Valley, the Champagne and journal frame to
   The Toast, and so on. It is a reasonable reading, not a fact. The map is
   at the top of `scripts/fixtures/generate-catalogue.ts`.
2. **A genuine scale shot per SKU.** Four crops of one frame are four real
   views, but none of them shows the box next to something that gives its
   size. That cannot be cropped out of a frame that does not contain one.
3. **The remaining SKUs.** Ten hampers of thirty-seven are photographed.
   The rest still show the brand-styled placeholder cards, which is
   deliberate: a placeholder that obviously is one beats reusing another
   hamper's photograph.

Note while reviewing: on a photographed product the "What is inside" list
will not match what is visible in the shot. The contents lists are sample
data we wrote; the photographs are of real hampers. Both are correct in
isolation and they resolve against each other the moment the real catalogue
is ingested.

**Six lifestyle shots**, all in use: Karen and Ciaran outside the shop on
the About page, the wine room as the Wine Vault hero, the shop floor as the
Gifts hero, and the shopfronts held for the seasonal pages.

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
| 2 | The 12 hamper shots plus a shot list mapping images to SKUs | **Part received.** Sixteen photographs landed: ten studio hamper shots and six lifestyle shots of the shop and the owners. All sixteen are in use. **No shot list came with them**, so the image-to-SKU mapping is ours and needs confirming: see "The photography" below |
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
