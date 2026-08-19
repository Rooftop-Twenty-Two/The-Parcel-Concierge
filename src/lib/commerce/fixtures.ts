import fixtureJson from '../../../data/catalogue/fixtures.json'
import wineJson from '../../../data/catalogue/wines.json'
import type { Catalogue, CatalogueProduct } from '../catalogue/schema'
import { HIDDEN_FROM_LISTINGS } from './collections'
import { money } from './money'
import type {
  Product,
  ProductCard,
  ProductImage,
  ProductKind,
  ProductQuery,
  ProductQueryResult,
  ProductVariant,
} from './types'

/**
 * The fixture catalogue.
 *
 * Used only when Storefront credentials are absent. It reads the same
 * interchange file the ingest tool publishes from, so a page that renders
 * here renders against the real store too.
 *
 * Fixture mode is surfaced to the visitor (a banner) and to crawlers
 * (noindex), because a site serving invented products must never look like
 * a shop that is open. See isFixtureMode in ./index.ts.
 */

/**
 * The catalogue is assembled from every interchange file.
 *
 * wines.json is the real thing, imported from the client's Shopify export.
 * fixtures.json is the sample hampers and add-ons we wrote, which the real
 * export does not usefully cover yet. Both are the same shape, so nothing
 * downstream can tell them apart, and a handle collision resolves in favour
 * of the real data.
 */
const sources = [wineJson as Catalogue, fixtureJson as Catalogue]

const merged = new Map<string, CatalogueProduct>()
for (const source of sources) {
  for (const product of source.products) {
    if (!merged.has(product.handle)) merged.set(product.handle, product)
  }
}

const catalogue: Catalogue = {
  source: sources.map((s) => s.source).join(' + '),
  currencyCode: sources[0]?.currencyCode ?? 'EUR',
  products: [...merged.values()],
}

function kindOf(product: CatalogueProduct): ProductKind {
  if (product.tags.includes('type:hamper')) return 'hamper'
  if (product.tags.includes('type:wine')) return 'wine'
  if (product.tags.includes('type:spirit')) return 'spirit'
  return 'addon'
}

function imagesOf(product: CatalogueProduct): ProductImage[] {
  return product.images.map((i) => ({ url: i.src, alt: i.alt, width: i.width, height: i.height }))
}

function variantsOf(product: CatalogueProduct): ProductVariant[] {
  return product.variants.map((v, index) => ({
    id: `gid://fixture/ProductVariant/${product.handle}-${index}`,
    sku: v.sku,
    title: v.title,
    price: money(v.price, catalogue.currencyCode),
    compareAtPrice: v.compareAtPrice ? money(v.compareAtPrice, catalogue.currencyCode) : null,
    availableForSale: v.inventoryQuantity === null || v.inventoryQuantity > 0,
    quantityAvailable: v.inventoryQuantity,
    selectedOptions: v.options ?? [],
  }))
}

function toProduct(product: CatalogueProduct): Product {
  const variants = variantsOf(product)
  const prices = variants.map((v) => v.price.amountMinor)
  const minMinor = Math.min(...prices)
  const maxMinor = Math.max(...prices)

  return {
    id: `gid://fixture/Product/${product.handle}`,
    handle: product.handle,
    title: product.title,
    descriptionHtml: product.descriptionHtml,
    kind: kindOf(product),
    images: imagesOf(product),
    variants,
    priceRange: {
      min: { amountMinor: minMinor, currencyCode: catalogue.currencyCode },
      max: { amountMinor: maxMinor, currencyCode: catalogue.currencyCode },
    },
    availableForSale: variants.some((v) => v.availableForSale),
    tags: product.tags,
    hamper: product.hamper
      ? {
          contents: product.hamper.contents.map((c) => ({
            name: c.name,
            producer: c.producer ?? null,
            size: c.size ?? null,
          })),
          producers: product.hamper.producers ?? [],
          allergens: product.hamper.allergens,
          containsAlcohol: product.hamper.containsAlcohol,
          packaging: product.hamper.packaging ?? null,
          personalisation: (product.hamper.personalisation ?? []).map((p) =>
            p.kind === 'gift-message'
              ? { kind: 'gift-message' as const, label: p.label, maxLength: p.maxLength ?? 250, required: false as const }
              : p.kind === 'ribbon-colour'
                ? { kind: 'ribbon-colour' as const, label: p.label, choices: p.choices, required: false as const }
                : { kind: 'branded-card' as const, label: p.label, required: false as const },
          ),
          dimensionsWeight: product.hamper.dimensionsWeight ?? null,
          leadTime: product.hamper.leadTime ?? null,
          occasionTags: product.hamper.occasionTags ?? [],
          recipientTags: product.hamper.recipientTags ?? [],
        }
      : null,
    wine: product.wine
      ? {
          producer: product.wine.producer ?? null,
          region: product.wine.region ?? null,
          country: product.wine.country ?? null,
          grape: product.wine.grape ?? [],
          vintage: product.wine.vintage ?? null,
          abv: product.wine.abv ?? null,
          volume: product.wine.volume ?? null,
          style: { body: product.wine.styleBody ?? null, sweetness: product.wine.styleSweetness ?? null },
          tastingNote: product.wine.tastingNote ?? null,
          foodPairing: product.wine.foodPairing ?? null,
          awards: product.wine.awards ?? [],
          isExclusiveImport: product.wine.isExclusiveImport ?? false,
          rrpComparison: product.wine.rrpComparison ?? null,
          isAlcoholFree: product.wine.isAlcoholFree ?? false,
          organic: product.wine.organic ?? false,
          biodynamic: product.wine.biodynamic ?? false,
          fineWine: product.wine.fineWine ?? false,
          giftSet: product.wine.giftSet ?? false,
        }
      : null,
    updatedAt: '2026-08-19T00:00:00Z',
  }
}

function toCard(product: Product): ProductCard {
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    kind: product.kind,
    priceRange: product.priceRange,
    availableForSale: product.availableForSale,
    tags: product.tags,
    image: product.images[0] ?? null,
    badges: product.tags.filter((t) => t.startsWith('badge:')),
    defaultVariantId: product.variants[0]?.id ?? null,
  }
}

const PRODUCTS: Product[] = catalogue.products.map(toProduct)
const BY_HANDLE = new Map(PRODUCTS.map((p) => [p.handle, p]))
const PRODUCT_TYPE_BY_HANDLE = new Map(catalogue.products.map((p) => [p.handle, p.productType]))

export function fixtureProduct(handle: string): Product | null {
  return BY_HANDLE.get(handle) ?? null
}

export function fixtureAllHandles(): string[] {
  return PRODUCTS.map((p) => p.handle)
}

/**
 * The facet values a product exposes. Kept in one place so the in-memory
 * filter and the Storefront filter agree on what "grape=malbec" means.
 */
export function facetValues(product: Product, facet: string): string[] {
  switch (facet) {
    case 'grape':
      return product.wine?.grape ?? []
    case 'region':
      return product.wine?.region ? [product.wine.region] : []
    case 'country':
      return product.wine?.country ? [product.wine.country] : []
    case 'style':
      return [product.wine?.style.body, product.wine?.style.sweetness].filter(
        (v): v is string => typeof v === 'string',
      )
    case 'occasion':
      return product.tags.filter((t) => t.startsWith('occasion:')).map((t) => t.slice('occasion:'.length))
    case 'recipient':
      return product.tags.filter((t) => t.startsWith('recipient:')).map((t) => t.slice('recipient:'.length))
    case 'price':
      return product.tags.filter((t) => t.startsWith('price:')).map((t) => t.slice('price:'.length))
    default:
      return []
  }
}

function matches(product: Product, query: ProductQuery): boolean {
  // Hidden products are reachable only by an explicit handle lookup, which
  // is how the builder route fetches its own parent.
  if (HIDDEN_FROM_LISTINGS.has(product.handle) && !query.handles?.includes(product.handle)) {
    return false
  }
  if (query.handles && !query.handles.includes(product.handle)) return false
  if (query.kinds && !query.kinds.includes(product.kind)) return false
  if (query.tags && !query.tags.every((t) => product.tags.includes(t))) return false
  if (query.productTypes) {
    const type = PRODUCT_TYPE_BY_HANDLE.get(product.handle) ?? ''
    if (!query.productTypes.includes(type)) return false
  }
  if (query.minPriceMinor !== undefined && product.priceRange.min.amountMinor < query.minPriceMinor) {
    return false
  }
  if (query.maxPriceMinor !== undefined && product.priceRange.min.amountMinor > query.maxPriceMinor) {
    return false
  }
  if (query.wineFlags?.length) {
    if (!product.wine) return false
    if (!query.wineFlags.every((f) => product.wine![f])) return false
  }
  if (query.anyWineFlag?.length) {
    if (!product.wine) return false
    if (!query.anyWineFlag.some((f) => product.wine![f])) return false
  }
  if (!query.includeOutOfStock && !product.availableForSale) return false

  if (query.facets) {
    for (const [facet, wanted] of Object.entries(query.facets)) {
      if (!wanted.length) continue
      const values = facetValues(product, facet).map((v) => v.toLowerCase())
      // Values within one facet are ORed, facets are ANDed. Picking Malbec
      // and Rioja should widen, picking Malbec and "under 25" should narrow.
      if (!wanted.some((w) => values.includes(w.toLowerCase()))) return false
    }
  }

  return true
}

function sortProducts(items: Product[], sort: ProductQuery['sort']): Product[] {
  const sorted = [...items]
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.priceRange.min.amountMinor - b.priceRange.min.amountMinor)
    case 'price-desc':
      return sorted.sort((a, b) => b.priceRange.min.amountMinor - a.priceRange.min.amountMinor)
    case 'newest':
      return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    default:
      // "Featured" without merchandising data is not a real ordering. We do
      // not invent one: no sales data was available for the June review, so
      // there is no bestseller logic to apply. Stable catalogue order stands
      // in until the CMS supplies a curated order.
      return sorted
  }
}

export function fixtureQuery(query: ProductQuery): ProductQueryResult {
  const filtered = PRODUCTS.filter((p) => matches(p, query))
  const ordered = query.handles
    ? // Curated order wins over catalogue order.
      query.handles
        .map((h) => filtered.find((p) => p.handle === h))
        .filter((p): p is Product => p !== undefined)
    : sortProducts(filtered, query.sort)

  const first = query.first ?? 24
  const start = query.after ? Number(query.after) : 0
  const page = ordered.slice(start, start + first)
  const end = start + page.length

  return {
    items: page.map(toCard),
    pageInfo: { hasNextPage: end < ordered.length, endCursor: end < ordered.length ? String(end) : null },
    totalKnown: ordered.length,
  }
}

/** Distinct facet values across a result set, for building filter controls. */
export function fixtureFacetOptions(query: ProductQuery, facet: string): { value: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const product of PRODUCTS) {
    // Count against the listing's own query with this facet removed, so a
    // shopper can always see what else is available within the listing.
    const withoutFacet: ProductQuery = {
      ...query,
      facets: Object.fromEntries(Object.entries(query.facets ?? {}).filter(([k]) => k !== facet)),
    }
    if (!matches(product, withoutFacet)) continue
    for (const value of facetValues(product, facet)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value))
}
