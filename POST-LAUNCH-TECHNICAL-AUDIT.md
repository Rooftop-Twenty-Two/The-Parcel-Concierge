# Post-Launch Technical Audit

**Site:** https://www.theparcelconcierge.com (Next.js 15 App Router on Vercel, Shopify Storefront headless)
**Audited:** 7 October 2026, production deployment `dpl_EH9EbZqzLHJf2R9BZSZph57qCQU2` (commit `0015b8f`)
**Fixes:** commit `4d3acdf` on branch `claude/gracious-wozniak-1nvcrh`, verified on Vercel preview `dpl_ANsa81SnvcdoJhsyMgzSdb26YiCn`.
**Fixes are not yet live.** They reach production when the branch is merged to `main`.

## How this was audited

- **Production crawl.** Every URL in the live sitemap (1,963), plus every internal link found on those pages: 2,580 URLs. For each: status, title, meta description, canonical, H1s, robots, og tags, JSON-LD types, images without alt, `href="#"`/`javascript:` links and staging hosts. The full per-page inventory is in [`docs/audit/site-inventory-2026-10-07.csv`](docs/audit/site-inventory-2026-10-07.csv).
- **Headless Chromium on production.** 22 key pages at 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 px. Checked horizontal overflow, console errors, failed requests, landmarks, duplicate ids, unlabelled controls and LCP elements. Core Web Vitals were measured under throttled mobile (4× CPU, ~1.6 Mbps, 150 ms RTT).
- **Hosting checks over curl.** HTTP/HTTPS/www behaviour, security headers, 404 handling, legacy Shopify URL patterns, every redirect-map destination, and external links.
- **Vercel project (read-only).** Domains, environment variable *names* (no values were read), runtime error groups for the last 7 days, and deployments.
- **Code review.** API routes, server actions, forms, analytics, accessibility, images and responsive CSS. `npm audit`, `npm outdated`, typecheck, lint, tests, and a production build.
- **Fix verification.** Each fix was checked in a local production build and again on the Vercel preview, which uses the real Shopify catalogue.
- **Not done.** No live form was submitted, no order was placed, and no external system was written to.

---

## Executive Summary

**Overall technical health: Needs Attention**

The build itself is good:
- Server-rendered pages, fast TTFB, zero CLS on every page measured.
- Valid structured data on every page; titles and descriptions on every page.
- Correct robots handling; HTTPS with HSTS.
- A disciplined redirect map, and no secrets in the repository.

Three things were seriously wrong at launch, and two of them are fixed in this branch:

1. **Every old Shopify product URL returned 404.** `/products/<handle>` is the URL Google had indexed for roughly 2,000 products. Only 4 example rows existed in the redirect map, and those 4 pointed at products that do not exist. **Fixed:** old product URLs now 301 to the product's new address.
2. **The deployed Next.js version had a critical remote-code-execution advisory** in the image optimiser (GHSA-2xp9-vwfh-vxw4). **Fixed:** upgraded to 15.5.27.
3. **Newsletter sign-ups are silently discarded.** Visitors are told "your code is on its way", but `NEWSLETTER_WEBHOOK` is not set, so the address only reaches a server log. **Not fixed.** It needs a decision on where sign-ups should go (see C3).

Also outstanding:
- **No analytics.** No GA4, Ads or Meta ID is set in production.
- **No cookie consent mechanism**, which must exist before any tag is switched on.
- **The self-serve corporate campaign tool cannot save.** Its storage, Upstash KV, is not connected.

---

## Critical Issues

### C1. Old Shopify product URLs all return 404
- **URL/component:** `/products/<handle>` and `/collections/<collection>/products/<handle>`.
- **Severity:** Critical (SEO / migration).
- **Evidence:** `curl https://www.theparcelconcierge.com/products/happy-birthday-present` returned 404, though the product is live at `/hampers/happy-birthday-present`. The same held for `/products/chateau-desclans-whispering-angel-rose` and every other handle tested. `data/redirects/redirects.csv` had only 4 `/products` rows, all placeholders whose destinations 404 (`/hampers/the-meath-larder` and others).
- **Why it matters:** these are the URLs in Google's index and in backlinks. Each one now 404s, and rankings and link equity are lost while it does.
- **Solution:** a route that looks the handle up in Shopify and permanently redirects to the product's canonical route.
  - It keeps a numeric `?variant=`.
  - Hidden builder products go to `/build-your-own-hamper`.
  - Handles no longer in the shop still 404; they are never sent to the homepage.
  - Rows in the redirect CSV still take precedence.
  - The 4 placeholder rows were removed.
- **Fixed:** yes. Verified on preview:
  - `/products/happy-birthday-present` → 308 `/hampers/happy-birthday-present`
  - `/products/chateau-desclans-whispering-angel-rose?variant=123` → 308 `/wine/…?variant=123`
  - `/collections/hampers/products/tpc-wine-bag` → 308 `/gifts/tpc-wine-bag`
  - `/products/no-such-thing` → 404
- **Files:** `src/lib/legacy-product-path.ts`, `src/app/(site)/products/[handle]/page.tsx`, `src/app/(site)/collections/[collection]/products/[handle]/page.tsx`, `data/redirects/redirects.csv`, `src/generated/redirects.json`.
- **Still to do:** products that were *removed* from the shop still 404. They need rows pointing at their parent listing, generated from the retain/remove list per `docs/redirects.md`. That needs the Search Console URL export (see Remaining Manual Checks).

### C2. Next.js remote-code-execution advisory
- **Component:** `next@15.5.23`.
- **Severity:** Critical (security).
- **Evidence:** `npm audit` reported two advisories on this version:
  - GHSA-2xp9-vwfh-vxw4: unauthenticated RCE in the Image Optimization API when AVIF is used. AVIF is enabled in `next.config.ts`.
  - GHSA-p293-qw3h-jr36: Windows-host RCE, not applicable on Vercel.

  Both are fixed in 15.5.24 and later. Transitive `sharp`, `postcss` and `source-map-js` advisories were also present.
- **Solution:** upgrade to `next@15.5.27` (a patch release in the same 15.5 line) and run a non-breaking `npm audit fix`.
- **Fixed:** yes. Build and tests pass on 15.5.27.
- **Residual:** 7 advisories remain (6 high, 1 moderate), in build-time tooling only:
  - the ESLint chain: `braces`, `micromatch`, `fast-glob`
  - the copy of PostCSS bundled inside Next

  None of these runs on visitor input. Clearing them needs Next 16 or eslint-config-next 16, which are major upgrades and not done here.
- **Files:** `package.json`, `package-lock.json`.

### C3. Newsletter sign-ups are discarded while the visitor is told they succeeded
- **Component:** `src/components/marketing/NewsletterSignup.tsx` (footer on every page, and the homepage), `src/lib/notifications.ts:149`.
- **Severity:** Critical (conversions, data, trust).
- **Evidence:** `NEWSLETTER_WEBHOOK` is not set in Vercel production. `subscribeToNewsletter` then logs the address and returns success. The UI says *"You are on the list. Your … code is on its way."* No code is sent and nothing is stored. Each subscriber's email address is also written to the logs.
- **Why it matters:** real customers are being promised a discount code that never comes, and the list is not being built.
- **Solution (needs your decision):**
  - Point `NEWSLETTER_WEBHOOK` at the real list. That could be Shopify customer marketing via a Flow or Zapier webhook, or Mailchimp or Klaviyo. Then redeploy.
  - Or, as an interim, have unset-webhook sign-ups emailed to the shop inbox through Postmark, which already works.
  - Or, temporarily remove the discount promise from the success message.
- **Fixed:** **no.** It changes where personal data goes, and an integration has to be chosen.
- **Can't be recovered:** sign-ups made since launch are not stored. Vercel keeps runtime logs for 1 day on this plan.

---

## High Priority

### H1. Canonicals, sitemap, robots and structured data all pointed at a redirecting host
- **Severity:** High (SEO).
- **Evidence:**
  - Vercel serves `www.theparcelconcierge.com`, and the apex 308s to www.
  - `NEXT_PUBLIC_SITE_URL` is not set, so the code fell back to `https://theparcelconcierge.com`.
  - All 1,964 canonical tags, all 1,963 sitemap `<loc>`s, the `Sitemap:` line in robots.txt and every JSON-LD `url`/`@id` pointed at the apex, so every one of them went through a redirect.
- **Solution:** the default became `https://www.theparcelconcierge.com`, and `.env.example` was updated to match.
- **Fixed:** yes. Verified on preview: canonical, sitemap (1,962 entries, all www) and JSON-LD use www.
- **Files:** `src/lib/site-config.ts`, `.env.example`.
- **Recommended:** also set `NEXT_PUBLIC_SITE_URL=https://www.theparcelconcierge.com` in Vercel production so the value is explicit. In Search Console, make sure the www property (or the Domain property) is the one being watched.

### H2. Self-serve corporate campaigns cannot be created
- **URL:** `/corporate-gifting/new`, `/gift/[slug]`, `/corporate-gifting/dashboard/[slug]`, `/admin/corporate`.
- **Evidence:**
  - `KV_REST_API_URL`/`KV_REST_API_TOKEN` are not set, so the store refuses every save (`src/lib/corporate/store.ts`).
  - A buyer completes the full wizard and is then told *"We could not save that just now…"*.
  - `CORPORATE_ADMIN_KEY` is not set either, so the admin page reads "Admin is not configured".
  - Vercel runtime errors show the "[corporate store] No campaign storage" message.
- **Solution:** in the Vercel project's Storage tab, connect Upstash Redis and set `CORPORATE_ADMIN_KEY`. Or, until then, stop linking to `/corporate-gifting/new`. The enquiry form at `/corporate-gifting/enquiry` works.
- **Fixed:** no (needs your hosting account).

### H3. No analytics, and no consent mechanism
- **Evidence:**
  - `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID` and `NEXT_PUBLIC_META_PIXEL_ID` are all unset, so no tag loads (confirmed in production HTML).
  - There is no cookie banner and no Google Consent Mode v2 default anywhere in the code.
  - `Analytics.tsx` would load GA4, Ads and the Meta Pixel unconditionally the moment an ID is set.
- **Why it matters:**
  - No traffic, conversion or revenue data is being collected after launch.
  - Setting an ID today would fire advertising tags before consent.
- **Solution:**
  - Add a consent banner with Consent Mode v2 defaults set to `denied`, and gate Meta on consent. Only then set the IDs.
  - Wire up the defined but unused events: `view_item`, `view_item_list`, `select_item`, `remove_from_cart`, `sign_up`.
  - Rename `trackCheckoutHandoff`'s `begin_checkout`, which will double-count against Shopify's own.
  - Add a route-change PageView for Meta.
- **Fixed:** no. It is a new feature, and consent is a compliance decision.

### H4. Contact-form submissions failing after deploys ("Failed to find Server Action")
- **URL:** `/contact`.
- **Evidence:** Vercel runtime errors: 18 occurrences from 6 users between 5 September and 7 October.
- **Why it matters:** a visitor with the page open across a deploy presses Send and the message does not go through.
- **Solution:** turn on **Skew Protection** in Vercel → Project → Settings → Advanced (available on Pro). Old clients then keep talking to the deployment they loaded.
- **Fixed:** no (hosting setting).

### H5. Brand red fails text contrast
- **Evidence:**
  - Cream on red (`bg-red text-cream`, used by the primary Button, "Go to checkout" and the cart CTA) is 3.65:1.
  - Red text on cream (the header "Build your own hamper", form error text, required asterisks) is 3.43–3.65:1.
  - WCAG AA needs 4.5:1 for normal text.
- **Solution:** a darker red for text use. The wine colour `#9f3226` gives 6.34:1.
- **Fixed:** no. It changes the approved brand palette, so it needs sign-off.

### H6. Removed-product and unmapped collection URLs still 404
- **Evidence:**
  - Only 44 `/collections/*` sources are mapped. Other old collections, `/blogs/*` and `/account` 404.
  - Products deleted from Shopify 404 (see C1).
- **Solution:** export the old URLs with impressions or links from Search Console and Shopify. Run `npm run redirects:products` with the retain/remove CSV. Add parent-listing rows.
- **Fixed:** partly. `/pages/contact`, `/policies/shipping-policy` and `/hampers/build-a-hamper` were added.

---

## Medium Priority

| # | Issue | URL / component | Evidence | Fixed? | Files |
|---|---|---|---|---|---|
| M1 | The sitemap listed 3 URLs that 404, and `/build-your-own-hamper` 3 times | `/sitemap.xml` | The wicker basket products (hidden from listings) and builder-item products were emitted | **Yes**. Preview sitemap: 1,962 unique URLs, no wicker or basket entries | `src/app/sitemap.ts` |
| M2 | The 4 legal pages are indexable but were missing from the sitemap | `/legal/*` | Crawl | **Yes** | `src/app/sitemap.ts` |
| M3 | Unmatched URLs showed a bare 404 with no header, footer or search, titled like the homepage | any unknown path | Production `/this-does-not-exist` had no `<header>` | **Yes**. 404 status kept; shop header and footer shown; title "Page not found" in the server HTML | `src/app/(site)/[...missing]/page.tsx`, both `not-found.tsx` |
| M4 | Redirect rows pointed at 404s | `/collections/beauty`, `/collections/skincare` → `/hampers/pamper` (404); 4 placeholder `/products` rows | Checked every destination in the map against production | **Yes**. Now go to `/hampers` (parent) and the dynamic resolver. Restore the pamper row when the `pamper-hampers-1` collection is back | `data/redirects/redirects.csv` |
| M5 | Header overflows the screen at 320px on **every page** | `Header.tsx` | `scrollWidth` 353 at a 320 viewport; the Menu button is cut off | **Yes**. Below 360px the Search label is screen-reader-only. Other widths are unchanged, confirmed by screenshot | `src/components/layout/Header.tsx` |
| M6 | A product with no photo overflows at 1024px | e.g. `/hampers/happy-birthday-present` | `scrollWidth` 1325; title and price pushed off screen | **Yes**. Verified on preview: no overflow at any width | `src/components/product/ProductGallery.tsx` |
| M7 | Contact email overflows at 320px | `/contact` | `scrollWidth` 354 | **Yes** (`wrap-anywhere`) | `src/app/(site)/contact/page.tsx` |
| M8 | Contact and corporate enquiry forms wipe everything typed when validation fails | `/contact`, `/corporate-gifting/enquiry` | Browser test: all fields empty after an error | **Yes**. Values, radios and checkboxes are restored after errors (browser-verified) | `src/app/actions/contact.ts`, `corporate.ts`, `ContactForm.tsx`, `CorporateEnquiryForm.tsx` |
| M9 | No `favicon.ico` (404) and no Apple touch icon | `/favicon.ico` | 404 on production | **Yes**. Generated from the existing `icon.svg`, no new artwork. Both return 200 on preview | `src/app/favicon.ico`, `src/app/apple-icon.png` |
| M10 | 300 product pages had no `og:image` | Products without photos | Crawl. The route's `openGraph` replaced the layout's | **Yes**. Falls back to `/og-default.jpg` (verified on preview) | `src/lib/seo/og.ts`, `layout.tsx`, 3 product routes |
| M11 | CSV export open to spreadsheet formula injection | `/admin/corporate/export` | Recipient-typed cells written raw | **Yes**. `=`, `+`, `-`, `@` prefixed with `'`; phone numbers left alone | `src/app/admin/corporate/export/route.ts` |
| M12 | Admin key, dashboard token and preview password compared with `===` | admin, dashboard, preview unlock | Code | **Yes**. Constant-time comparison | `src/lib/secure-compare.ts` + 5 callers |
| M13 | Missing headers: no CSP `frame-ancestors`, no `Permissions-Policy` | all | Response headers | **Yes**. Verified on preview. A full script CSP is **not** added (needs testing with Shopify, Trustpilot and the tags) | `next.config.ts` |
| M14 | Wine-club drawer: focus not moved in, not trapped, not restored; two buttons named "Close" | `/wine-club/build` | Code | **Yes**. Typechecked and built, but **not exercised in a browser** (the drawer needs the full quiz) | `src/components/wine-club/Box.tsx` |
| M15 | Inputs with no focus indicator (`outline-none`) | builder search, dashboard number input | Code | **Yes** | `ItemsPicker.tsx`, `DashboardTools.tsx` |
| M16 | Nested `<main>` | `/build-your-own-hamper`, `/wine-club/build` | 2 `<main>` per page on production | **Yes**. 1 on preview | `BuilderWizard.tsx`, `Flow.tsx` |
| M17 | Filter links use `aria-pressed`, which is invalid on links, so the selected state isn't announced | listing filters | Code | **Yes** (`aria-current`) | `ListingFilters.tsx` |
| M18 | Duplicate `id="site-search"` when header and page search both render | `/search` | Code | **Yes** (`useId`) | `SearchForm.tsx` |
| M19 | A failing test: the `/wine/alcohol-free` listing has its age gate off but doesn't filter by the alcohol-free flag | `collections.ts` | `npm test` | **No**. Decide whether the curated `non-alcoholic` collection can be trusted to never hold alcohol (then update the test) or add the `isAlcoholFree` filter | — |
| M20 | Under-populated listings send people away with a 307, so redirect-map rows pointing at them make chains | `/hampers/under-75`, `/occasions/new-baby`, `/occasions/sympathy`, `/occasions/wedding-engagement` | `curl` | No. By design (it reverts when stock returns). Restock or repoint the CSV rows | — |
| M21 | Other a11y gaps | header mega menu; wizard steps; postmark stamp | Escape doesn't return focus to the menu link; wizard steps don't move focus to the new heading; the postmark stamp spins indefinitely (WCAG 2.2.2) | No. Recommended next pass | — |
| M22 | Other low-contrast text | eyebrows, footer, newsletter error | Gold on green eyebrow text 3.11:1; footer 50% cream on navy 3.64:1; red newsletter error on navy ~2.6:1 | No. Tonal change needs design sign-off | — |
| M23 | Above-the-fold image loading | listing and hub grids; hero images | 4–6 grid images get `priority` below a full-height hero; `animate-rise` (opacity 0 → 1) wraps hero images and delays LCP | No. Measured LCP is already fine (below) | — |
| M24 | Shopify Storefront errors surface as 500s | `/sitemap.xml`, product pages | Runtime errors: 12× Shopify "Internal error" on sitemap, 504s on one product, 10× "fetch failed" | No. Upstream. Worth a retry or stale fallback in `sitemap.ts` | — |
| M25 | Phone inputs etc. under 16px make iOS Safari zoom on focus | cart quantity select, builder search, dashboard, preview password | Code | No. Changes type size | — |

## Low Priority

- **Email subject line breaks.** Subjects built from visitor input can contain line breaks, which would make Postmark reject the message. **Fixed:** stripped (`src/lib/notifications.ts`).
- **Schema telephone.** It was the local "(01) 801 9810". **Fixed:** now `+353 1 801 9810` (`structured-data.ts`).
- **`AddToCart` link.** It used a plain `<a>` for /cart, which the patched lint rule rejects and which broke the build. **Fixed:** uses `<Link>`, like the rest of the site.
- **Product schema `brand`.** Falls back to "The Parcel Concierge" for wines with no `wine.producer` metafield (e.g. Whispering Angel). Fill the metafield in Shopify.
- **LocalBusiness founders.** Read as "Karen" and "Ciaran McBride", generated from "Karen and Ciaran McBride". Confirm the full names and set them explicitly.
- **Duplicate titles.** 28 groups of product titles are duplicated, e.g. 5 × "La Breithe Sona Duit", 3 × "Thank You". These are Shopify product names; consider making them distinct.
- **Short meta descriptions.** 210 products have descriptions under 70 characters; 40 hampers share one LAINEY K description. This is Shopify product copy.
- **Outbound retailer links.** Some product descriptions link to other retailers: `millesima.ie` (4 links on `/wine/gosset-grande-reserve`), plus `newgrangegold.ie`, `mojoandco.ie`, `irishsocksciety.com` and `threehillssoap.ie`. Remove these in Shopify.
- **Content links to under-populated listings.** `/gift-card` and homepage copy link to `/hampers/under-75`, which currently 307s to `/hampers`.
- **404 tab title.** In the browser, the 404 tab title reverts to the default title after hydration. The server HTML, which is what search engines read, has "Page not found".
- **HTTP apex takes 2 hops.** `http://theparcelconcierge.com` → `https://theparcelconcierge.com` → `https://www.…`. This is Vercel default behaviour and harmless.
- **HSTS.** `max-age=63072000` without `includeSubDomains` or `preload`. Add those only once every subdomain is HTTPS.
- **Readable secret.** `REVALIDATE_SECRET` is stored as "encrypted" rather than "sensitive" in Vercel, which Vercel flags as `readable-secret`. Recreate it as Sensitive.
- **Vercel bot mitigation.** 216 rapid crawler requests to filter URLs got 403 from Vercel's bot mitigation. They return 200 at normal rates. This is not a site defect; the filter URLs are disallowed in robots.txt anyway.
- **Intermittent 502.** Twice, a static JS chunk returned 502 on first load (production `/contact`, preview `/`). It returned 200 on every retry. It couldn't be reproduced; watch for it in Vercel.
- **Repository housekeeping:**
  - Two `WhatsApp Image *.jpeg` files (~360 KB each) are committed at the repo root.
  - `public/placeholder/` is unused.
  - `Snowfall` and `FairyLights` are unused but their CSS still ships.
  - Fraunces loads the unused `SOFT`/`WONK` axes.
  - `netlify.toml` and `@netlify/*` packages remain although hosting is Vercel. Harmless.
- **Minor markup:**
  - `ProductCarousel` puts `role="region"` on a `<ul>`.
  - `CartCount` has `aria-label` on a `<span>`.
  - Cart line images linked to `/hampers/<handle>`, so every wine or add-on in the cart linked to a 404. **Fixed:** they now link to `/products/<handle>`, which redirects to the right section (`src/components/cart/CartView.tsx`). Not clicked through in a browser; the redirect itself is verified on the preview.

---

## SEO Audit

**Key page inventory (production, before fixes).** The full 1,970-page inventory is in `docs/audit/site-inventory-2026-10-07.csv`.

| URL | Status | Title | Meta desc | Canonical | H1s | Indexability |
|---|---|---|---|---|---|---|
| / | 200 | The Parcel Concierge, hampers, wine and gifts… | yes (144) | apex → **fixed to www** | 1 | index |
| /hampers | 200 | Irish hampers, packed by hand | yes (154) | apex → fixed | 1 | index |
| /build-your-own-hamper | 200 | Build your own hamper | yes (136) | apex → fixed | 1 | index |
| /wine | 200 | Wine and Champagne, chosen by us | yes (96) | apex → fixed | 1 | index |
| /wine/red | 200 | Red wine, chosen by us | yes (147) | apex → fixed | 1 | index |
| /wine-club | 200 | Wine subscription built to your taste | yes (149) | apex → fixed | 1 | index |
| /wine-club/build | 200 | Build your wine subscription | yes (60) | apex → fixed | 0 in HTML (rendered client-side) | noindex |
| /corporate-gifting | 200 | Corporate gifting, one invoice | yes (135) | apex → fixed | 1 | index |
| /corporate-gifting/enquiry | 200 | Corporate gifting enquiry | yes (117) | apex → fixed | 1 | index |
| /corporate-gifting/new | 200 | Create your corporate gift campaign | yes (102) | apex → fixed | 1 | noindex |
| /occasions | 200 | Shop by occasion | yes (108) | apex → fixed | 1 | index |
| /about | 200 | About us | yes (142) | apex → fixed | 1 | index |
| /about/our-makers | 200 | Our makers | yes (143) | apex → fixed | 1 | index |
| /about/guaranteed-irish | 200 | Guaranteed Irish | yes (152) | apex → fixed | 1 | index |
| /delivery | 200 | Delivery | yes (146) | apex → fixed | 1 | index |
| /faq | 200 | Frequently asked questions | yes (100) | apex → fixed | 1 | index |
| /contact | 200 | Contact us | yes (108) | apex → fixed | 1 | index |
| /gift-card | 200 | Gift card | yes (148) | apex → fixed | 1 | index |
| /legal/terms, /privacy, /returns, /cookies | 200 | Terms / Privacy / Refund / Cookies | yes (73–90) | apex → fixed | 1 | index (now in sitemap) |
| /cart | 200 | Your cart | duplicate of homepage | none | 1 | noindex (correct) |
| /hampers/under-75 | 307 → /hampers | — | — | — | — | redirect (under-populated) |

- **Titles:** present on every page and correctly templated. 111 product titles exceed 65 characters because of long Shopify product names. Duplicates are listed under Low Priority.
- **Meta descriptions:** present on all 1,965 pages. The duplicates and short ones are Shopify product copy.
- **Headings:** exactly one H1 on every indexable page.
- **Canonicals:**
  - Self-referencing on every indexable page; none point elsewhere.
  - The host was wrong (H1), now fixed.
  - Product pages reached via `?variant=` canonicalise to the bare URL.
- **Robots:**
  - `robots.txt` is correct: cart, API, gift, admin, search and filter parameters are disallowed.
  - No accidental `noindex` in production. Only the cart, `/corporate-gifting/new` and `/wine-club/build` are noindex, all intentionally.
  - No `X-Robots-Tag` headers.
  - Out-of-stock products are `noindex, follow` by design.
- **Sitemap:** 1,963 URLs. Fixed: host, 3 × 404, duplicates, and the missing legal pages. No staging hosts.
- **Structured data:** JSON-LD parsed without error on all 1,965 pages.
  - Sitewide: `LocalBusiness` and `WebSite` (with SearchAction; `/search` exists).
  - `BreadcrumbList` on 1,949 pages, `Product` on 1,928, `FAQPage` on 2.
  - All match visible content.
  - URLs are now www.
- **Open Graph / X:**
  - `og:title` and `og:description` on every page; `twitter:card=summary_large_image`.
  - Default share image `/og-default.jpg` (1200×630, 92 KB) resolves.
  - Product images come from cdn.shopify.com.
  - `og:url` is not emitted. Optional; canonical covers it.

## Performance Audit

Throttled mobile measurements on production (390×844, 4× CPU, ~1.6 Mbps):

| Page | TTFB | FCP | LCP | CLS | JS (transfer) |
|---|---|---|---|---|---|
| / | 161 ms | 972 ms | 1.83 s (hero photo) | 0 | 131 KB |
| /hampers | 590 ms | 1.26 s | 2.07 s (hero photo) | 0 | 122 KB |
| /wine/red | 278 ms | 1.10 s | 1.25 s | 0 | 129 KB |
| /wine/chateau-desclans-whispering-angel-rose | 187 ms | 1.03 s | 1.03 s | 0 | 130 KB |
| /build-your-own-hamper | 229 ms | 1.03 s | 1.03 s | 0 | 131 KB |
| /contact | 153 ms | 984 ms | 984 ms | 0.002 | 124 KB |

- **Overall:** all pages are within "good" LCP (≤ 2.5 s) and CLS (≤ 0.1), even under throttling.
- **Rendering:** pages are statically generated or ISR, and served from Vercel's cache (`x-vercel-cache: HIT`, Brotli).
- **JavaScript:** 103 KB shared first-load JS. No heavy client libraries; dependencies are just Next and React.
- **Images:** all through `next/image` with AVIF/WebP and `sizes`.
- **Fonts:** `next/font`, `display: swap`.
- **INP:** not measurable in a lab run. Nothing in the code suggests long tasks; the largest client bundles are the interactive wizards.
- **Biggest remaining opportunities (M23):**
  - Remove `animate-rise` from hero image wrappers.
  - Stop giving `priority` to below-the-fold grid images.
  - Drop the unused Fraunces axes.
- **Source files:** four over 500 KB in `public/photography`. They are served optimised, so this is not visitor-facing.

## Accessibility Audit

- **Good:**
  - A skip link to `#main` on every page.
  - Landmarks present.
  - A global 3px `:focus-visible` outline.
  - Reduced-motion respected for CSS animation.
  - Native `<details>` accordions.
  - Every `<img>` has alt (crawl: 0 missing); decorative SVGs use `alt=""` and `aria-hidden`.
  - Form fields labelled, with `aria-invalid` and `aria-describedby` on the contact form.
  - No unnamed buttons or links, and no unlabelled inputs, on the 22 pages tested.
- **Fixed:** M3, M14–M18; M8 also fixes error recovery.
- **Outstanding:** H5 and M22 (contrast; needs design sign-off), M21 (menu, wizard focus, stamp animation), the M25 iOS zoom, and the low-priority markup items.

## Security Audit

- **Secrets:**
  - None in the repository; only `.env.example` is tracked.
  - No server-only variable is read in a client component.
  - The Shopify Storefront token is a public, read-only scope by design.
  - The Admin token is used by scripts only.
- **Endpoints:**
  - The Shopify webhook checks its HMAC over the raw body with a timing-safe comparison, and refuses everything without a secret.
  - `/api/revalidate` needs a bearer token, compared timing-safely.
  - Admin is closed while `CORPORATE_ADMIN_KEY` is unset.
- **Fixed:** C2, M11, M12, M13, and the email-subject issue.
- **XSS:** JSON-LD escapes `<`. `dangerouslySetInnerHTML` renders only CMS copy and Shopify product HTML. That relies on trusted Shopify editors, which is acceptable.
- **Cookies:** httpOnly, SameSite=Lax, and Secure in production.
- **CSRF:** server actions use Next's origin check. JSON routes need a CORS preflight.
- **Headers now:** HSTS (Vercel), `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, CSP `frame-ancestors 'self'`, `Permissions-Policy`.
- **Source maps:** not published (`.map` returns 403).
- **Recommended:**
  - A full CSP in report-only mode first.
  - Rate limiting and a honeypot on the newsletter and corporate forms; only the contact form has a honeypot.
  - Move the admin key out of the query string (it ends up in logs and history).
  - Tighter input validation on public campaign creation.
  - Compute bottle limits on the server rather than trusting the client.

## Forms & Integrations

| Form | Where it goes in production today | Status |
|---|---|---|
| Contact (`/contact`) | Postmark email to `CONTACT_FORM_TO`; honeypot; validation; pending state | Works. Value loss on error fixed (M8). Deploy skew errors (H4) |
| Corporate enquiry | Postmark email (falls back to the contact inbox); CRM webhook unset | Works. Value loss on error fixed; radio error now linked to the field |
| Newsletter (footer, homepage) | **Log line only** | **Broken: C3** |
| Corporate campaign wizard | Upstash KV (not connected) | **Broken: H2** |
| Gift redemption / dashboard / admin | KV / admin key | Unavailable until H2 is resolved |
| Wine club build | Quiz works; checkout honestly says "not open for sign-ups" (no selling-plan IDs set) | As designed |
| Hamper builder / add to cart | Shopify cart; stock checked on the server | Works (not purchased) |
| Search | GET `/search` | Works |

No live submissions were made. Postmark delivery itself was not tested end to end, because that would send real mail. Confirm with one real test message (see Remaining Manual Checks).

## Analytics & Tracking

- No GA4, GTM, Google Ads, Meta, LinkedIn or TikTok tag loads in production; the environment variables are unset.
- There are no duplicate installations.
- The event layer pushes to `window.dataLayer` harmlessly.
- See H3 for what is needed first: consent, then IDs, then the event gaps.
- This can't be verified further without access to the GA4, Ads and Meta accounts.

## Mobile & Responsive

- **Tested widths:** 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 px on 22 production pages.
- **Defects found:** header overflow at 320 on every page (M5), contact email at 320 (M7), and the empty gallery at 1024 (M6).
- **After the fixes:** zero horizontal overflow at every width, both locally and on the preview with live data.
- **What is fine:**
  - No `100vh` traps.
  - Tables wrapped for overflow.
  - Fixed bottom bars leave room beneath them.
- **Outstanding:** M25 (iOS input zoom). Optional: the mobile menu's `max-h-[75vh]` would be better as `dvh`.

## Redirects

- **Map:** 80 permanent rules, validated with no duplicates, chains or loops.
- **HTTP → HTTPS → www:** works, with 308s. The www host is primary.
- **Trailing slashes:** stripped with a 308. Uppercase paths 404, which is standard.

| Old URL | New URL | Status |
|---|---|---|
| /products/&lt;any live handle&gt; | /hampers, /wine or /gifts/&lt;handle&gt; | 404 → **308 (fixed)** |
| /collections/*/products/&lt;handle&gt; | same | 404 → **308 (fixed)** |
| /collections/all, /hampers, /wine, /red-wine, … (44 rows) | mapped listings | 308 ✔ |
| /collections/beauty, /skincare | /hampers/pamper (404) → **/hampers** | fixed |
| /pages/contact | /contact | 404 → **308 (fixed)** |
| /policies/shipping-policy | /delivery | **added** |
| /hampers/build-a-hamper | /build-your-own-hamper | 404 → **308 (fixed)** |
| /pages/about-us, /policies/privacy-policy, etc. | mapped | 308 ✔ |
| /blogs/*, /account, unmapped collections, removed products | — | 404 (H6) |
| rows pointing at /hampers/under-75, /occasions/new-baby, /sympathy, /wedding-engagement | then 307 → parent | chain (M20) |

## Broken Links

- **Internal:**
  - No broken internal links found across 2,359 crawled pages.
  - No `href="#"` or `javascript:` links.
  - No links to localhost, vercel.app, netlify.app or staging hosts.
- **Sitemap:** the only 404s were 3 sitemap entries (fixed, M1).
- **Redirect map:** 4 placeholder product rows and 2 pamper rows pointed at 404s (fixed, M4).
- **External:** 10 unique external links.
  - The Trustpilot profile and rooftoptwentytwo.ie are on every page and resolve. Trustpilot returns 403 to curl only.
  - The rest are retailer links inside product descriptions (Low Priority).
- **tel/mailto:** formatted correctly (`tel:018019810`, `mailto:hello@theparcelconcierge.com`), and the displayed number matches the linked one.

## Code Quality

- **Before:**
  - Typecheck clean; lint clean (with the old plugin).
  - Tests: 100 passing, 2 failing.
  - No `console.log`, TODO/FIXME or lorem ipsum in `src`.
- **After:**
  - Typecheck clean, lint clean.
  - Tests: **102 passing, 1 failing** (M19, which needs a product decision).
  - Production build succeeds on Next 15.5.27.
  - The redirect map validates.
- **Dependencies:** next, react and tailwind are one minor version behind (fine). Next 16 and ESLint 10 are available as majors and not adopted. Residual audit items are build-time only (C2).

## Deployment

- **Hosting:** Vercel. Domains:
  - `www.theparcelconcierge.com` (primary)
  - `theparcelconcierge.com` (308 to www)
  - `the-parcel-concierge.vercel.app`
- **Production environment set:** Shopify Storefront pair and API version, webhook secret, revalidate secret, Postmark trio.
- **Production environment missing:** `NEXT_PUBLIC_SITE_URL` (now has a correct default), newsletter webhook, KV, admin key, analytics IDs, Trustpilot keys (falls back to verified figures), wine club plans.
- **Builds:**
  - The production build passes locally in fixture mode.
  - The Vercel preview of this branch built and served real catalogue data.
  - The local build with this sandbox's Shopify credentials fails: those credentials return 404 from Shopify. That is a sandbox setting, not production.
- **Preview deployments:** noindex via `SITE_NOINDEX` (confirmed).
- **Old Vercel address:** `parcel-concierge.vercel.app` returns 404. Per `docs/deployment.md`, it should redirect to `/build-your-own-hamper` on the real domain. That is a host-level setting.

## Remaining Manual Checks

1. **Merge `claude/gracious-wozniak-1nvcrh` into `main`**, then re-crawl production. In particular, spot-check `/products/<handle>` redirects and the sitemap host.
2. **C3:** decide where newsletter sign-ups go, then set `NEWSLETTER_WEBHOOK`. Update the success message if no code is sent automatically.
3. **H2:** connect Upstash KV and set `CORPORATE_ADMIN_KEY`, or hide `/corporate-gifting/new`.
4. **H3:** choose a consent tool, then set the GA4, Ads and Meta IDs. Verify in GA4 DebugView and Meta Events Manager, and prove `purchase` fires once across the Shopify checkout handoff (`docs/analytics.md`).
5. **H4:** enable Vercel Skew Protection.
6. **Search Console:**
   - Verify the www (or Domain) property.
   - Submit `https://www.theparcelconcierge.com/sitemap.xml`.
   - Export the old-site URLs with clicks or links and build the removed-product rows (H6, C1).
7. Send one real contact-form message and one corporate enquiry to confirm Postmark delivery and the From-domain DKIM.
8. Confirm the `pamper-hampers-1` collection in Shopify, then restore the `/collections/beauty` and `/skincare` rows to `/hampers/pamper`.
9. Get design sign-off on the contrast changes (H5, M22).
10. Set `wine.producer` on wines missing it. Clean the competitor links and duplicate titles out of Shopify product copy.
11. Test on real devices: iOS Safari (sticky header, drawer, inputs) and Android Chrome. This audit used Chromium emulation only. Safari, Firefox and Edge were reviewed from the code, with no engine-specific issues found.
12. Recreate `REVALIDATE_SECRET` as a Sensitive variable. Optionally set `NEXT_PUBLIC_SITE_URL` explicitly.

---

## Launch Score

Scores are for production **after this branch is merged**. Today's live site, without the fixes, is shown in brackets.

| Category | Score | Why |
|---|---|---|
| Technical SEO | **8/10** (5) | Canonicals, sitemap, schema and legacy product redirects fixed; removed-product redirects outstanding |
| Performance | **9/10** (9) | Good LCP and zero CLS everywhere; small LCP refinements remain |
| Accessibility | **6/10** (5) | Solid foundations; brand-red contrast and some focus management outstanding |
| Security | **8/10** (5) | RCE patched, timing-safe comparisons, headers; full CSP and rate limits outstanding |
| Mobile | **9/10** (7) | No overflow at any tested width after fixes; iOS input zoom remains |
| Forms | **5/10** (4) | Contact and enquiry work and now keep input; newsletter loses data; campaign tool can't save |
| Analytics | **2/10** (2) | Nothing installed and no consent mechanism |
| Code Quality | **8/10** (8) | Typed, linted, tested, documented; 1 failing test needs a decision |
| Deployment | **8/10** (7) | Clean Vercel setup; skew protection and several environment variables missing |

**TOTAL: 63/90** after merge (52/90 for the live site as it stands today).
