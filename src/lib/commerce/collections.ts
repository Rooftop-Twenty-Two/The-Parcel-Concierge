import type { ProductQuery } from './types'

/**
 * The hamper builder's parent product.
 *
 * It lives here rather than in hamper-builder.ts because the ingest tool
 * and the redirect validator both read this module directly, and it must
 * stay free of runtime imports so they can.
 */
export const BUILDER_PARENT_HANDLE = 'build-your-own-hamper'

/**
 * Products that exist in Shopify but must never appear in a listing, in a
 * grid, in the sitemap, or at a product URL of their own.
 *
 * The hamper builder's parent product is one: it is a real Shopify product
 * so the box can be priced and sold, but it is a mechanism rather than a
 * hamper you buy off a grid. Left in, it shows up in every hamper listing
 * priced "From €8", and /hampers/build-your-own-hamper becomes a second,
 * worse URL for the builder.
 *
 * Enforced in the query layer rather than per listing, so a new listing
 * cannot forget it.
 */
export const HIDDEN_FROM_LISTINGS: ReadonlySet<string> = new Set([BUILDER_PARENT_HANDLE])

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
 * Grape variety, region and style are facets on /wine, not routes. The old
 * site's ~50 grape sub-collections do not appear here by design.
 */

export type FacetKey = 'grape' | 'region' | 'country' | 'style' | 'price' | 'occasion' | 'recipient'

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
   * What fills the grid. `handles` here means CMS-curated: the CMS owns the
   * ordering and the picks, and still references products by handle only.
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
}

const HAMPER_BASE: ProductQuery = { kinds: ['hamper'], sort: 'featured', first: 24 }
const WINE_BASE: ProductQuery = { kinds: ['wine', 'spirit'], sort: 'featured', first: 24 }

export const COLLECTIONS: readonly CollectionDef[] = [
  // ---------------------------------------------------------------------
  // Hampers. Budget bands first: they are the highest-intent entry point
  // and they are real, server-rendered, indexable routes, never filter
  // state.
  // ---------------------------------------------------------------------
  {
    slug: 'under-75',
    hub: 'hampers',
    path: '/hampers/under-75',
    title: 'Hampers under €75',
    h1: 'Hampers under €75',
    query: { ...HAMPER_BASE, maxPriceMinor: 7499, sort: 'price-desc' },
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
    query: { ...HAMPER_BASE, minPriceMinor: 7500, maxPriceMinor: 12499 },
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
    query: { ...HAMPER_BASE, minPriceMinor: 12500, maxPriceMinor: 19999 },
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
    query: { ...HAMPER_BASE, minPriceMinor: 20000, sort: 'price-asc' },
    alcohol: true,
    facets: ['occasion', 'recipient'],
    parentPath: '/hampers',
  },

  // Hamper themes.
  {
    slug: 'wine',
    hub: 'hampers',
    path: '/hampers/wine',
    title: 'Wine hampers',
    h1: 'Wine hampers',
    query: { ...HAMPER_BASE, productTypes: ['Wine hamper'] },
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
    query: { ...HAMPER_BASE, productTypes: ['Food hamper'] },
    alcohol: false,
    facets: ['price', 'occasion'],
    parentPath: '/hampers',
  },
  {
    slug: 'whiskey',
    hub: 'hampers',
    path: '/hampers/whiskey',
    title: 'Whiskey hampers',
    h1: 'Whiskey hampers',
    query: { ...HAMPER_BASE, productTypes: ['Whiskey hamper'] },
    alcohol: true,
    facets: ['price', 'occasion'],
    parentPath: '/hampers',
  },
  {
    slug: 'pamper',
    hub: 'hampers',
    path: '/hampers/pamper',
    title: 'Pamper hampers',
    h1: 'Pamper hampers',
    query: { ...HAMPER_BASE, productTypes: ['Pamper hamper'] },
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
    query: { ...HAMPER_BASE, tags: ['occasion:new-baby'] },
    alcohol: false,
    facets: ['price'],
    parentPath: '/hampers',
  },
  {
    slug: 'sympathy',
    hub: 'hampers',
    path: '/hampers/sympathy',
    title: 'Sympathy hampers',
    h1: 'Sympathy hampers',
    query: { ...HAMPER_BASE, tags: ['occasion:sympathy'] },
    alcohol: false,
    facets: ['price'],
    parentPath: '/hampers',
  },
  {
    slug: 'anniversary',
    hub: 'hampers',
    path: '/hampers/anniversary',
    title: 'Anniversary hampers',
    h1: 'Anniversary hampers',
    query: { ...HAMPER_BASE, tags: ['occasion:anniversary'] },
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
    query: { ...HAMPER_BASE, tags: ['occasion:thank-you'] },
    alcohol: true,
    facets: ['price', 'recipient'],
    parentPath: '/hampers',
  },
  {
    slug: 'corporate',
    hub: 'hampers',
    path: '/hampers/corporate',
    title: 'Corporate hampers',
    h1: 'Corporate hampers',
    query: { ...HAMPER_BASE, tags: ['occasion:corporate'] },
    alcohol: true,
    facets: ['price'],
    parentPath: '/hampers',
  },

  // ---------------------------------------------------------------------
  // Wine and spirits. The Wine Vault.
  // ---------------------------------------------------------------------
  {
    slug: 'exclusive-to-us',
    hub: 'wine',
    path: '/wine/exclusive-to-us',
    title: 'Exclusive to us',
    h1: 'Wines you will not find anywhere else in Ireland',
    query: { ...WINE_BASE, tags: ['badge:exclusive'] },
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
    query: { ...WINE_BASE, first: 24 },
    curated: true,
    alcohol: true,
    facets: ['price'],
    parentPath: '/wine',
  },
  {
    slug: 'champagne-sparkling',
    hub: 'wine',
    path: '/wine/champagne-sparkling',
    title: 'Champagne and sparkling',
    h1: 'Champagne and sparkling wine',
    query: { ...WINE_BASE, productTypes: ['Champagne', 'Sparkling wine'] },
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
    query: { ...WINE_BASE, productTypes: ['Red wine'] },
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
    query: { ...WINE_BASE, productTypes: ['White wine'] },
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
    query: { ...WINE_BASE, productTypes: ['Rosé wine'] },
    alcohol: true,
    facets: ['grape', 'country', 'price'],
    parentPath: '/wine',
  },
  {
    slug: 'port-dessert',
    hub: 'wine',
    path: '/wine/port-dessert',
    title: 'Port and dessert wine',
    h1: 'Port and dessert wine',
    query: { ...WINE_BASE, productTypes: ['Port', 'Dessert wine'] },
    alcohol: true,
    facets: ['country', 'price'],
    parentPath: '/wine',
  },
  {
    slug: 'irish-whiskey',
    hub: 'wine',
    path: '/wine/irish-whiskey',
    title: 'Irish whiskey',
    h1: 'Irish whiskey',
    query: { kinds: ['spirit'], productTypes: ['Irish whiskey'], sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price'],
    parentPath: '/wine',
  },
  {
    slug: 'gin-and-spirits',
    hub: 'wine',
    path: '/wine/gin-and-spirits',
    title: 'Gin and spirits',
    h1: 'Gin and spirits',
    query: { kinds: ['spirit'], productTypes: ['Gin', 'Vodka', 'Rum', 'Liqueur'], sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price'],
    parentPath: '/wine',
  },
  {
    slug: 'gift-sets',
    hub: 'wine',
    path: '/wine/gift-sets',
    title: 'Wine gift sets',
    h1: 'Wine gift sets',
    query: { ...WINE_BASE, productTypes: ['Wine gift set'] },
    alcohol: true,
    facets: ['price'],
    parentPath: '/wine',
  },
  {
    slug: 'under-25',
    hub: 'wine',
    path: '/wine/under-25',
    title: 'Wine under €25',
    h1: 'Wine under €25',
    query: { ...WINE_BASE, maxPriceMinor: 2499, sort: 'price-desc' },
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
    query: { ...WINE_BASE, minPriceMinor: 2500, maxPriceMinor: 4999 },
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
    query: { ...WINE_BASE, minPriceMinor: 5000, sort: 'price-asc' },
    alcohol: true,
    facets: ['grape', 'country'],
    parentPath: '/wine',
  },

  // ---------------------------------------------------------------------
  // Occasions.
  //
  // Christmas, new baby, sympathy and wedding map onto locked taxonomy
  // tags. Mother's Day, Father's Day, Valentine's, Easter and get well have
  // no tag in the locked taxonomy (brief section 6 does not list them), so
  // they are CMS-curated rather than tag-driven. That gap is on the phase 1
  // sign-off list: see docs/ia-and-routes.md.
  // ---------------------------------------------------------------------
  {
    slug: 'christmas',
    hub: 'occasions',
    path: '/occasions/christmas',
    title: 'Christmas gifts and hampers',
    h1: 'Christmas gifts and hampers',
    query: { tags: ['occasion:christmas'], sort: 'featured', first: 24 },
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
    query: { sort: 'featured', first: 24 },
    curated: true,
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
    query: { sort: 'featured', first: 24 },
    curated: true,
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
    query: { sort: 'featured', first: 24 },
    curated: true,
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
    query: { sort: 'featured', first: 24 },
    curated: true,
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
    query: { tags: ['occasion:new-baby'], sort: 'featured', first: 24 },
    alcohol: false,
    facets: ['price'],
    parentPath: '/occasions',
  },
  {
    slug: 'sympathy',
    hub: 'occasions',
    path: '/occasions/sympathy',
    title: 'Sympathy gifts',
    h1: 'Sympathy gifts',
    query: { tags: ['occasion:sympathy'], sort: 'featured', first: 24 },
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
    query: { tags: ['occasion:wedding'], sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price'],
    parentPath: '/occasions',
  },
  {
    slug: 'get-well',
    hub: 'occasions',
    path: '/occasions/get-well',
    title: 'Get well gifts',
    h1: 'Get well gifts',
    query: { sort: 'featured', first: 24 },
    curated: true,
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
    query: { tags: ['recipient:her'], sort: 'featured', first: 24 },
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
    query: { tags: ['recipient:him'], sort: 'featured', first: 24 },
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
    query: { tags: ['recipient:couple'], sort: 'featured', first: 24 },
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
    query: { tags: ['recipient:client'], sort: 'featured', first: 24 },
    alcohol: true,
    facets: ['price'],
    parentPath: '/gifts-for',
  },

  // ---------------------------------------------------------------------
  // Budget. Bands here match PRICE_BANDS in taxonomy.ts and the GA4 budget
  // dimension, so shopper, tag and report never disagree.
  // ---------------------------------------------------------------------
  {
    slug: 'under-50',
    hub: 'gifts-by-budget',
    path: '/gifts-by-budget/under-50',
    title: 'Gifts under €50',
    h1: 'Gifts under €50',
    query: { maxPriceMinor: 4999, sort: 'price-desc', first: 24 },
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
    query: { minPriceMinor: 5000, maxPriceMinor: 9999, sort: 'featured', first: 24 },
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
    query: { minPriceMinor: 10000, maxPriceMinor: 14999, sort: 'featured', first: 24 },
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
    query: { minPriceMinor: 15000, sort: 'price-asc', first: 24 },
    alcohol: true,
    facets: ['occasion', 'recipient'],
    parentPath: '/gifts-by-budget',
  },

  // ---------------------------------------------------------------------
  // The add-on band. Deliberately small. These exist to be added to a
  // hamper at the cart, not to be discovered on their own.
  // ---------------------------------------------------------------------
  {
    slug: 'candles-diffusers',
    hub: 'gifts',
    path: '/gifts/candles-diffusers',
    title: 'Candles and diffusers',
    h1: 'Candles and diffusers',
    query: { kinds: ['addon'], productTypes: ['Candle', 'Diffuser'], sort: 'featured', first: 24 },
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
    query: { kinds: ['addon'], productTypes: ['Chocolate', 'Confectionery'], sort: 'featured', first: 24 },
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
    query: { kinds: ['addon'], productTypes: ['Crystal', 'Glassware'], sort: 'featured', first: 24 },
    alcohol: false,
    facets: [],
    parentPath: '/gifts',
  },
]

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
