import 'server-only'

import { collectionTag, productTag, REVALIDATE, TAG_ALL_PRODUCTS } from '../shopify/cache-tags'
import { HIDDEN_FROM_LISTINGS } from './collections'
import { MAX_FIRST, MAX_LISTING } from './pagination'
import { storefront } from '../shopify/client'
import { hasStorefrontCredentials } from '../shopify/env'
import { normaliseProduct, normaliseProductCard } from '../shopify/normalise'
import {
  PRODUCT_BY_HANDLE,
  PRODUCT_CARD_BY_HANDLE,
  PRODUCTS_BY_COLLECTION,
  PRODUCTS_BY_QUERY,
  SEARCH_PRODUCTS,
  VARIANT_AVAILABILITY,
} from '../shopify/queries'
import { fixtureAllHandles, fixtureFacetOptions, fixtureProduct, fixtureQuery } from './fixtures'
import { money } from './money'
import { countryFromLabel, grapeFromLabel, priceBandForMinor, regionFromLabel } from './taxonomy'
import type { Money, Product, ProductCard, ProductQuery, ProductQueryResult } from './types'

/**
 * Facets whose values come from the wine.* metafields, so a listing exposing
 * one must fetch those metafields on its cards ($withFacets). Price is derived
 * from the card's own price; occasion/recipient from tags.
 */
const METAFIELD_FACETS = new Set(['grape', 'region', 'country', 'style'])

/**
 * The facet values a card exposes. The live twin of the fixture's facetValues
 * (fixtures.ts), kept in step so a filtered view reads the same either way.
 */
function cardFacetValues(card: ProductCard, facet: string): string[] {
  switch (facet) {
    case 'grape': {
      // Prefer the wine.grape metafield, but the live catalogue keeps grape in
      // the product tags ("Syrah Wine", "Grenache Wine") instead, so read those
      // too — matched against the known varieties so "Red Wines" and the like
      // drop out. Union and de-duplicate the two sources.
      const fromMeta = card.wineFacets?.grape ?? []
      const fromTags = card.tags
        .map((tag) => grapeFromLabel(tag))
        .filter((g): g is string => g !== null)
      return [...new Set([...fromMeta, ...fromTags])]
    }
    // Region and country: the wine.* metafield when the product has one,
    // otherwise the store's own tags ("French Wines", "Rioja"), read through
    // the same normalising lookups as grape. The metafields are not on the
    // live store yet, so without the tag fallback these two filters were
    // empty on every wine listing (client, September 2026).
    case 'region':
      return card.wineFacets?.region
        ? [card.wineFacets.region]
        : uniqueLabels(card.tags, regionFromLabel)
    case 'country':
      return card.wineFacets?.country
        ? [card.wineFacets.country]
        : uniqueLabels(card.tags, countryFromLabel)
    case 'style':
      return card.wineFacets?.style ?? []
    case 'price':
      return [priceBandForMinor(card.priceRange.min.amountMinor).tag.slice('price:'.length)]
    case 'occasion':
      return card.tags.filter((t) => t.startsWith('occasion:')).map((t) => t.slice('occasion:'.length))
    case 'recipient':
      return card.tags.filter((t) => t.startsWith('recipient:')).map((t) => t.slice('recipient:'.length))
    default:
      return []
  }
}

/** Values within one facet are ORed; different facets are ANDed. */
/** The distinct labels a lookup reads out of a tag list, in tag order. */
function uniqueLabels(tags: readonly string[], lookup: (tag: string) => string | null): string[] {
  return [...new Set(tags.map(lookup).filter((label): label is string => label !== null))]
}

function matchesFacets(card: ProductCard, facets: Record<string, string[]>): boolean {
  for (const [facet, wanted] of Object.entries(facets)) {
    if (!wanted.length) continue
    const values = cardFacetValues(card, facet).map((v) => v.toLowerCase())
    if (!wanted.some((w) => values.includes(w.toLowerCase()))) return false
  }
  return true
}

/**
 * The one interface every component uses to reach product data.
 *
 * It dispatches to Shopify when credentials exist and to the fixture
 * catalogue when they do not. Nothing above this layer knows which is in
 * play, so the pages are written once.
 */

export function isFixtureMode(): boolean {
  return !hasStorefrontCredentials()
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getProduct(handle: string): Promise<Product | null> {
  if (isFixtureMode()) return fixtureProduct(handle)

  const data = await storefront<{ product: Parameters<typeof normaliseProduct>[0] | null }>({
    query: PRODUCT_BY_HANDLE,
    variables: { handle },
    tags: [productTag(handle), TAG_ALL_PRODUCTS],
    revalidate: REVALIDATE.product,
  })
  return data.product ? normaliseProduct(data.product) : null
}

const SORT_KEYS: Record<NonNullable<ProductQuery['sort']>, { sortKey: string; reverse: boolean }> = {
  featured: { sortKey: 'BEST_SELLING', reverse: false },
  'price-asc': { sortKey: 'PRICE', reverse: false },
  'price-desc': { sortKey: 'PRICE', reverse: true },
  newest: { sortKey: 'CREATED_AT', reverse: true },
}

/**
 * Collection product sorting uses ProductCollectionSortKeys, a different enum
 * from product search. `featured` maps to MANUAL: the order the merchant
 * dragged the products into in Shopify admin. Not COLLECTION_DEFAULT, which
 * follows whatever sort the collection happens to be set to (best selling,
 * newest, …), so a collection left on a non-manual sort silently ignored the
 * arrangement. Every registry listing reads `featured`; the price sorts are
 * left for the hamper builder's shelves.
 */
const COLLECTION_SORT_KEYS: Record<
  NonNullable<ProductQuery['sort']>,
  { sortKey: string; reverse: boolean }
> = {
  featured: { sortKey: 'MANUAL', reverse: false },
  'price-asc': { sortKey: 'PRICE', reverse: false },
  'price-desc': { sortKey: 'PRICE', reverse: true },
  newest: { sortKey: 'CREATED', reverse: true },
}

/**
 * Price band and stock as Storefront collection filters, because
 * collection.products has no free-text query arg. Mirrors buildSearchQuery:
 * out-of-stock excluded by default, min defaults to 0, max left open.
 */
function buildCollectionFilters(query: ProductQuery): Record<string, unknown>[] {
  const filters: Record<string, unknown>[] = []
  if (!query.includeOutOfStock) filters.push({ available: true })
  if (query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined) {
    const price: { min: number; max?: number } = { min: (query.minPriceMinor ?? 0) / 100 }
    if (query.maxPriceMinor !== undefined) price.max = query.maxPriceMinor / 100
    filters.push({ price })
  }
  return filters
}

/**
 * Reads a listing from a native Shopify collection — the live store's real
 * taxonomy. Every taxonomy listing routes here via query.collection.
 */
type CollectionNode = Parameters<typeof normaliseProductCard>[0]

type CollectionPageVariables = {
  handle: string
  sortKey: string
  reverse: boolean
  filters: unknown
  withFacets: boolean
}

/**
 * A collection read page by page, until it is exhausted, `need` products
 * are in hand, or MAX_LISTING is reached.
 *
 * One Storefront call returns at most MAX_FIRST (250) products, and this
 * used to be one call. The wine range passed 250 in 2026 (331 in the
 * August export), so every wine past position 250 of the merchant's order
 * in Fine Wines was on no listing at all, "Show more" ended before the
 * end, and the facet counts tallied a partial collection. The client's
 * report was a wine missing from the website.
 *
 * Each page is its own cached Storefront read with the listing's tags, so
 * on a warm cache this costs nothing extra, and a collection that fits in
 * one page is still one call.
 *
 * Returns null for an unknown collection handle.
 */
async function collectionPages(
  variables: CollectionPageVariables,
  tags: string[],
  need: number,
  startAfter: string | null = null,
): Promise<{ nodes: CollectionNode[]; hasNextPage: boolean } | null> {
  const nodes: CollectionNode[] = []
  const cap = Math.min(need, MAX_LISTING)
  let after: string | null = startAfter
  let hasNextPage = false
  while (nodes.length < cap) {
    const data = await storefront<{
      collection: {
        products: {
          nodes: CollectionNode[]
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      } | null
    }>({
      query: PRODUCTS_BY_COLLECTION,
      variables: { ...variables, first: Math.min(MAX_FIRST, cap - nodes.length), after },
      tags,
      revalidate: REVALIDATE.listing,
    })
    const products = data.collection?.products
    if (!products) return null
    nodes.push(...products.nodes)
    hasNextPage = products.pageInfo.hasNextPage
    if (!hasNextPage || !products.pageInfo.endCursor || products.nodes.length === 0) break
    after = products.pageInfo.endCursor
  }
  return { nodes, hasNextPage }
}

async function productsByCollection(
  query: ProductQuery,
  tags: string[],
): Promise<ProductQueryResult> {
  const sort = COLLECTION_SORT_KEYS[query.sort ?? 'featured']
  // A price band ("gifts €50-100") is a Storefront collection filter: Shopify
  // keeps any product with a VARIANT in range, so a "From €25" product with a
  // €60 option correctly belongs in €50-100. We then re-price the card to the
  // in-band variant so it quotes €60, not the out-of-band €25.
  const hasPriceBand = query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined
  const lo = query.minPriceMinor
  const hi = query.maxPriceMinor
  // Collection listings (sort 'featured' -> MANUAL) must read in the
  // merchant's drag order. Passing ANY Storefront `filters` argument routes
  // the connection through Shopify's filter engine, which does not honour a
  // collection's manual order, so an all-in-stock collection comes back
  // reshuffled — the Easter listing regression, September 2026. For that case
  // we send no filters and drop out-of-stock products, and products outside a
  // price band, in code instead. Only an explicit price sort (the builder's
  // shelves) keeps the Storefront filters.
  const preserveManualOrder = (query.sort ?? 'featured') === 'featured'
  const dropOutOfStock = preserveManualOrder && !query.includeOutOfStock
  // Offset pagination (see pagination.ts) asks for `pageSize * step` products
  // from the start of the collection. When we drop out-of-stock in code, that
  // window comes up short — a sold-out product among the first 24 leaves 23, so
  // a mostly-off-season collection can render a near-empty grid even though it
  // has plenty of live stock. So for the manual-order case we fetch the whole
  // collection (page by page: see collectionPages) and slice the requested
  // window out of the in-stock result below.
  const requested = query.first ?? 24
  // Active facet selections from the URL (grape, region, price, …). They are
  // applied in code rather than as Storefront filters, so a filtered wine
  // listing keeps the merchant's manual order — the manual-order path already
  // has the whole collection in hand. Cards carry the wine.* facet values only
  // when a metafield facet is actually in play, so unfiltered listings and the
  // common card query stay lean.
  const activeFacets = Object.entries(query.facets ?? {}).filter(([, values]) => values.length > 0)
  const facetFiltering = preserveManualOrder && activeFacets.length > 0
  const withFacets = facetFiltering && activeFacets.some(([key]) => METAFIELD_FACETS.has(key))
  const products = await collectionPages(
    {
      handle: query.collection!,
      sortKey: sort.sortKey,
      reverse: sort.reverse,
      filters: preserveManualOrder ? null : buildCollectionFilters(query),
      withFacets,
    },
    tags,
    preserveManualOrder ? MAX_LISTING : requested,
    preserveManualOrder ? null : (query.after ?? null),
  )
  if (!products) {
    // Unknown collection handle: dark this one route rather than 500 the page.
    return { items: [], pageInfo: { hasNextPage: false, endCursor: null }, totalKnown: 0 }
  }

  // collection.products has no query arg, so the builder box products are
  // filtered out here rather than in the query.
  const hidden = new Set(HIDDEN_FROM_LISTINGS)
  const filtered = products.nodes
    .filter((node) => !hidden.has(node.handle))
    // Out-of-stock is filtered in code only when we dropped the Storefront
    // availability filter to preserve manual order (above). Otherwise Shopify
    // has already excluded them.
    .filter((node) => !dropOutOfStock || node.availableForSale !== false)
    .flatMap((node) => {
      const card = normaliseProductCard(node)
      if (!hasPriceBand) return [card]
      // Re-price to the cheapest AVAILABLE variant that is in the band, so a
      // multi-variant product reads its in-band price (and the quick-add adds
      // that same variant).
      const inBand = (node.variants?.nodes ?? [])
        .filter(
          (v): v is typeof v & { price: { amount: string; currencyCode: string } } =>
            (query.includeOutOfStock || v.availableForSale !== false) && Boolean(v.price),
        )
        .map((v) => ({ id: v.id, minor: money(v.price.amount, v.price.currencyCode).amountMinor }))
        .filter((v) => (lo === undefined || v.minor >= lo) && (hi === undefined || v.minor <= hi))
        .sort((a, b) => a.minor - b.minor)
      const [cheapest] = inBand
      if (cheapest) {
        const dearest = inBand[inBand.length - 1] ?? cheapest
        card.priceRange = {
          min: { amountMinor: cheapest.minor, currencyCode: card.priceRange.min.currencyCode },
          max: { amountMinor: dearest.minor, currencyCode: card.priceRange.max.currencyCode },
        }
        card.defaultVariantId = cheapest.id
        card.defaultVariantPriceMinor = cheapest.minor
        return [card]
      }
      // No variant in the band. On the manual-order path the band is applied
      // here, the same rule as Shopify's price filter (a product belongs when
      // any variant is in range), so the product is out. On the filtered path
      // Shopify already put it in the band; keep it on its own range.
      return preserveManualOrder ? [] : [card]
    })

  // Narrow to the selected facets in code (only ever set on the manual-order
  // path), preserving order. No-op when nothing is selected.
  const faceted = facetFiltering
    ? filtered.filter((card) => matchesFacets(card, query.facets ?? {}))
    : filtered

  if (preserveManualOrder) {
    // We over-fetched the whole collection, so `faceted` is every in-stock
    // product that matches the filters, in manual order. Hand back the
    // requested window and report the true total, so the grid fills and
    // "Show more" is accurate.
    return {
      items: faceted.slice(0, requested),
      pageInfo: { hasNextPage: faceted.length > requested, endCursor: null },
      totalKnown: faceted.length,
    }
  }

  return {
    items: faceted,
    pageInfo: { hasNextPage: products.hasNextPage, endCursor: null },
    totalKnown: faceted.length,
  }
}

/**
 * Builds a Shopify search query string.
 *
 * Storefront search syntax has no OR across different fields, so anything it
 * cannot express (facets on metafields, for instance) is filtered after the
 * fetch. That is why `first` is over-fetched when facets are in play.
 */
function buildSearchQuery(query: ProductQuery): string {
  const clauses: string[] = ['available_for_sale:true']
  if (query.includeOutOfStock) clauses.length = 0

  // Hidden products never appear in a listing. See HIDDEN_FROM_LISTINGS.
  for (const handle of HIDDEN_FROM_LISTINGS) clauses.push(`-handle:'${handle}'`)

  // The quarantined catalogue. Unless a query names the builder-item kind,
  // it is excluded at the Storefront layer too, so the live store behaves
  // exactly like the fixture: builder items exist only inside the builder.
  if (!query.kinds?.includes('builder-item')) clauses.push(`-tag:'type:builder-item'`)

  for (const tag of query.tags ?? []) clauses.push(`tag:'${tag}'`)
  for (const kind of query.kinds ?? []) clauses.push(`tag:'type:${kind}'`)

  if (query.productTypes?.length) {
    const types = query.productTypes.map((t) => `product_type:'${t}'`).join(' OR ')
    clauses.push(`(${types})`)
  }

  if (query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined) {
    const min = (query.minPriceMinor ?? 0) / 100
    const max = query.maxPriceMinor === undefined ? '*' : query.maxPriceMinor / 100
    clauses.push(`variants.price:>=${min}`)
    if (max !== '*') clauses.push(`variants.price:<=${max}`)
  }

  if (query.text) {
    // Storefront's default-field search covers the title. Quotes and
    // backslashes are stripped rather than escaped: nobody's product is
    // named with them, and stripping cannot break the query syntax.
    const term = query.text.replace(/["'\\]/g, ' ').trim()
    if (term) clauses.push(`(title:*${term}*)`)
  }

  // Multiple kinds must be ORed, not ANDed: a wine listing that also shows
  // spirits would otherwise return nothing.
  if ((query.kinds?.length ?? 0) > 1) {
    const kindClause = query.kinds!.map((k) => `tag:'type:${k}'`).join(' OR ')
    return [...clauses.filter((c) => !c.startsWith("tag:'type:")), `(${kindClause})`].join(' AND ')
  }

  return clauses.join(' AND ')
}

export async function queryProducts(query: ProductQuery): Promise<ProductQueryResult> {
  if (isFixtureMode()) return fixtureQuery(query)

  // `handles` PRESENT means a curated list, even when it is empty: an empty
  // curated list is no products, not every product. Testing `.length` here
  // let `handles: []` fall through to the general search, and the makers
  // page then showed four arbitrary products from the whole store under
  // "where you will find their work". Found by the client, September 2026.
  if (query.handles) return productsByHandles(query.handles)
  if (query.collection) return productsByCollection(query, [TAG_ALL_PRODUCTS])

  const sort = SORT_KEYS[query.sort ?? 'featured']
  const data = await storefront<{
    products: {
      nodes: Parameters<typeof normaliseProductCard>[0][]
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }>({
    query: PRODUCTS_BY_QUERY,
    variables: {
      query: buildSearchQuery(query),
      first: query.first ?? 24,
      after: query.after ?? null,
      sortKey: sort.sortKey,
      reverse: sort.reverse,
    },
    tags: [TAG_ALL_PRODUCTS],
    revalidate: REVALIDATE.listing,
  })

  const items = data.products.nodes.map(normaliseProductCard)
  return {
    items,
    pageInfo: data.products.pageInfo,
    totalKnown: items.length,
  }
}

async function productsByHandles(handles: string[]): Promise<ProductQueryResult> {
  if (!handles.length) {
    return { items: [], pageInfo: { hasNextPage: false, endCursor: null }, totalKnown: 0 }
  }
  // products(query:"handle:'x'") is UNINDEXED on this store and returns a
  // relevance fallback rather than the named products, so each handle is
  // fetched directly. Next dedupes and caches these within a render pass, and
  // the handle order is preserved, which is the whole point of a curated list.
  const cards = await Promise.all(
    handles.map((handle) =>
      storefront<{ product: Parameters<typeof normaliseProductCard>[0] | null }>({
        query: PRODUCT_CARD_BY_HANDLE,
        variables: { handle },
        tags: [productTag(handle), TAG_ALL_PRODUCTS],
        revalidate: REVALIDATE.listing,
      }).then((data) => (data.product ? normaliseProductCard(data.product) : null)),
    ),
  )

  const items = cards.filter((card): card is NonNullable<typeof card> => card !== null)
  return { items, pageInfo: { hasNextPage: false, endCursor: null }, totalKnown: items.length }
}

/**
 * Products for one listing route, tagged so a webhook can revalidate just
 * that listing.
 */
export async function queryListing(path: string, query: ProductQuery): Promise<ProductQueryResult> {
  if (isFixtureMode()) return fixtureQuery(query)
  // `handles` PRESENT means a curated list, even when it is empty: an empty
  // curated list is no products, not every product. Testing `.length` here
  // let `handles: []` fall through to the general search, and the makers
  // page then showed four arbitrary products from the whole store under
  // "where you will find their work". Found by the client, September 2026.
  if (query.handles) return productsByHandles(query.handles)
  if (query.collection) return productsByCollection(query, [TAG_ALL_PRODUCTS, collectionTag(path)])
  // The tag is attached by re-running the query with the collection tag
  // included; Storefront calls are deduped by Next within a render pass, so
  // this does not double-fetch.
  const sort = SORT_KEYS[query.sort ?? 'featured']
  const data = await storefront<{
    products: {
      nodes: Parameters<typeof normaliseProductCard>[0][]
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }>({
    query: PRODUCTS_BY_QUERY,
    variables: {
      query: buildSearchQuery(query),
      first: query.first ?? 24,
      after: query.after ?? null,
      sortKey: sort.sortKey,
      reverse: sort.reverse,
    },
    tags: [TAG_ALL_PRODUCTS, collectionTag(path)],
    revalidate: REVALIDATE.listing,
  })

  const items = data.products.nodes.map(normaliseProductCard)
  return { items, pageInfo: data.products.pageInfo, totalKnown: items.length }
}

/**
 * Whether any of a collection product's variants is priced inside the
 * query's band. Mirrors the band rule in productsByCollection, so a price-band
 * listing's facet counts match its grid.
 */
function inPriceBand(node: CollectionNode, query: ProductQuery): boolean {
  const lo = query.minPriceMinor
  const hi = query.maxPriceMinor
  if (lo === undefined && hi === undefined) return true
  return (node.variants?.nodes ?? []).some((v) => {
    if (!v.price) return false
    if (!query.includeOutOfStock && v.availableForSale === false) return false
    const minor = money(v.price.amount, v.price.currencyCode).amountMinor
    return (lo === undefined || minor >= lo) && (hi === undefined || minor <= hi)
  })
}

export async function facetOptions(
  query: ProductQuery,
  facet: string,
): Promise<{ value: string; count: number }[]> {
  if (isFixtureMode()) return fixtureFacetOptions(query, facet)
  // Facets are a collection-listing feature: the values are read from the
  // products in the collection, so a non-collection query has nothing to offer.
  if (!query.collection) return []

  const sort = COLLECTION_SORT_KEYS[query.sort ?? 'featured']
  // The whole collection, so the counts match the whole grid. No Storefront
  // filters: we tally in code so options match the grid, and filters would
  // reshuffle the collection. Always fetch the metafields — building the
  // filter controls is exactly what they are for.
  const products = await collectionPages(
    {
      handle: query.collection,
      sortKey: sort.sortKey,
      reverse: sort.reverse,
      filters: null,
      withFacets: true,
    },
    [TAG_ALL_PRODUCTS, collectionTag(query.collection)],
    MAX_LISTING,
  )
  const nodes = products?.nodes
  if (!nodes) return []

  const hidden = new Set(HIDDEN_FROM_LISTINGS)
  // Count against the listing's own selection with THIS facet removed, so a
  // shopper always sees what else is available within the facet they are using.
  const others: Record<string, string[]> = Object.fromEntries(
    Object.entries(query.facets ?? {}).filter(([key]) => key !== facet),
  )
  const includeOutOfStock = query.includeOutOfStock ?? false

  const counts = new Map<string, number>()
  for (const node of nodes) {
    if (hidden.has(node.handle)) continue
    if (!includeOutOfStock && node.availableForSale === false) continue
    if (!inPriceBand(node, query)) continue
    const card = normaliseProductCard(node)
    if (!matchesFacets(card, others)) continue
    for (const value of cardFacetValues(card, facet)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value))
}

/**
 * Site search, for the box in the header and /search.
 *
 * The old site had a search box and this one did not, and the client's
 * first use for it was a wine they could not find on any listing. The
 * results are the same product cards as a listing, so a product that is
 * on no listing is still findable here: search reads the whole store,
 * not a collection.
 *
 * Builder box products and builder items are mechanisms with no page of
 * their own and are dropped, the same as on every listing.
 *
 * Shopify's search matches descriptions, tags and vendors too, so
 * "sancerre" brought back picture frames whose copy happened to mention it.
 * Results are narrowed to products whose title holds every word searched,
 * the same rule the fixture search uses. Only when no title matches at all
 * (a descriptive search like "red wine") do Shopify's wider results stand,
 * so a search never comes back empty when something relevant exists.
 */
export async function searchProducts(
  term: string,
  first = 48,
): Promise<{ items: ProductCard[]; total: number }> {
  const trimmed = term.trim()
  if (!trimmed) return { items: [], total: 0 }

  if (isFixtureMode()) {
    const result = fixtureQuery({ text: trimmed, first, sort: 'featured' })
    const items = result.items.filter((item) => item.kind !== 'builder-item')
    return { items, total: items.length }
  }

  const data = await storefront<{
    search: { totalCount: number; nodes: Parameters<typeof normaliseProductCard>[0][] }
  }>({
    query: SEARCH_PRODUCTS,
    // Ask for the full page: the title filter below throws most of it away.
    variables: { term: trimmed, first: MAX_FIRST },
    tags: [TAG_ALL_PRODUCTS],
    revalidate: REVALIDATE.listing,
  })

  const hidden = new Set(HIDDEN_FROM_LISTINGS)
  const items = data.search.nodes
    // A non-product node has no handle; `types: [PRODUCT]` should keep them
    // out, but the union type does not promise it.
    .filter((node) => typeof node?.handle === 'string' && !hidden.has(node.handle))
    .map(normaliseProductCard)
    .filter((card) => card.kind !== 'builder-item')

  const words = searchWords(trimmed)
  const titleMatches = items.filter((card) => {
    const title = foldForSearch(card.title)
    return words.every((word) => title.includes(word))
  })
  if (titleMatches.length > 0) {
    return { items: titleMatches.slice(0, first), total: titleMatches.length }
  }
  return {
    items: items.slice(0, first),
    total: Math.max(items.length, data.search.totalCount - (data.search.nodes.length - items.length)),
  }
}

/** Lower case with accents stripped, so "gerard" finds Gérard. */
function foldForSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function searchWords(term: string): string[] {
  return foldForSearch(term).split(/\s+/).filter(Boolean)
}

export async function allProductHandles(): Promise<string[]> {
  if (isFixtureMode()) return fixtureAllHandles()
  const handles: string[] = []
  let after: string | null = null
  // The sitemap needs every handle. 250 is the Storefront page cap.
  for (let page = 0; page < 40; page += 1) {
    const data: {
      products: {
        nodes: { handle: string }[]
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }
    } = await storefront({
      query: /* GraphQL */ `
        query AllHandles($first: Int!, $after: String) {
          products(
            first: $first
            after: $after
            # The builder box products are mechanisms with no URL, so the
            # sitemap must not see them. On the live store they are the
            # GIST_BUILDER_PRODUCT type, not the absent type:builder-item tag.
            query: "available_for_sale:true AND -product_type:GIST_BUILDER_PRODUCT AND -tag:'type:builder-item'"
          ) {
            nodes {
              handle
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      variables: { first: 250, after },
      tags: [TAG_ALL_PRODUCTS],
      revalidate: REVALIDATE.listing,
    })
    handles.push(...data.products.nodes.map((n) => n.handle))
    if (!data.products.pageInfo.hasNextPage) break
    after = data.products.pageInfo.endCursor
  }
  return handles
}

// ---------------------------------------------------------------------------
// Live checks
// ---------------------------------------------------------------------------

export type VariantAvailability = {
  variantId: string
  available: boolean
  quantityAvailable: number | null
  price: Money
  productTitle: string
  productHandle: string
}

/**
 * Uncached availability and price for specific variants.
 *
 * Called at add-to-cart and again at checkout handoff. A cached listing page
 * must never be the thing that sells something that is gone, and hampers
 * make that a real risk because their components sell out underneath them.
 */
export async function checkVariantAvailability(
  variantIds: string[],
): Promise<Map<string, VariantAvailability>> {
  const result = new Map<string, VariantAvailability>()

  if (isFixtureMode()) {
    for (const id of variantIds) {
      // Fixture variant ids encode the handle, so we can resolve them back.
      const handle = id.replace('gid://fixture/ProductVariant/', '').replace(/-\d+$/, '')
      const product = fixtureProduct(handle)
      const variant = product?.variants.find((v) => v.id === id)
      if (!product || !variant) continue
      result.set(id, {
        variantId: id,
        available: variant.availableForSale,
        quantityAvailable: variant.quantityAvailable,
        price: variant.price,
        productTitle: product.title,
        productHandle: product.handle,
      })
    }
    return result
  }

  const data = await storefront<{
    nodes: ({
      id: string
      availableForSale: boolean
      quantityAvailable: number | null
      price: { amount: string; currencyCode: string }
      product: { handle: string; title: string }
    } | null)[]
  }>({
    query: VARIANT_AVAILABILITY,
    variables: { ids: variantIds },
    revalidate: false,
  })

  for (const node of data.nodes) {
    if (!node) continue
    result.set(node.id, {
      variantId: node.id,
      available: node.availableForSale,
      quantityAvailable: node.quantityAvailable,
      price: money(node.price.amount, node.price.currencyCode),
      productTitle: node.product.title,
      productHandle: node.product.handle,
    })
  }
  return result
}

export type StockProblem = {
  variantId: string
  reason: 'sold-out' | 'not-enough' | 'price-changed' | 'missing'
  productTitle: string | null
  expectedMinor?: number
  actualMinor?: number
  quantityAvailable?: number | null
}

/**
 * Verifies a set of intended cart lines against live Shopify state.
 *
 * Returns every problem rather than the first, so the shopper is told once
 * what is wrong with their basket instead of being sent round the loop.
 */
export async function verifyLines(
  lines: { variantId: string; quantity: number; expectedPriceMinor?: number }[],
): Promise<StockProblem[]> {
  if (!lines.length) return []
  const live = await checkVariantAvailability(lines.map((l) => l.variantId))
  const problems: StockProblem[] = []

  for (const line of lines) {
    const state = live.get(line.variantId)
    if (!state) {
      problems.push({ variantId: line.variantId, reason: 'missing', productTitle: null })
      continue
    }
    if (!state.available) {
      problems.push({ variantId: line.variantId, reason: 'sold-out', productTitle: state.productTitle })
      continue
    }
    if (state.quantityAvailable !== null && state.quantityAvailable < line.quantity) {
      problems.push({
        variantId: line.variantId,
        reason: 'not-enough',
        productTitle: state.productTitle,
        quantityAvailable: state.quantityAvailable,
      })
      continue
    }
    if (
      line.expectedPriceMinor !== undefined &&
      line.expectedPriceMinor !== state.price.amountMinor
    ) {
      problems.push({
        variantId: line.variantId,
        reason: 'price-changed',
        productTitle: state.productTitle,
        expectedMinor: line.expectedPriceMinor,
        actualMinor: state.price.amountMinor,
      })
    }
  }

  return problems
}

export * from './types'
