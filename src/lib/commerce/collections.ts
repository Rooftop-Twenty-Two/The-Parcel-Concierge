import type { ProductQuery } from './types'

/**
 * The hamper builder's parent product.
 *
 * The live store's builder boxes are Shopify products of type
 * GIST_BUILDER_PRODUCT: `build-a-hamper` (standard) and
 * `build-a-premium-hamper` (premium). The standard box is the parent the
 * builder route resolves; both are hidden from listings below.
 *
 * It lives here rather than in hamper-builder.ts because the ingest tool
 * and the redirect validator both read this module directly, and it must
 * stay free of runtime imports so they can.
 */
export const BUILDER_PARENT_HANDLE = 'build-a-hamper'

/** The premium builder box. Hidden from listings like the standard box. */
export const BUILDER_PREMIUM_HANDLE = 'build-a-premium-hamper'

/**
 * The builder's optional hand-tied bow. No such product exists on the live
 * store today, so the builder simply does not offer a bow until one does.
 */
export const BUILDER_BOW_HANDLE = 'gift-bow'

/**
 * The wicker baskets, offered as containers on the builder's first step
 * alongside the display hampers. The medium basket's live handle really is
 * `small-basket`.
 */
export const WICKER_BASKET_HANDLES = {
  small: 'small-wicker-basket',
  medium: 'small-basket',
  large: 'large-wicker-basket',
} as const

/**
 * Products that exist in Shopify but must never appear in a listing, in a
 * grid, in the sitemap, or at a product URL of their own.
 *
 * The builder box products are mechanisms, not hampers you buy off a grid.
 * Left in, they show up in every hamper listing priced "From €8.50".
 * Enforced in the query layer (productsByCollection filters these handles)
 * rather than per listing, so a new listing cannot forget it.
 */
export const HIDDEN_FROM_LISTINGS: ReadonlySet<string> = new Set([
  BUILDER_PARENT_HANDLE,
  BUILDER_PREMIUM_HANDLE,
  BUILDER_BOW_HANDLE,
  // A basket on its own is not a gift; it is sold only as the container of
  // a built hamper. Hiding it here also keeps it off the picker's shelves.
  ...Object.values(WICKER_BASKET_HANDLES),
])

/**
 * The listing-route registry.
 *
 * Every listing page on the site is one row in here. Adding a listing means
 * adding a row, not adding a route file. The registry drives:
 *   - the dynamic route handlers under /hampers, /wine, /occasions and so on
 *   - the sitemap
 *   - breadcrumbs and structured data
 *   - the min-four-products rule (brief section 5)
 *
 * Each listing reads a native Shopify COLLECTION (the live store's real
 * taxonomy) via `query.collection`. The store carries no type:/occasion:
 * tags, so tag-based queries return nothing; collection handles do not.
 *
 * Grape variety, region and style are facets on /wine, not routes. The old
 * site's ~50 grape sub-collections do not appear here by design.
 */

/**
 * Every listing filter's query parameter. robots.txt disallows each of them,
 * because the filter combinations are endless and every one renders fresh.
 */
export const FACET_KEYS = ['grape', 'region', 'country', 'style', 'price', 'occasion', 'recipient'] as const

export type FacetKey = (typeof FACET_KEYS)[number]

export type CollectionHub =
  | 'hampers'
  | 'wine'
  | 'occasions'
  | 'gifts-for'
  | 'gifts-by-budget'
  | 'gifts'
  | 'corporate-gifting'

export type CollectionDef = {
  /** Last path segment. Unique within its hub. */
  slug: string
  hub: CollectionHub
  /** Canonical path. Products never live under a collection path. */
  path: string
  /** <title> and nav label. */
  title: string
  h1: string
  /**
   * What fills the grid. Normally a native Shopify collection handle via
   * `collection`. `curated: true` rows are filled by the CMS by handle.
   */
  query: ProductQuery
  /** True when the listing can contain alcohol, which arms the age gate. */
  alcohol: boolean
  /** Facets exposed as URL-driven filters on this listing. */
  facets: FacetKey[]
  /** Where an under-populated listing redirects to. */
  parentPath: string
  /**
   * Curated listings are populated by the CMS rather than by a query. Their
   * product set is resolved at request time from the CMS document with the
   * matching path.
   */
  curated?: boolean
  /**
   * Lead with the Shopify collection's own description as the intro when it
   * has one, ahead of the CMS intro. For pages whose copy the merchant
   * keeps in Shopify admin.
   */
  introFromShopify?: boolean
  /**
   * For a listing linked from the menu before it has stock. Under the
   * four-product floor it renders this message in place of the grid, kept
   * out of search, instead of redirecting to its parent: a menu link that
   * bounces to a different page looks broken.
   */
  comingSoon?: string
}

const HAMPER_BASE: ProductQuery = { sort: 'featured', first: 24 }
const WINE_BASE: ProductQuery = { sort: 'featured', first: 24 }

/**
 * SEASONAL — one live hamper range (client request via Cathal, September 2026).
 *
 * The client's live hamper range is one merchant collection; the year-round
 * hampers are retired for the season. While SEASONAL_HAMPERS_ONLY is true:
 *   - the /hampers hub grid reads HAMPERS_COLLECTION (see hampers/page.tsx)
 *   - the homepage featured band reads it too
 *   - "More hampers" on a product page reads it (commerce/similar.ts)
 *   - the hamper price bands read it too, so "Shop by budget" on the
 *     homepage and the hub's cards lead to the live range
 *   - every hamper THEME sub-listing (wine, food, pamper, baby, ...) is
 *     dropped from the active COLLECTIONS below, because those read the old
 *     merchant collections and would surface off-season or old-catalogue
 *     hampers in the nav, the sitemap, static params or route resolution.
 *
 * ONE CONSTANT, read everywhere. The handle used to be typed out in three
 * places and had already drifted into two different values, which is how a
 * seasonal swap half happens: the hub shows the new range and the homepage
 * still shows last year's.
 *
 * A wrong handle cannot ship silently. `collections:validate` runs inside
 * `npm run build` and exits non-zero when a mapped collection is missing on
 * the store, so the deploy fails loudly rather than serving an empty shop.
 *
 * Hamper *products* still resolve at /hampers/<handle>: resolveHubSlug reads
 * the product, not this registry. To restore the full year-round hamper range,
 * set SEASONAL_HAMPERS_ONLY to false.
 */
export const SEASONAL_HAMPERS_ONLY = true

/**
 * The merchant's "General Hampers 2026" range. NOTE: its Shopify handle is
 * `christmas-2026`, NOT `general-hampers-2026`. The merchant renamed the
 * collection's *title* to "General Hampers 2026" in September 2026, but Shopify
 * keeps the handle from when it was titled "Christmas 2026". Verified against
 * the live store (20 products, all available, updated 2026-09-18). Read the
 * handle from the collection's admin URL, not its title, if this changes again
 * — a title-derived guess (general-hampers-2026) is a dead handle here and
 * fails the build via collections:validate.
 */
export const SEASONAL_HAMPERS_COLLECTION = 'christmas-2026'

/**
 * The merchant's "Christmas 2026" collection, which fills /occasions/christmas
 * in its manual order. It is a separate collection from General Hampers 2026
 * (client, October 2026), and the two stay separate on the site: the hampers
 * hub, homepage band and budget bands read HAMPERS_COLLECTION, never this.
 *
 * Mind the crossed handles: "Christmas 2026" is `christmas-2027`, and
 * `christmas-2026` above is General Hampers 2026. Confirmed from the store's
 * collection list, October 2026. Read handles from the admin URL, never the
 * title. Null would fall the Christmas page back to the general range.
 */
export const CHRISTMAS_COLLECTION: string | null = 'christmas-2027'

export const HAMPERS_COLLECTION = SEASONAL_HAMPERS_ONLY
  ? SEASONAL_HAMPERS_COLLECTION
  : 'all-hampers-1'

/**
 * The full listing registry. The active `COLLECTIONS` below is derived from
 * this, dropping the hamper sub-listings while SEASONAL_HAMPERS_ONLY is on.
 */
const ALL_LISTINGS: readonly CollectionDef[] = [
  // ---------------------------------------------------------------------
  // Hampers. Budget bands read the LIVE hamper range (HAMPERS_COLLECTION)
  // with a price filter, so they follow the seasonal swap and stay active
  // while SEASONAL_HAMPERS_ONLY is on. They are what the homepage "Shop by
  // budget" cards link to: the client's ask (September 2026) is that those
  // cards lead to hampers, not to the mixed All Gifts collection.
  // Budget bands first: highest-intent, real indexable routes.
  // ---------------------------------------------------------------------
  {
    slug: 'under-75',
    hub: 'hampers',
    path: '/hampers/under-75',
    title: 'Hampers under €75',
    h1: 'Hampers under €75',
    query: { ...HAMPER_BASE, collection: HAMPERS_COLLECTION, maxPriceMinor: 7499 },
    alcohol: true,
    facets: ['occasion', 'recipient'],
    parentPath: '/hampers',
  },
  {
    slug: '75-125',
    hub: 'hampers',
    path: '/hampers/75-125',
    title: 'Hampers €75 to €125',
    h1: 'Hampers from €75 to €125',
    query: { ...HAMPER_BASE, collection: HAMPERS_COLLECTION, minPriceMinor: 7500, maxPriceMinor: 12499 },
    alcohol: true,
    facets: ['occasion', 'recipient'],
    parentPath: '/hampers',
  },
  {
    slug: '125-200',
    hub: 'hampers',
    path: '/hampers/125-200',
    title: 'Hampers €125 to €200',
    h1: 'Hampers from €125 to €200',
    query: { ...HAMPER_BASE, collection: HAMPERS_COLLECTION, minPriceMinor: 12500, maxPriceMinor: 19999 },
    alcohol: true,
    facets: ['occasion', 'recipient'],
    parentPath: '/hampers',
  },
  {
    slug: 'luxury-200-plus',
    hub: 'hampers',
    path: '/hampers/luxury-200-plus',
    title: 'Luxury hampers over €200',
    h1: 'Luxury hampers, €200 and over',
    query: { ...HAMPER_BASE, collection: HAMPERS_COLLECTION, minPriceMinor: 20000 },
    alcohol: true,
    facets: ['occasion', 'recipient'],
    parentPath: '/hampers',
  },

  // Hamper themes. Wine and food hampers share the merchant's single
  // Food & Wine Hampers collection until it is split; both stay dark below
  // the four-product floor until the merchant populates it.
  {
    slug: 'wine',
    hub: 'hampers',
    path: '/hampers/wine',
    title: 'Wine hampers',
    h1: 'Wine hampers',
    query: { ...HAMPER_BASE, collection: 'food-and-wine-hampers-1' },
    alcohol: true,
    facets: ['price', 'occasion'],
    parentPath: '/hampers',
  },
  {
    slug: 'food',
    hub: 'hampers',
    path: '/hampers/food',
    title: 'Food hampers',
    h1: 'Food hampers',
    query: { ...HAMPER_BASE, collection: 'food-and-wine-hampers-1' },
    alcohol: false,
    facets: ['price', 'occasion'],
    parentPath: '/hampers',
  },
  {
    slug: 'pamper',
    hub: 'hampers',
    path: '/hampers/pamper',
    title: 'Pamper hampers',
    h1: 'Pamper hampers',
    query: { ...HAMPER_BASE, collection: 'pamper-hampers-1' },
    alcohol: false,
    facets: ['price', 'recipient'],
    parentPath: '/hampers',
  },
  {
    slug: 'new-baby',
    hub: 'hampers',
    path: '/hampers/new-baby',
    title: 'New baby hampers',
    h1: 'New baby hampers',
    query: { ...HAMPER_BASE, collection: 'baby-hampers-1' },
    // The baby hampers can carry Prosecco or Champagne for the parents, so
    // this listing arms the age gate.
    alcohol: true,
    facets: ['price'],
    parentPath: '/hampers',
  },
  {
    // No native sympathy collection exists yet. Pre-wired to the handle the
    // merchant will create ('sympathy' — see shopify-client-checklist.csv);
    // it darks gracefully until that collection exists.
    slug: 'sympathy',
    hub: 'hampers',
    path: '/hampers/sympathy',
    title: 'Sympathy hampers',
    h1: 'Sympathy hampers',
    query: { ...HAMPER_BASE, collection: 'sympathy' },
    alcohol: false,
    facets: ['price'],
    parentPath: '/hampers',
  },
  {
    // Only match is a gifts collection, not hampers-only — grid reads as
    // "anniversary gifts". Accepted over leaving the route dark.
    slug: 'anniversary',
    hub: 'hampers',
    path: '/hampers/anniversary',
    title: 'Anniversary hampers',
    h1: 'Anniversary hampers',
    query: { ...HAMPER_BASE, collection: 'gifts-by-anniversary-1' },
    alcohol: true,
    facets: ['price', 'recipient'],
    parentPath: '/hampers',
  },
  {
    slug: 'thank-you',
    hub: 'hampers',
    path: '/hampers/thank-you',
    title: 'Thank you hampers',
    h1: 'Thank you hampers',
    query: { ...HAMPER_BASE, collection: 'thank-you' },
    alcohol: true,
    facets: ['price', 'recipient'],
    parentPath: '/hampers',
  },
  {
    // The merchant's 'corporate' collection is empty; using the populated
    // gifts-for-employees as the proxy until 'corporate' is filled.
    slug: 'corporate',
    hub: 'hampers',
    path: '/hampers/corporate',
    title: 'Corporate hampers',
    h1: 'Corporate hampers',
    query: { ...HAMPER_BASE, collection: 'gifts-for-employees' },
    alcohol: true,
    facets: ['price'],
    parentPath: '/hampers',
  },

  // ---------------------------------------------------------------------
  // Wine and spirits. The Wine Vault.
  // ---------------------------------------------------------------------
  {
    // No native exclusive collection exists. Pre-wired to 'exclusive-to-us'
    // for the merchant to create; darks until then.
    slug: 'exclusive-to-us',
    hub: 'wine',
    path: '/wine/exclusive-to-us',
    title: 'Exclusive to us',
    h1: 'Wines you will not find anywhere else in Ireland',
    query: { ...WINE_BASE, collection: 'exclusive-to-us' },
    alcohol: true,
    facets: ['grape', 'country', 'price'],
    parentPath: '/wine',
  },
  {
    slug: 'value-edit',
    hub: 'wine',
    path: '/wine/value-edit',
    title: 'The value edit',
    h1: 'The value edit',
    // Curated: every product on this page needs a verified price comparison
    // behind it. A query cannot know which ones we hold evidence for.
    query: { ...WINE_BASE },
    curated: true,
    alcohol: true,
    facets: ['price'],
    parentPath: '/wine',
  },
  {
    slug: 'fine-wines',
    hub: 'wine',
    path: '/wine/fine-wines',
    title: 'Fine wines',
    h1: 'Fine wines',
    query: { ...WINE_BASE, collection: 'fine-wines-1', first: 48 },
    alcohol: true,
    facets: ['grape', 'country', 'style', 'price'],
    parentPath: '/wine',
  },
  {
    slug: 'organic-biodynamic',
    hub: 'wine',
    path: '/wine/organic-biodynamic',
    title: 'Organic and biodynamic',
    h1: 'Organic wine',
    query: { ...WINE_BASE, collection: 'organic-wine', first: 48 },
    alcohol: true,
    facets: ['grape', 'country', 'price'],
    parentPath: '/wine',
  },
  {
    slug: 'alcohol-free',
    hub: 'wine',
    path: '/wine/alcohol-free',
    title: 'Non alcoholic',
    h1: 'Non-alcoholic wine and drinks',
    // The merchant's new Non Alcoholic collection (October 2026), which
    // replaces the older non-alcoholic-1. The URL stays /wine/alcohol-free
    // so existing links and search results keep working.
    query: { ...WINE_BASE, collection: 'non-alcoholic' },
    introFromShopify: true,
    alcohol: false,
    facets: ['style'],
    parentPath: '/wine',
  },
  {
    slug: 'champagne-sparkling',
    hub: 'wine',
    path: '/wine/champagne-sparkling',
    title: 'Champagne and sparkling',
    h1: 'Champagne and sparkling wine',
    query: { ...WINE_BASE, collection: 'champagne-and-prosecco-1' },
    alcohol: true,
    facets: ['country', 'region', 'price'],
    parentPath: '/wine',
  },
  {
    slug: 'red',
    hub: 'wine',
    path: '/wine/red',
    title: 'Red wine',
    h1: 'Red wine',
    query: { ...WINE_BASE, collection: 'red-wines-1' },
    alcohol: true,
    facets: ['grape', 'country', 'region', 'style', 'price'],
    parentPath: '/wine',
  },
  {
    slug: 'white',
    hub: 'wine',
    path: '/wine/white',
    title: 'White wine',
    h1: 'White wine',
    query: { ...WINE_BASE, collection: 'white-wines-1' },
    alcohol: true,
    facets: ['grape', 'country', 'region', 'style', 'price'],
    parentPath: '/wine',
  },
  {
    slug: 'rose',
    hub: 'wine',
    path: '/wine/rose',
    title: 'Rosé wine',
    h1: 'Rosé wine',
    query: { ...WINE_BASE, collection: 'rose' },
    alcohol: true,
    facets: ['grape', 'country', 'price'],
    parentPath: '/wine',
  },
  {
    slug: 'liqueurs-cider',
    hub: 'wine',
    path: '/wine/liqueurs-cider',
    title: 'Liqueurs and cider',
    h1: 'Liqueurs and cider',
    // The merchant's Liqueurs and Cider collection (October 2026).
    query: { ...WINE_BASE, collection: 'liqueurs-and-cider' },
    // Empty until the merchant tags products into it (October 2026), and it
    // is in the menu already.
    comingSoon:
      'Our liqueurs and cider are on their way to the shelf. In the meantime, the rest of the Wine Vault is open.',
    alcohol: true,
    facets: ['country', 'price'],
    parentPath: '/wine',
  },
  {
    slug: 'port-dessert',
    hub: 'wine',
    path: '/wine/port-dessert',
    title: 'Port and sherry',
    h1: 'Port and sherry',
    query: { ...WINE_BASE, collection: 'port-and-sherry-1' },
    alcohol: true,
    facets: ['country', 'price'],
    parentPath: '/wine',
  },
  {
    slug: 'gift-sets',
    hub: 'wine',
    path: '/wine/gift-sets',
    title: 'Wine gift sets',
    h1: 'Wine gift sets',
    query: { ...WINE_BASE, collection: 'wine-gift-sets' },
    alcohol: true,
    facets: ['price'],
    parentPath: '/wine',
  },
  {
    // No native all-wine collection (wine-collection-1 is empty), so the wine
    // price bands read Fine Wines (250) as the proxy master.
    slug: 'under-25',
    hub: 'wine',
    path: '/wine/under-25',
    title: 'Wine under €25',
    h1: 'Wine under €25',
    query: { ...WINE_BASE, collection: 'fine-wines-1', maxPriceMinor: 2499 },
    alcohol: true,
    facets: ['grape', 'country'],
    parentPath: '/wine',
  },
  {
    slug: '25-50',
    hub: 'wine',
    path: '/wine/25-50',
    title: 'Wine €25 to €50',
    h1: 'Wine from €25 to €50',
    query: { ...WINE_BASE, collection: 'fine-wines-1', minPriceMinor: 2500, maxPriceMinor: 4999 },
    alcohol: true,
    facets: ['grape', 'country'],
    parentPath: '/wine',
  },
  {
    slug: '50-plus',
    hub: 'wine',
    path: '/wine/50-plus',
    title: 'Wine €50 and over',
    h1: 'Wine, €50 and over',
    query: { ...WINE_BASE, collection: 'fine-wines-1', minPriceMinor: 5000 },
    alcohol: true,
    facets: ['grape', 'country'],
    parentPath: '/wine',
  },

  // ---------------------------------------------------------------------
  // Occasions. Each reads the merchant's seasonal / occasion collection.
  // ---------------------------------------------------------------------
  {
    slug: 'christmas',
    hub: 'occasions',
    path: '/occasions/christmas',
    title: 'Christmas gifts and hampers',
    h1: 'Christmas gifts and hampers',
    // The merchant's Christmas 2026 collection, in its manual order. See
    // CHRISTMAS_COLLECTION for the interim fallback.
    query: { collection: CHRISTMAS_COLLECTION ?? HAMPERS_COLLECTION, sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price', 'recipient'],
    parentPath: '/occasions',
  },
  {
    slug: 'mothers-day',
    hub: 'occasions',
    path: '/occasions/mothers-day',
    title: "Mother's Day gifts",
    h1: "Mother's Day gifts",
    query: { collection: 'mothers-day-gifts', sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price'],
    parentPath: '/occasions',
  },
  {
    slug: 'fathers-day',
    hub: 'occasions',
    path: '/occasions/fathers-day',
    title: "Father's Day gifts",
    h1: "Father's Day gifts",
    query: { collection: 'fathers-day', sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price'],
    parentPath: '/occasions',
  },
  {
    slug: 'valentines',
    hub: 'occasions',
    path: '/occasions/valentines',
    title: "Valentine's gifts",
    h1: "Valentine's gifts",
    query: { collection: 'valentines-day', sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price'],
    parentPath: '/occasions',
  },
  {
    slug: 'easter',
    hub: 'occasions',
    path: '/occasions/easter',
    title: 'Easter gifts',
    h1: 'Easter gifts',
    query: { collection: 'easter-1', sort: 'featured', first: 24 },
    alcohol: false,
    facets: ['price'],
    parentPath: '/occasions',
  },
  {
    slug: 'new-baby',
    hub: 'occasions',
    path: '/occasions/new-baby',
    title: 'New baby gifts',
    h1: 'New baby gifts',
    query: { collection: 'gifts-for-baby', sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price'],
    parentPath: '/occasions',
  },
  {
    // Pre-wired to the 'sympathy' collection the merchant will create.
    slug: 'sympathy',
    hub: 'occasions',
    path: '/occasions/sympathy',
    title: 'Sympathy gifts',
    h1: 'Sympathy gifts',
    query: { collection: 'sympathy', sort: 'featured', first: 24 },
    alcohol: false,
    facets: ['price'],
    parentPath: '/occasions',
  },
  {
    slug: 'wedding-engagement',
    hub: 'occasions',
    path: '/occasions/wedding-engagement',
    title: 'Wedding and engagement gifts',
    h1: 'Wedding and engagement gifts',
    query: { collection: 'wedding-anniversary', sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price'],
    parentPath: '/occasions',
  },
  {
    // Pre-wired to the 'get-well' collection the merchant will create.
    slug: 'get-well',
    hub: 'occasions',
    path: '/occasions/get-well',
    title: 'Get well gifts',
    h1: 'Get well gifts',
    query: { collection: 'get-well', sort: 'featured', first: 24 },
    alcohol: false,
    facets: ['price'],
    parentPath: '/occasions',
  },

  // ---------------------------------------------------------------------
  // Recipient.
  // ---------------------------------------------------------------------
  {
    slug: 'her',
    hub: 'gifts-for',
    path: '/gifts-for/her',
    title: 'Gifts for her',
    h1: 'Gifts for her',
    query: { collection: 'gifts-for-her-1', sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price', 'occasion'],
    parentPath: '/gifts-for',
  },
  {
    slug: 'him',
    hub: 'gifts-for',
    path: '/gifts-for/him',
    title: 'Gifts for him',
    h1: 'Gifts for him',
    query: { collection: 'gifts-for-him-1', sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price', 'occasion'],
    parentPath: '/gifts-for',
  },
  {
    slug: 'couples',
    hub: 'gifts-for',
    path: '/gifts-for/couples',
    title: 'Gifts for couples',
    h1: 'Gifts for couples',
    query: { collection: 'gifts-for-couples-1', sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price', 'occasion'],
    parentPath: '/gifts-for',
  },
  {
    slug: 'clients',
    hub: 'gifts-for',
    path: '/gifts-for/clients',
    title: 'Gifts for clients',
    h1: 'Gifts for clients',
    query: { collection: 'gifts-for-customers', sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price'],
    parentPath: '/gifts-for',
  },

  // ---------------------------------------------------------------------
  // Budget. Scoped to the All Gifts collection with a price filter so the
  // band never pulls the whole store.
  // ---------------------------------------------------------------------
  {
    slug: 'under-50',
    hub: 'gifts-by-budget',
    path: '/gifts-by-budget/under-50',
    title: 'Gifts under €50',
    h1: 'Gifts under €50',
    query: { collection: 'all-gifts', maxPriceMinor: 4999, sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['occasion', 'recipient'],
    parentPath: '/gifts-by-budget',
  },
  {
    slug: '50-100',
    hub: 'gifts-by-budget',
    path: '/gifts-by-budget/50-100',
    title: 'Gifts €50 to €100',
    h1: 'Gifts from €50 to €100',
    query: { collection: 'all-gifts', minPriceMinor: 5000, maxPriceMinor: 9999, sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['occasion', 'recipient'],
    parentPath: '/gifts-by-budget',
  },
  {
    slug: '100-150',
    hub: 'gifts-by-budget',
    path: '/gifts-by-budget/100-150',
    title: 'Gifts €100 to €150',
    h1: 'Gifts from €100 to €150',
    query: { collection: 'all-gifts', minPriceMinor: 10000, maxPriceMinor: 14999, sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['occasion', 'recipient'],
    parentPath: '/gifts-by-budget',
  },
  {
    slug: '150-plus',
    hub: 'gifts-by-budget',
    path: '/gifts-by-budget/150-plus',
    title: 'Gifts €150 and over',
    h1: 'Gifts, €150 and over',
    query: { collection: 'all-gifts', minPriceMinor: 15000, sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['occasion', 'recipient'],
    parentPath: '/gifts-by-budget',
  },

  // ---------------------------------------------------------------------
  // The add-on band. Small by design: added to a hamper at the cart.
  // ---------------------------------------------------------------------
  {
    slug: 'candles-diffusers',
    hub: 'gifts',
    path: '/gifts/candles-diffusers',
    title: 'Candles and diffusers',
    h1: 'Candles and diffusers',
    query: { collection: 'candles-diffusers', sort: 'featured', first: 24 },
    alcohol: false,
    facets: [],
    parentPath: '/gifts',
  },
  {
    slug: 'chocolate-treats',
    hub: 'gifts',
    path: '/gifts/chocolate-treats',
    title: 'Chocolate and treats',
    h1: 'Chocolate and treats',
    query: { collection: 'chocolate-confectionery-1', sort: 'featured', first: 24 },
    alcohol: false,
    facets: [],
    parentPath: '/gifts',
  },
  {
    slug: 'crystal-glassware',
    hub: 'gifts',
    path: '/gifts/crystal-glassware',
    title: 'Crystal and glassware',
    h1: 'Crystal and glassware',
    query: { collection: 'glassware-crystal', sort: 'featured', first: 24 },
    alcohol: false,
    facets: [],
    parentPath: '/gifts',
  },
]

/** A listing that slices its collection by price rather than by theme. */
export function isPriceBand(c: CollectionDef): boolean {
  return c.query.minPriceMinor !== undefined || c.query.maxPriceMinor !== undefined
}

/**
 * The active listing registry. While SEASONAL_HAMPERS_ONLY is on, the hamper
 * hub's theme sub-listings are suppressed so the nav, sitemap, static params
 * and route resolution all see only what should show this season. The price
 * bands stay: they read the live range, so they can only show what is in it.
 */
/**
 * There is no gift section (client, September 2026).
 *
 * The site sells hampers and wine. Everything else the shop carries is
 * sold as something you put in a hamper, so it reaches a shopper through
 * /build-your-own-hamper and nowhere else. Three hubs are retired:
 *
 *   - gifts-by-budget: its four bands read All Gifts, which is the Build
 *     a Box "Everything" shelf. Once every standalone item is tagged into
 *     it so the builder can reach them, those pages become a shop window
 *     of socks, cards and homeware.
 *   - gifts: the candles, chocolate and crystal listings. Small, but a
 *     browsable gift category all the same.
 *   - gifts-for: her, him, couples and clients. Nothing in the nav
 *     pointed at them.
 *
 * Their paths redirect to /build-your-own-hamper, except the budget bands
 * which go to the hamper bands (data/redirects/redirects.csv).
 *
 * ADD-ON PRODUCTS KEEP THEIR PAGES. /gifts/<handle> still resolves, so a
 * candle found in search, offered at the cart or suggested on a hamper
 * page has somewhere to land. What is gone is the browsable category
 * above it, not the product.
 */
const RETIRED_HUBS: ReadonlySet<CollectionHub> = new Set(['gifts-by-budget', 'gifts', 'gifts-for'])

export const COLLECTIONS: readonly CollectionDef[] = ALL_LISTINGS.filter(
  (c) =>
    !RETIRED_HUBS.has(c.hub) && !(SEASONAL_HAMPERS_ONLY && c.hub === 'hampers' && !isPriceBand(c)),
)

const BY_PATH = new Map(COLLECTIONS.map((c) => [c.path, c]))

export function getCollectionByPath(path: string): CollectionDef | undefined {
  return BY_PATH.get(path)
}

export function getCollection(hub: CollectionHub, slug: string): CollectionDef | undefined {
  return BY_PATH.get(`/${hub}/${slug}`)
}

export function collectionsInHub(hub: CollectionHub): CollectionDef[] {
  return COLLECTIONS.filter((c) => c.hub === hub)
}

/**
 * Brief section 5: no empty listings ship. Four is the floor. Enforced here
 * rather than in each route so it cannot be forgotten, and read by the
 * sitemap so an under-populated listing is never submitted for indexing.
 */
export const MIN_PRODUCTS_PER_LISTING = 4

/**
 * Collection handles the site is pre-wired to that the merchant has not
 * created yet (see shopify-client-checklist.csv). They dark gracefully until
 * the collection exists, so `collections:validate` warns about them rather
 * than failing the build. Every other mapped handle must resolve.
 */
export const PENDING_MERCHANT_COLLECTIONS: ReadonlySet<string> = new Set([
  'sympathy',
  'get-well',
  'exclusive-to-us',
  // The six Occasions collections. They existed on the old store and were
  // removed in the September 2026 collection clear-out; the client's call,
  // 21 September, is that they are not being recreated for now. The site
  // stays pre-wired to them so restoring one is creating the collection and
  // nothing else — see data/shopify-import/collections-to-restore.csv.
  //
  // Until then each route darks: under the four-product floor a listing
  // redirects to /occasions, and the hub below no longer offers a card for
  // it, so nothing links into the dark.
  'mothers-day-gifts',
  'fathers-day',
  'valentines-day',
  'easter-1',
  'gifts-for-baby',
  'wedding-anniversary',
])

/**
 * Every native collection handle the site reads, de-duplicated: the full
 * listing registry plus the seasonal hampers collection the hub and homepage
 * read directly. Derived from ALL_LISTINGS (not the seasonally-filtered
 * COLLECTIONS) so collections:validate keeps checking every mapped handle
 * regardless of the seasonal flag.
 */

/**
 * Derived from the ACTIVE registry, not from ALL_LISTINGS.
 *
 * A suppressed listing reads a retired collection by definition: the
 * hamper themes point at last year's merchant collections and the site
 * does not render them. Checking those failed the build over collections
 * nobody is allowed to see, which is a build that cries wolf. Only
 * collections something on the site actually reads are checked.
 */
export const MAPPED_COLLECTION_HANDLES: readonly string[] = [
  ...new Set([
    HAMPERS_COLLECTION,
    ...COLLECTIONS.map((c) => c.query.collection).filter((h): h is string => typeof h === 'string'),
  ]),
]
