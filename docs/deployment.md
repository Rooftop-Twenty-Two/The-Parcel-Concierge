# Deployment

The brief specifies Vercel. Nothing in this codebase is Vercel-specific, so
it deploys to Netlify too, and `netlify.toml` is committed.

---

## Netlify

Committed config: `netlify.toml`, `.nvmrc`, and `@netlify/plugin-nextjs` in
devDependencies.

| | |
|---|---|
| Build command | `npm run build` |
| Publish directory | `.next` |
| Node version | 22, pinned in `netlify.toml` and `.nvmrc` |
| Runtime | `@netlify/plugin-nextjs`, declared explicitly |

### What was breaking it

Two things, both now fixed.

**1. Node version.** `npm run build` used to run a TypeScript file through
Node's `--experimental-strip-types`, which only exists on Node 22.6 and
later. On an older Node the build failed immediately with
`bad option: --experimental-strip-types`, before Next was ever invoked.

The build path is now plain JavaScript
(`scripts/redirects/build-redirect-map.mjs` and `parse.mjs`), so it runs on
any Node that Next itself supports. Node 22 is pinned as well, so it cannot
recur. The remaining TypeScript scripts (ingest, fixtures, content report,
tests) still need 22.6, but none of them run during a deploy.

**2. The fixture cart was in server memory.** In preview mode, with no
Shopify store connected, the cart used to be a `Map` in the server process.
That fails on any serverless host, because each request can land on a
different instance, so the cart emptied at random between clicks. It also
failed locally in a subtler way: Next compiles server actions, route
handlers and pages into separate bundles, each with its own copy of a
module, so the action and `/api/cart` never shared a store at all.

The fixture cart is now held in a signed-scope httpOnly cookie
(`src/lib/commerce/fixture-cart.ts`), holding only variant ids, quantities
and the personalisation the shopper typed. Prices, titles and images are
resolved from the catalogue on read, so the cookie can never disagree with
the product data. It is verified to survive the server process being killed
and restarted.

None of this affects a connected store: there the cart lives in Shopify and
we hold only its id.

### If a Netlify build still fails

Send the build log. The likely remaining causes, in order:

1. **Environment variables not set on the branch being built.** None are
   required, and the site falls back to fixture mode, but a half-set
   Shopify pair (domain without token, or the reverse) puts it in fixture
   mode silently rather than failing. Check both are present.
2. **Netlify's `NODE_ENV=production` skipping devDependencies.**
   `NPM_FLAGS = "--include=dev"` in `netlify.toml` covers it. Next needs
   `typescript`, `tailwindcss` and `eslint-config-next` at build time.
3. **A stale build cache** holding an old `.next` or an old Node. Clear
   cache and deploy.

## Vercel

No configuration file needed. Vercel detects Next and the defaults are
correct.

Set the environment variables from `.env.example`. The only one that
changes behaviour on its own is the Shopify Storefront pair: with both set
the site serves the real catalogue, without them it serves fixtures behind
a preview banner and `noindex`.

## What a preview deploy looks like

With no Shopify credentials:

- A red banner across the top saying the products are sample data
- `noindex, nofollow` on every page, and `robots.txt` disallowing everything
- An empty sitemap
- A working cart, builder and personalisation flow
- A checkout button that leads to `/checkout-unavailable`, which explains
  why there is no checkout, rather than to a dead Shopify URL

That is deliberate. A site serving invented products must never look like a
shop that is open.

## Before the real launch

- Set the Shopify Storefront pair, which clears preview mode
- Set `SHOPIFY_WEBHOOK_SECRET` and subscribe the five webhooks in
  `docs/architecture.md`, or product changes will only refresh on the
  time-based backstop
- Set `NEXT_PUBLIC_SITE_URL` to the live domain, which the sitemap,
  canonicals and structured data all build from
- Point `CORPORATE_ENQUIRY_WEBHOOK` and `NEWSLETTER_WEBHOOK` somewhere real.
  Until then submissions are logged server side and the request still
  succeeds, which is fine for a preview and a launch blocker for production
- Configure the host redirect from `parcel-concierge.vercel.app` to
  `/build-your-own-hamper`. It is a cross-origin redirect, so it cannot live
  in the redirect map: see `docs/redirects.md`
- Work through the analytics checklist in `docs/analytics.md`, particularly
  proving the purchase event fires once across the checkout handoff
