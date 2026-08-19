# The Wine Vault Club

A recurring case of wine, at `/wine/subscription`.

The commercial case for it is simple. A gifting business sells hard for six
weeks a year and quietly for the rest. A club is the most direct fix for
that, and this one is built entirely on the list the shop already carries,
so it needs no new buying.

---

## How it is put together

The customer makes four choices, all on one screen with the price updating
as they change:

| Choice | Options |
|---|---|
| Case size | 3, 6 or 12 bottles |
| Budget per bottle | Everyday from €15, Considered from €25, Fine from €40 |
| Style | A mix, reds only, whites and rosé |
| How often | Monthly, every three months, twice a year |

Configuration is in `src/lib/wine-club.ts`.

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
   3 bottles, Everyday       6 bottles, Everyday       12 bottles, Everyday
   3 bottles, Considered     6 bottles, Considered     12 bottles, Considered
   3 bottles, Fine           6 bottles, Fine           12 bottles, Fine
   ```

   Price each variant at the band floor times the bottle count, which is
   what the site quotes.
3. **A selling plan per cadence**, attached to that product: monthly, every
   three months, twice a year.
4. **These environment variables**, so the site can name the plans:

   ```
   NEXT_PUBLIC_WINE_CLUB_SELLING_PLAN_GROUP=gid://shopify/SellingPlanGroup/...
   WINE_CLUB_PLAN_MONTHLY=gid://shopify/SellingPlan/...
   WINE_CLUB_PLAN_QUARTERLY=gid://shopify/SellingPlan/...
   WINE_CLUB_PLAN_TWICE_YEARLY=gid://shopify/SellingPlan/...
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
delivery rules apply: somebody over 18 has to take it in, and the courier
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
