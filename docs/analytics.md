# Analytics

GA4 with full e-commerce events, plus Meta and Google Ads conversion
tracking.

Two things about this setup are unusual enough to be worth stating plainly.

---

## 1. The purchase event does not fire on this site

Checkout is on Shopify. The purchase happens on `checkout.shopify.com` or on
a Shopify-hosted checkout domain, not here.

`src/lib/analytics/events.ts` therefore has **no `purchase` function**, and
that is deliberate rather than an omission. Firing one here as well is how a
site ends up double counting revenue across the domain handoff, and it is
the single most common way a headless Shopify build reports numbers nobody
can reconcile.

The purchase event is configured on the Shopify side, in the store's
customer events (Settings → Customer events → Custom pixel), which fires
into the same GA4 property.

### Verifying it fires once, before launch

This is a launch checklist item, not something to assume.

1. Open GA4 DebugView.
2. Complete a real test purchase end to end, from a product page through the
   cart and the handoff to the Shopify thank-you page.
3. In DebugView, filter for `purchase`. **You should see exactly one.**
4. Check the transaction id on it. If two events appear with the same
   transaction id, one of them is ours and it should not exist. If two
   appear with different transaction ids, the Shopify pixel is firing twice.
5. Check that `session_id` and the GA client id survive the domain change.
   If they do not, the purchase will be attributed to a direct session and
   every channel report will understate paid and organic. Fixing that means
   enabling cross-domain measurement in GA4 for both the site domain and the
   Shopify checkout domain.
6. Repeat with a Shop Pay accelerated checkout from the cart, which skips
   part of the flow and is where the tracking usually breaks.

Do the same for the Meta pixel and the Google Ads conversion tag.

## 2. Every event carries a budget band

The brief asks for budget bands to be tagged separately so we can see which
price band converts. Every item in every event carries `budget_band`, taken
from the same `PRICE_BANDS` table that drives the `price:` tags and the
`/gifts-by-budget/*` routes.

That means a shopper, a product tag and a GA4 report can never disagree
about which band a product is in.

**Register `budget_band` as a custom dimension in GA4** (Admin → Custom
definitions → Custom dimensions, scope: item). Without that it is collected
and not reportable, which looks identical to not being collected at all.

---

## Events

| Event | Where |
|---|---|
| `view_item` | Product pages |
| `view_item_list` | Listings |
| `select_item` | Product card click |
| `add_to_cart` | Add to cart, and the hamper builder |
| `remove_from_cart` | Cart |
| `view_cart` | Cart |
| `begin_checkout` | The handoff. Carries `handoff: "shopify_hosted"` so it can be told apart from Shopify's own |
| `hamper_builder_step` | Custom. Box chosen, component adjusted, added to cart |
| `generate_lead` | Corporate enquiry submitted |
| `sign_up` | Newsletter |
| `purchase` | **Shopify side only** |

`hamper_builder_step` is worth watching closely after launch. The builder is
the highest-intent thing on the site and it used to live on another domain
entirely, so there is no baseline. The drop-off between `choose_box` and
`added_to_cart` is the number that tells you whether the builder is working.

## Configuration

With none of `NEXT_PUBLIC_GA4_MEASUREMENT_ID`,
`NEXT_PUBLIC_GOOGLE_ADS_ID` or `NEXT_PUBLIC_META_PIXEL_ID` set, no tag loads
at all. A missing id means no tag rather than a broken one.

## Before launch

- [ ] GA4 property created and `budget_band` registered as an item-scoped
      custom dimension
- [ ] Cross-domain measurement configured for the site and the Shopify
      checkout domain
- [ ] Shopify custom pixel installed and firing `purchase` into the same
      property
- [ ] One test purchase completed, one `purchase` event observed
- [ ] One Shop Pay test purchase completed, one `purchase` event observed
- [ ] Meta pixel deduplication checked (`event_id` matching between browser
      and any server-side events)
- [ ] Google Ads conversion imported from GA4 rather than tagged separately,
      so it cannot disagree
