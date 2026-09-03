import 'server-only'

import { collectionTag, productTag, REVALIDATE, TAG_ALL_PRODUCTS } from '../shopify/cache-tags'
import { HIDDEN_FROM_LISTINGS } from './collections'
import { storefront } from '../shopify/client'
import { hasStorefrontCredentials } from '../shopify/env'
import { normaliseProduct, normaliseProductCard } from '../shopify/normalise'
import {
  PRODUCT_BY_HANDLE,
  PRODUCT_CARD_BY_HANDLE,
  PRODUCTS_BY_COLLECTION,
  PRODUCTS_BY_QUERY,
  VARIANT_AVAILABILITY,
} from '../shopify/queries'
import { fixtureAllHandles, fixtureFacetOptions, fixtureProduct, fixtureQuery } from './fixtures'
import { money } from './money'
import type { Money, Product, ProductQuery, ProductQueryResult } from './types'

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
 * from product search. `featured` maps to the collection's own manual order
 * (COLLECTION_DEFAULT) so a curated collection reads as the merchant arranged
 * it, not by best-seller.
 */
const COLLECTION_SORT_KEYS: Record<
  NonNullable<ProductQuery['sort']>,
  { sortKey: string; reverse: boolean }
> = {
  featured: { sortKey: 'COLLECTION_DEFAULT', reverse: false },
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
  const data = await storefront<{
    collection: {
      products: {
        nodes: Parameters<typeof normaliseProductCard>[0][]
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      }
    } | null
  }>({
    query: PRODUCTS_BY_COLLECTION,
    variables: {
      handle: query.collection,
      first: query.first ?? 24,
      after: query.after ?? null,
      sortKey: sort.sortKey,
      reverse: sort.reverse,
      filters: buildCollectionFilters(query),
    },
    tags,
    revalidate: REVALIDATE.listing,
  })

  const products = data.collection?.products
  if (!products) {
    // Unknown collection handle: dark this one route rather than 500 the page.
    return { items: [], pageInfo: { hasNextPage: false, endCursor: null }, totalKnown: 0 }
  }

  // collection.products has no query arg, so the builder box products are
  // filtered out here rather than in the query.
  const hidden = new Set(HIDDEN_FROM_LISTINGS)
  const items = products.nodes
    .filter((node) => !hidden.has(node.handle))
    .map((node) => {
      const card = normaliseProductCard(node)
      if (!hasPriceBand) return card
      // Re-price to the cheapest AVAILABLE variant that is in the band, so a
      // multi-variant product reads its in-band price (and the quick-add adds
      // that same variant). Falls back to the product's own range when none of
      // the fetched variants land in the band.
      const inBand = (node.variants?.nodes ?? [])
        .filter(
          (v): v is typeof v & { price: { amount: string; currencyCode: string } } =>
            v.availableForSale !== false && Boolean(v.price),
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
      }
      return card
    })

  return { items, pageInfo: products.pageInfo, totalKnown: items.length }
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

  if (query.handles?.length) return productsByHandles(query.handles)
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
  if (query.handles?.length) return productsByHandles(query.handles)
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

export async function facetOptions(
  query: ProductQuery,
  facet: string,
): Promise<{ value: string; count: number }[]> {
  if (isFixtureMode()) return fixtureFacetOptions(query, facet)
  // Against a live store the facet values come from Storefront product
  // filters. Until the store exists there is nothing to read them from, so
  // this returns empty rather than guessing a vocabulary.
  return []
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
