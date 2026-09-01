# The Wine Vault Club

A personalised wine subscription. The landing page is `/wine-club`, the
guided builder is `/wine-club/build`, and the old `/wine/subscription`
URL redirects permanently to the landing page.

The commercial case for it is simple. A gifting business sells hard for six
weeks a year and quietly for the rest. A club is the most direct fix for
that, and this one is built entirely on the list the shop already carries,
so it needs no new buying.

---

## The flow

We recommend first; the customer edits second. The builder walks:

1. **First name** (optional, never sent anywhere)
2. **Seven taste questions**, all about food and drink people already
   know: chocolate, coffee, what sounds refreshing, comfort food, a
   cocktail, food adventurousness, a flavour direction. Questions and
   their attribute weightings are one data table in
   `src/lib/wine-club/taste.ts`; rewording or reweighting is an edit
   there, never a UI change.
3. **A taste reveal** in words, never numbers.
4. **Wine types** (red, white, rosé, sparkling, multi-select, or "you
   choose"), **frequency**, **bottle count**, **the mix** (steppers that
   must total the case), and **budget**.
5. **The personalised box**: every bottle with a deterministic sentence
   explaining why it was picked, generated from the same numbers that
   scored it. Swap any bottle (three alternatives plus browse-all), open
   details, then review and check out.

The browser back button walks the flow backwards without losing answers,
and the whole state survives a reload via localStorage.

## The recommendation engine

Deterministic and explainable, no model anywhere. Per-wine attribute
profiles are derived from the catalogue (a grape table plus per-colour
defaults) in `src/lib/wine-club/profiles.ts`; the weighted matcher with
diversity caps (max 2 of a grape, 2 of a producer, 3 of a country per
box) and a relaxation ladder (diversity tops up, then budget widens a
fifth; type, exclusions and stock never bend) is
`src/lib/wine-club/recommend.ts`, exercised through
`POST /api/wine-recommendations`. Out-of-stock wines never appear.

When the client wants per-wine control, the attribute numbers move into
Shopify metafields (wine.body, wine.acidity, ...) and profiles.ts reads
those instead; the shape is already theirs.

## The choices

| Choice | Options |
|---|---|
| Case size | 3 or 6 bottles |
| Budget per bottle | Everyday discoveries from €15, Something special from €25, Premium picks from €40 |
| Mix | Any combination of red, white, rosé and sparkling |
| How often | Monthly, every two months, every three months |

Configuration is in `src/lib/wine-club.ts` and
`src/lib/wine-club/recommend.ts` (BUDGET_TIERS, MATCH_WEIGHTS).

## Analytics

The funnel fires GA4 events via `trackWineClubEvent`:
`wine_builder_started`, `wine_quiz_answered`, `wine_quiz_completed`,
`wine_type_selected`, `subscription_frequency_selected`,
`bottle_quantity_selected`, `wine_mix_completed`, `budget_selected`,
`recommendations_generated`, `wine_details_viewed`, `wine_swap_started`,
`wine_swapped`, `browse_all_wines_opened`, `subscription_review_viewed`,
`subscription_checkout_started`. Nothing personally identifying is sent;
the first name never leaves the browser.

### Why the price is per bottle

Nobody has agreed a case price, and inventing one would be the same mistake
as printing a corporate discount table nobody signed off. So the customer
picks a per-bottle band and the case price follows: six bottles at the
Considered band is "from €150".

That is arithmetic on the real catalogue rather than a number we made up,
and the page proves it by showing how many wines are in stock at each band,
counted live. It also means the client can change the range without
repricing the club.

`from` is a floor, not an average. Every band is backed by wines actually
in stock at that price.

## What Shopify has to provide

**We do not run the subscription.** No cards are stored here, there is no
billing schedule, and there is no cancel flow to build. Shopify's
subscription contracts do all of it, and the customer manages the
subscription from their account. Our job is to select a selling plan and
put it on the cart line.

Before the club can take a single sign-up, the store needs:

1. **A subscription app installed**, which is what creates selling plan
   groups. Shopify does not do subscriptions natively.
2. **A product**, handle `wine-vault-club`, with **one variant per case
   size and band**. The variant title is the contract between the site and
   the store and is matched exactly:

   ```
   3 bottles, Everyday       6 bottles, Everyday
   3 bottles, Considered     6 bottles, Considered
   3 bottles, Fine           6 bottles, Fine
   ```

   Price each variant at the band floor times the bottle count, which is
   what the site quotes. The chosen bottles ride on the cart line as
   attributes (Bottle 1..N), so the packing bench builds exactly the box
   the customer saw.
3. **A selling plan per cadence**, attached to that product: monthly, every
   two months, every three months.
4. **These environment variables**, so the site can name the plans:

   ```
   NEXT_PUBLIC_WINE_CLUB_SELLING_PLAN_GROUP=gid://shopify/SellingPlanGroup/...
   WINE_CLUB_PLAN_MONTHLY=gid://shopify/SellingPlan/...
   WINE_CLUB_PLAN_QUARTERLY=gid://shopify/SellingPlan/...
   WINE_CLUB_PLAN_TWO_MONTHLY=gid://shopify/SellingPlan/...
   ```

Until `NEXT_PUBLIC_WINE_CLUB_SELLING_PLAN_GROUP` is set, the page renders
in full and the sign-up button is replaced with a plain statement that
subscriptions are not switched on yet. It does not show a buy button that
cannot work.

## What the packing bench sees

Every club line carries its choices as cart line attributes, so the order
says what to put in the case without anybody looking anything up:

```
_wineClub    true
Case size    6 bottles
Price band   Considered
Style        A mix
Delivery     Every three months
```

The cart also labels the line as a subscription with its cadence. A
subscription line that looks like a one-off purchase is the single most
common subscription complaint.

## Age verification

The club is alcohol, so the page is behind the age gate and the usual
delivery rules apply: somebody over 18 has to take it in, and An Post
cannot leave it with a neighbour. The same legal sign-off that covers the
rest of the alcohol range covers this.

## Still to decide

- **Whether the first case is discounted.** Most clubs do it. It is a
  pricing decision, not an engineering one, and there is nowhere in the
  config for it until somebody chooses.
- **Whether to offer a prepaid gift subscription** (three cases paid up
  front, no renewal). Shopify supports it as a separate selling plan. The
  FAQ on the page currently describes gifting as setting the delivery
  address, which works but is not the same thing.
- **What happens when a chosen wine is out of stock.** Today the case is
  picked by hand, so it is a human decision. If the club grows past what
  two people can pick, it needs a rule.
