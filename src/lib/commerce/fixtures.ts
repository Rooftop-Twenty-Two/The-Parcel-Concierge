import builderItemsJson from '../../../data/catalogue/builder-items.json'
import hampersJson from '../../../data/catalogue/hampers.json'
import mechanismsJson from '../../../data/catalogue/mechanisms.json'
import wineJson from '../../../data/catalogue/wines.json'
import type { Catalogue, CatalogueProduct } from '../catalogue/schema'
import { seasonalCardImage } from './christmas-images'
import { HIDDEN_FROM_LISTINGS } from './collections'
import { money } from './money'
import { recipientsFromTags } from './taxonomy'
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
 * EVERY PRODUCT IS REAL. wines.json and hampers.json are the client's own
 * Shopify export; builder-items.json is the rest of that export, sold only
 * through the hamper builder; mechanisms.json holds the builder's box
 * product, which exists to make a flow work rather than to be browsed.
 * There is no sample data anywhere in the catalogue: a product the client
 * does not sell does not appear. All the files are the same shape, so
 * nothing downstream can tell them apart, and a handle collision resolves
 * in favour of the earlier source.
 */
const sources = [
  wineJson as Catalogue,
  hampersJson as Catalogue,
  builderItemsJson as Catalogue,
  mechanismsJson as Catalogue,
]

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
  if (product.tags.includes('type:builder-item')) return 'builder-item'
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
    image: null,
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
  // The first variant that can actually be bought. See the type's comment:
  // handing out a sold-out variant id made the builder reject boxes.
  const buyable = product.variants.find((v) => v.availableForSale) ?? product.variants[0]
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    kind: product.kind,
    priceRange: product.priceRange,
    availableForSale: product.availableForSale,
    tags: product.tags,
    image: seasonalCardImage(product.handle, product.images[0] ?? null),
    badges: product.tags.filter((t) => t.startsWith('badge:')),
    defaultVariantId: buyable?.id ?? null,
    defaultVariantPriceMinor: buyable?.price.amountMinor ?? null,
  }
}

const PRODUCTS: Product[] = catalogue.products.map(toProduct)
const BY_HANDLE = new Map(PRODUCTS.map((p) => [p.handle, p]))
const PRODUCT_TYPE_BY_HANDLE = new Map(catalogue.products.map((p) => [p.handle, p.productType]))

export function fixtureProduct(handle: string): Product | null {
  return BY_HANDLE.get(handle) ?? null
}

export function fixtureAllHandles(): string[] {
  // The sitemap must never learn a builder item exists: they have no URL.
  // Hidden mechanism products (the builder's box and bow) stay out too.
  return PRODUCTS.filter((p) => p.kind !== 'builder-item' && !HIDDEN_FROM_LISTINGS.has(p.handle)).map(
    (p) => p.handle,
  )
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
      return recipientsFromTags(product.tags)
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
  // Builder items answer only two kinds of question: a query that names
  // the kind (the builder's own picker) and an explicit handle lookup (the
  // cart resolving what is in a box). Every other query on the site gets
  // nothing, whatever else it asks for, so no future listing can leak the
  // quarantined catalogue by forgetting a filter.
  if (
    product.kind === 'builder-item' &&
    !query.kinds?.includes('builder-item') &&
    !query.handles?.includes(product.handle)
  ) {
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
  if (query.text) {
    // Every word must appear somewhere in the title. "irish chocolate"
    // should find Irish Chocolate Truffles, not everything Irish plus
    // everything chocolate.
    const title = product.title.toLowerCase()
    const words = query.text.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.every((w) => title.includes(w))) return false
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
