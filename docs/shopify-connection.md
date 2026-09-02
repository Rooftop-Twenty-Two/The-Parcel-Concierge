# Connecting the site to the client's Shopify store

Two separate jobs that are easy to confuse:

| | What it does | Risk | Blocked? |
|---|---|---|---|
| **Track 1: read** | Site stops serving the fixture catalogue and reads the live store: real prices, real stock, working cart and checkout | Low, reversible by unsetting two variables | **No. Do this now.** |
| **Track 2: write** | Pushes our structured metafields and normalised tags into the store, which is what makes listings and the product accordions work | High. It rewrites live product data | **Yes.** See "What blocks Track 2" |

Do Track 1 first. It is the thing people mean by "connect Shopify", it takes
about an hour, and nothing in the client's store changes.

---

## Track 1: connect the Storefront API

### 1. Create the custom app

Shopify admin → **Settings → Apps and sales channels → Develop apps →
Create an app**. Call it something like "The Parcel Concierge website".

### 2. Give it Storefront API scopes

**Configuration → Storefront API integration → Configure.** Tick:

- `unauthenticated_read_product_listings`
- `unauthenticated_read_product_inventory`
- `unauthenticated_read_product_tags`
- `unauthenticated_read_checkouts`
- `unauthenticated_write_checkouts` — this is the one the **Cart API** runs
  on. Without it, adding to cart fails.
- `unauthenticated_read_selling_plans` — only needed when the wine club goes
  live, but tick it now rather than reinstalling later.

Save, then **Install app**, then reveal and copy the **Storefront API access
token**.

### 3. Point the site at it

`.env.local` for local work, and the same two in the Netlify/Vercel
dashboard for deploys:

```
SHOPIFY_STORE_DOMAIN=the-parcel-concierge.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=...
SHOPIFY_API_VERSION=2025-07
```

Use the `.myshopify.com` domain, not `theparcelconcierge.com`.

`src/lib/commerce/index.ts` checks for these two and dispatches to Shopify
instead of `data/catalogue/*.json`. There is no other switch.

### 4. Verify locally before deploying

```bash
npm run build && npm start
```

Check, in this order:

1. **The red "Preview build" banner is gone.** If it is still there the
   credentials are not being read.
2. **A product page shows a live price**, and one you can cross-check in the
   admin.
3. **Add to cart, then follow the checkout button.** It should land on the
   store's own hosted checkout. This path has never been exercised against a
   real store, so treat the first run as a test, not a formality.
4. **Listings have products in them.** Expect several to be thin or empty.
   That is Track 2, not a bug: see below.

### 5. Webhooks, so the site updates itself

Without this, a price change in Shopify takes up to an hour to appear.

Shopify admin → **Settings → Notifications → Webhooks**. Point all five at
`https://<site>/api/webhooks/shopify`, format JSON:

- `products/create`
- `products/update`
- `products/delete`
- `inventory_levels/update`
- `collections/update`

Copy the signing secret Shopify shows you into:

```
SHOPIFY_WEBHOOK_SECRET=...
```

The endpoint HMAC-verifies every request and returns 503 if the secret is
unset. That is deliberate: an unverified endpoint that triggers rebuilds is
a free denial of service for anyone who finds the URL.

### 6. Know what step 3 also does

`src/app/robots.ts` returns `disallow: /` for the whole site while it is in
fixture mode. **Setting the two Storefront variables takes the site off
noindex.** So do not set them in production until:

- the redirect map has been checked against real Search Console data
  (outstanding client item 6), and
- `NEXT_PUBLIC_SITE_URL` is correct.

Locally and on a preview deploy, set them freely.

---

## What blocks Track 2

`npm run ingest` validates before it writes and **currently refuses**:

```
data/catalogue/hampers.json   139 errors
data/catalogue/wines.json     196 errors
```

Broken down:

| Blocker | Hampers | Wines | Who can fix it |
|---|---|---|---|
| `descriptionHtml` (banned words, em dashes) | 62 | 166 | Us, but see below |
| `needsReview` (held deliberately) | 20 | 25 | Karen |
| `hamper.contents` empty | 20 | | **Karen only** |
| `hamper.allergens` empty | 20 | | **Karen only** |
| `images` (fewer than four) | 17 | | Karen, needs a reshoot |
| `variants.sku`, `handle` | | 5 | Us |

Two of those need naming plainly.

**The allergens and contents are not ours to write.** They were never in the
Shopify export. A food gift with unknown allergens does not get published,
and there is no flag that skips that check. Twenty hampers need a contents
list and an allergen statement from Karen before any of them can be
ingested.

**The description errors are mostly the client's own live copy.** "Indulge",
"luxurious", "perfect for", "curated" and em dashes are on our house style
banned list, and the products they appear on are selling in the client's
shop today. Fixing them means rewriting live product descriptions on a
working store. That is a content decision for Karen, not a technical step,
and it should not be done as a side effect of a technical integration.

### When it is unblocked, the order matters

```bash
# 1. Definitions FIRST. A metafield written without a definition is untyped,
#    invisible in the admin and unreadable by the Storefront API.
npm run ingest:definitions
npm run ingest:definitions -- --write

# 2. Dry run. This is the default; writing needs --write.
npm run ingest -- --input data/catalogue/hampers.json

# 3. Apply, having read the plan.
npm run ingest -- --input data/catalogue/hampers.json --write
```

Needs `SHOPIFY_ADMIN_TOKEN` from the same custom app, scoped
`write_products`, `read_products`, `write_metaobject_definitions`. It is
server side only, used by `scripts/ingest` alone, and nothing under `src/`
reads it.

Idempotent on the first variant's SKU, so re-running produces the same store
and never a duplicate. Products are created as **draft**: going live is a
deliberate step in the admin. Every write lands in
`data/ingest-reports/ingest-<timestamp>.csv` with a `rollbackHint` per row.

There is no automated rollback, deliberately. Undoing a partially applied
bulk write with a second unreviewed bulk write is how one bad run becomes
two.

---

## Why listings look thin until Track 2 is done

Collections filter on the locked tag taxonomy and on metafields:

```ts
{ ...HAMPER_BASE, tags: ['occasion:new-baby'] }
{ ...HAMPER_BASE, productTypes: ['Wine hamper'] }
```

In the client's export, tags were carrying country, grape, style, occasion
and merchandising all at once, and there are no `hamper.*` or `wine.*`
metafields at all. So after Track 1 the site will read real products at real
prices, and the occasion listings and the product accordions will be sparse.

`normalise.ts` degrades rather than throwing, which means this fails
**quietly**. Do not read an empty listing as "the connection did not work".

---

## Still outstanding after both tracks

- **Checkout end to end.** Never run against a real store.
- **The wine club** needs a subscription app installed on the store, plus
  `NEXT_PUBLIC_WINE_CLUB_SELLING_PLAN_GROUP` and the three plan ids. Without
  them the club page renders in full and says sign-ups are not open.
- **The gift card product** does not exist in the store. `/gift-card`
  shows the buy button automatically once it does.
- **Forms.** `CORPORATE_ENQUIRY_WEBHOOK` and `NEWSLETTER_WEBHOOK` log server
  side until they point somewhere. Launch blocker.
