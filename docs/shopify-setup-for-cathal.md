# Parcel Concierge — what to set up in Shopify

**For:** Cathal O'Reilly, Rooftop Twenty Two
**From:** Everblue Digital
**About:** the new Parcel Concierge storefront, now reading the live Shopify store

The website now reads your Shopify store directly — products, prices, stock, cart
and checkout all come through Shopify. It shows products by **collection**: a
product appears on a page because it sits in the collection that page reads. The
store is already well organised (238 collections), so the site fills itself and
this list is short.

Everything below is a change **in Shopify**, done by Karen or your team — none of
it needs website work. The pages fill in on their own once the store side is done.
The one rule to hold onto: **a product only shows on a page if it is in that
page's collection**, so a new hamper needs adding to the right collections
(All Hampers, its occasion, its price is read automatically).

The machine-readable version of this list is in
[`shopify-setup-checklist.csv`](./shopify-setup-checklist.csv).

---

## 1. Create three collections that don't exist yet

The site has pages ready for these, but there is no matching collection in Shopify,
so they stay empty until the collection exists (and has at least four products).

| Create this collection | Put in it | Fills these pages |
|---|---|---|
| **Sympathy** | sympathy hampers and gifts | /hampers/sympathy, /occasions/sympathy |
| **Get Well** | get-well gifts | /occasions/get-well |
| **Exclusive to Us** | the wines only you stock | /wine/exclusive-to-us |

The site is already wired to pick these up automatically under the handles
`sympathy`, `get-well` and `exclusive-to-us`, so as soon as the collection exists
with those handles the pages turn on with no further work.

## 2. Fill three collections that are empty or too thin

These collections exist but don't have enough in them. A page needs at least four
products to show (below that it stays hidden, by design, so the site never shows a
bare page).

| Collection | Has now | Add | Fills |
|---|---|---|---|
| **Corporate** (`corporate`) | 0 | corporate hampers/gifts | /hampers/corporate, /corporate |
| **Food and Wine Hampers** | 3 | one or two more | /hampers/wine, /hampers/food |
| **Pamper Hampers** | 1 | three or more | /hampers/pamper |

## 3. Product content

| Add to products | Why |
|---|---|
| **Allergens and ingredients** on every food hamper and food product | Required by law for food, and it fills the "what's inside / allergens" section on the product page. Products without it are held back. |
| **A description** for any product missing one | A product with no copy looks bare, and may not be shown. |
| **A photo** for any product or hamper missing one | Otherwise the product shows a plain placeholder. |

## 4. Before launch

| Task | Why |
|---|---|
| **Set up the Wine Club subscription** — install a Shopify subscription app and create the subscription plans | The Wine Club sign-up cannot go live until subscription plans exist. None do today. |
| **(Optional) create a "Gift Bow" product** | Lets the hamper builder offer a bow at the end. Skip it if you don't want one — the builder just won't show a bow. |

---

## How the site reads your store, in one line

Each page reads a named collection. A few examples of what maps to what:

- /wine/red → your **Red Wines** collection · /wine/white → **White Wines** · /wine/fine-wines → **Fine Wines**
- /hampers → **All Hampers** · /hampers/new-baby → **Baby Hampers**
- /gifts-for/her → **Gifts for Her** · /occasions/mothers-day → **Mother's Day**
- the homepage's featured hampers read **All Hampers**; the hamper builder's shelves
  read your food, chocolate, wine, candles, beauty, homeware, baby, jewellery and
  card collections.

So keeping products in the right collections is the whole job — the site does the rest.

## Already done, no action needed

- The builder box (**Build a Hamper**) and the **gift card** already exist — the
  site now points at them.
- Every wine, gift and occasion collection you already have is live on the site.
