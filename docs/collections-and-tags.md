# Collections and tags: audit and the way forward

September 2026. Written after the Tokara Director's Reserve White report:
a wine in stock, tagged the way the old site expected, and on no wine page
of the new site.

## How the new site decides where a product goes

Three mechanisms, and it matters which one does what.

| Question | Answered by | Where |
|---|---|---|
| Which products are on a listing page (Red wine, Fine wines, Hampers under €75, Christmas…) | **Shopify collection membership.** Each listing reads one native collection by handle. | `src/lib/commerce/collections.ts` |
| Is this product a wine, a hamper or a gift (its URL, its template, the age gate) | **Collection membership** again: in a wine collection → wine, in a hamper collection → hamper, otherwise gift. Product type is the last resort. | `kindFromMembership`, `src/lib/shopify/normalise.ts` |
| The filter rail on a wine listing: Grape, Country, Region | **Product tags**, read through a normalising lookup ("French Wines" → France, "Syrah WIne" → Syrah). The `wine.*` metafields win when present, but they are not on the store. | `src/lib/commerce/taxonomy.ts`, `cardFacetValues` in `src/lib/commerce/index.ts` |
| The Price filter | The product's own price. | |
| Style (body, sweetness) filter | `wine.*` metafields only. Empty on the live store, so the rail hides it. | |
| Occasion and Recipient filters on hamper listings | `occasion:` and `recipient:` tags from the locked taxonomy, which the live store does not carry. Hidden. | |

The **locked taxonomy** in `docs/taxonomy.md` (`type:`, `occasion:`,
`price:` and so on) is what the ingest tool writes and validates. The live
store has never had those tags written to it, so nothing on the site depends
on them today. That is by design after the September switch to native
collections: the merchant's collections are the taxonomy.

## What the audit found

Read from the August export (331 wines) and the code; the live store is
read by `npm run wines:audit`, which anyone with the Storefront credentials
can run.

1. **The wine collections the site reads are manual.** The Tokara white
   carries the old site's tags ("White Wine", "Fine Wines", "South African
   Wines", "Organic") and is in neither White Wines nor Fine Wines. If
   those collections were automated on tag conditions it would be in both.
   So today a wine is on the site only if somebody also adds it to the
   collections by hand, which is a second job on top of the tagging Karen
   already does, and the one that gets missed.

2. **The site's collection mapping is fixed in code.** Which collection
   feeds which page is a row in `collections.ts`. Karen cannot add or
   retire a page from Shopify, only change what is in a collection. That
   is the right split, but it was never written down for her.

3. **Country and Region filters were dead on the live store.** They read
   the `wine.*` metafields and nothing else; the metafields are not on the
   store (Track 2 is blocked, see `docs/shopify-connection.md`). Fixed in
   code: both now fall back to the tags, the same way Grape already did.
   In the export, 282 of 331 wines carry a readable country and 127 a
   region, so the filters fill from the store as it stands.

4. **Grape coverage is 208 of 331.** Blends, Champagne and Prosecco are
   expected gaps. The remainder is tagging.

5. **The old vocabulary is inconsistent.** "French Wine" and "French
   Wines"; "Rose", "Rose Wine" and "Rosé Wine"; grape tags with and
   without a trailing "Wine". The lookups accept every form seen in the
   export, so this costs nothing today, but new forms will not be
   recognised until added to `taxonomy.ts`.

6. **Listings stopped at 250 products.** Separate bug, fixed the same
   week: Fine Wines has more than a Storefront page of products and the
   site read one page. Every wine past position 250 was on no listing.

## The recommendation

Keep the new structure. Collections drive the pages; the site does not
read the old tags to decide where a product goes. But close the gap
between what Karen does (tag) and what the site reads (collections) inside
Shopify, where it belongs:

### 1. Make the site's collections automated, on the tags already in use

Shopify cannot convert a manual collection to automated in place, so each
one is a new automated collection. Conditions, accepting both old
spellings during the transition:

| Site page | Collection | Automated condition |
|---|---|---|
| Wine Vault, Fine wines, all three wine price bands | Fine Wines | Product type is `Wine` OR `Champagne` (every bottle, no tag needed) |
| Red wine | Red Wines | Tag is `Red Wine` OR `Red Wines` |
| White wine | White Wines | Tag is `White Wine` OR `White Wines` |
| Rosé | Rosé | Tag is `Rosé Wine` OR `Rose Wine` OR `Rose` |
| Champagne and sparkling | Champagne and Prosecco | Tag is `Champagne` OR `Prosecco` OR `Cava` OR `Sparkling` |
| Port and sherry | Port and Sherry | Tag is `Port` OR `Sherry` |
| Organic | Organic Wine | Tag is `Organic` |
| Alcohol free | Non-Alcoholic | Tag is `Non-Alcoholic` OR `Alcohol Free` |
| Wine gift sets | Wine Gift Sets | Tag is `Wine Gift Set` OR `Wine Gift Sets` |

Then either give each new collection the handle the site reads (rename the
old collection's handle first to free it), or update the handle in
`collections.ts`. `collections:validate` runs in every build and names any
handle that does not resolve, so a slip cannot ship.

Once this is done, Karen tags a wine the way she always has and it is on
the right pages within minutes. Nobody manages collection membership by
hand again.

### 2. One spelling per tag, going forward

The lookups tolerate the old variants, but the vocabulary should settle.
Proposed, for new products:

- Colour and style: `Red Wine`, `White Wine`, `Rosé Wine`, `Champagne`,
  `Prosecco`, `Cava`, `Sparkling`, `Port`, `Sherry`, `Dessert Wine`
- Country: the adjective plus "Wine", as most of the catalogue already has
  it: `French Wine`, `Spanish Wine`, `South African Wine`
- Region: the bare name: `Rioja`, `Bordeaux`, `Stellenbosch`
- Grape: the bare variety: `Malbec`, `Chenin Blanc` (with or without
  "Wine" is accepted; bare is tidier)
- Flags: `Organic`, `Fine Wines`

Anything outside this that should drive a filter needs one line added to
`taxonomy.ts`. `npm run wines:audit -- --tags` prints every tag on the
store with its count and which filter reads it, which is the list to tidy
from.

### 3. Fill the gaps the audit lists

`npm run wines:audit` prints the wines with no country tag and no grape
tag. Adding those tags in Shopify puts each wine into the filter. That is
merchant work, in Shopify, no deploy.

### 4. Metafields later, not as a blocker

The `wine.*` metafields (tasting note, body, sweetness, vintage, ABV) are
still worth having: they carry into the order, they render on the product
page, and they would drive the Style filter. But they are not needed for
the site to show every wine or for the Country, Region and Grape filters
to work. Track 2 stays gated on the copy and data blockers already
recorded, and nothing above waits on it.

## What is not recommended

- **Reading the old tags in the site to decide what is a wine.** Collection
  membership is unambiguous and merchant-controlled; the old tags are a
  free-text field that also carries "Smart Products Filter Index - Do not
  delete". Keep them as filter input only.
- **Fifty grape collections.** The old site had them. Grape is a filter on
  the listing, and the brief was explicit that it stays one.
- **Writing the locked `type:`/`occasion:` taxonomy to the store to make
  listings work.** It was designed for that before the switch to native
  collections. Collections now do the job with no write to live product
  data.
