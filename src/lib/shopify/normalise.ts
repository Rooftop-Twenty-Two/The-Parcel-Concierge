import { money } from '../commerce/money'
import type {
  Cart,
  CartLine,
  HamperContentLine,
  HamperMetafields,
  PersonalisationOption,
  Product,
  ProductCard,
  ProductImage,
  ProductKind,
  ProductVariant,
  WineMetafields,
} from '../commerce/types'

/**
 * Shopify shapes in, front-end model out.
 *
 * Metafield values arrive as strings. Parsing is defensive on purpose: a
 * malformed metafield should degrade one accordion, not take down a product
 * page. The ingest tool is what stops malformed data reaching Shopify in the
 * first place, so a parse failure here means something bypassed it and the
 * warning is worth having in the server log.
 */

type MetafieldValue = { value: string } | null

function warn(context: string, error: unknown): void {
  console.warn(`[shopify] could not parse ${context}:`, error)
}

function parseJson<T>(field: MetafieldValue, fallback: T, context: string): T {
  if (!field?.value) return fallback
  try {
    return JSON.parse(field.value) as T
  } catch (error) {
    warn(context, error)
    return fallback
  }
}

function text(field: MetafieldValue): string | null {
  const value = field?.value?.trim()
  return value ? value : null
}

function bool(field: MetafieldValue): boolean {
  return field?.value === 'true'
}

function num(field: MetafieldValue): number | null {
  if (!field?.value) return null
  const parsed = Number(field.value)
  return Number.isFinite(parsed) ? parsed : null
}

function list(field: MetafieldValue, context: string): string[] {
  const parsed = parseJson<unknown>(field, [], context)
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
}

export function normaliseImage(image: {
  url: string
  altText?: string | null
  width?: number | null
  height?: number | null
} | null): ProductImage | null {
  if (!image?.url) return null
  return {
    url: image.url,
    // Empty alt is a data problem, not a rendering problem. The ingest tool
    // blocks images without alt text, so an empty string here means the
    // image predates the ingest tool. Falling back to "" keeps it decorative
    // rather than announcing a filename to a screen reader.
    alt: image.altText?.trim() ?? '',
    width: image.width ?? 1200,
    height: image.height ?? 1200,
  }
}

/**
 * Product kind comes from the type: tag, which the ingest tool guarantees is
 * present and single. Falling back on productType keeps legacy products
 * rendering while the catalogue is being migrated.
 */
export function kindFromTags(tags: readonly string[], productType?: string | null): ProductKind {
  if (tags.includes('type:hamper')) return 'hamper'
  if (tags.includes('type:wine')) return 'wine'
  if (tags.includes('type:spirit')) return 'spirit'
  if (tags.includes('type:addon')) return 'addon'
  const t = (productType ?? '').toLowerCase()
  if (t.includes('hamper')) return 'hamper'
  if (t.includes('whiskey') || t.includes('gin') || t.includes('spirit')) return 'spirit'
  if (t.includes('wine') || t.includes('champagne') || t.includes('port')) return 'wine'
  return 'addon'
}

type RawPriceRange = {
  minVariantPrice: { amount: string; currencyCode: string }
  maxVariantPrice: { amount: string; currencyCode: string }
}

type RawCardProduct = {
  id: string
  handle: string
  title: string
  productType?: string | null
  tags: string[]
  availableForSale: boolean
  featuredImage: Parameters<typeof normaliseImage>[0]
  priceRange: RawPriceRange
  variants?: {
    nodes: {
      id: string
      availableForSale?: boolean
      price?: { amount: string; currencyCode: string }
    }[]
  }
}

export function normaliseProductCard(raw: RawCardProduct): ProductCard {
  // The first variant that can actually be bought, so a card's + button
  // never adds a sold-out variant of an in-stock product.
  const nodes = raw.variants?.nodes ?? []
  const buyable = nodes.find((v) => v.availableForSale !== false) ?? nodes[0] ?? null
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    kind: kindFromTags(raw.tags, raw.productType),
    tags: raw.tags,
    availableForSale: raw.availableForSale,
    image: normaliseImage(raw.featuredImage),
    badges: raw.tags.filter((t) => t.startsWith('badge:')),
    defaultVariantId: buyable?.id ?? null,
    defaultVariantPriceMinor: buyable?.price
      ? money(buyable.price.amount, buyable.price.currencyCode).amountMinor
      : null,
    priceRange: {
      min: money(raw.priceRange.minVariantPrice.amount, raw.priceRange.minVariantPrice.currencyCode),
      max: money(raw.priceRange.maxVariantPrice.amount, raw.priceRange.maxVariantPrice.currencyCode),
    },
  }
}

type RawVariant = {
  id: string
  sku: string | null
  title: string
  availableForSale: boolean
  quantityAvailable: number | null
  price: { amount: string; currencyCode: string }
  compareAtPrice: { amount: string; currencyCode: string } | null
  selectedOptions: { name: string; value: string }[]
}

function normaliseVariant(raw: RawVariant): ProductVariant {
  return {
    id: raw.id,
    sku: raw.sku,
    title: raw.title,
    availableForSale: raw.availableForSale,
    quantityAvailable: raw.quantityAvailable,
    price: money(raw.price.amount, raw.price.currencyCode),
    compareAtPrice: raw.compareAtPrice
      ? money(raw.compareAtPrice.amount, raw.compareAtPrice.currencyCode)
      : null,
    selectedOptions: raw.selectedOptions,
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type RawProduct = RawCardProduct & {
  descriptionHtml: string
  updatedAt: string
  images: { nodes: Parameters<typeof normaliseImage>[0][] }
  variants: { nodes: RawVariant[] }
} & Record<string, any>
/* eslint-enable @typescript-eslint/no-explicit-any */

function normaliseHamper(raw: RawProduct, handle: string): HamperMetafields | null {
  const hasAny =
    raw.hamperContents || raw.hamperAllergens || raw.hamperPackaging || raw.hamperContainsAlcohol
  if (!hasAny) return null

  const rawContents = parseJson<unknown[]>(raw.hamperContents, [], `hamper.contents on ${handle}`)
  const contents: HamperContentLine[] = Array.isArray(rawContents)
    ? rawContents.flatMap((entry) => {
        if (typeof entry === 'string') return [{ name: entry, producer: null, size: null }]
        if (entry && typeof entry === 'object' && 'name' in entry) {
          const e = entry as { name: unknown; producer?: unknown; size?: unknown }
          if (typeof e.name !== 'string') return []
          return [
            {
              name: e.name,
              producer: typeof e.producer === 'string' ? e.producer : null,
              size: typeof e.size === 'string' ? e.size : null,
            },
          ]
        }
        return []
      })
    : []

  const rawPersonalisation = parseJson<unknown[]>(
    raw.hamperPersonalisation,
    [],
    `hamper.personalisation on ${handle}`,
  )
  const personalisation: PersonalisationOption[] = Array.isArray(rawPersonalisation)
    ? rawPersonalisation.flatMap((entry) => normalisePersonalisation(entry))
    : []

  return {
    contents,
    producers: list(raw.hamperProducers, `hamper.producers on ${handle}`),
    allergens: text(raw.hamperAllergens),
    containsAlcohol: bool(raw.hamperContainsAlcohol),
    packaging: text(raw.hamperPackaging),
    personalisation,
    dimensionsWeight: text(raw.hamperDimensionsWeight),
    leadTime: text(raw.hamperLeadTime),
    occasionTags: list(raw.hamperOccasionTags, `hamper.occasion_tags on ${handle}`),
    recipientTags: list(raw.hamperRecipientTags, `hamper.recipient_tags on ${handle}`),
  }
}

function normalisePersonalisation(entry: unknown): PersonalisationOption[] {
  if (!entry || typeof entry !== 'object') return []
  const e = entry as Record<string, unknown>
  const label = typeof e.label === 'string' ? e.label : null
  if (e.kind === 'gift-message' && label) {
    return [
      {
        kind: 'gift-message',
        label,
        maxLength: typeof e.maxLength === 'number' ? e.maxLength : 250,
        required: false,
      },
    ]
  }
  if (e.kind === 'ribbon-colour' && label) {
    const choices = Array.isArray(e.choices)
      ? e.choices.filter((c): c is string => typeof c === 'string')
      : []
    if (!choices.length) return []
    return [{ kind: 'ribbon-colour', label, choices, required: false }]
  }
  if (e.kind === 'branded-card' && label) {
    return [{ kind: 'branded-card', label, required: false }]
  }
  return []
}

function normaliseWine(raw: RawProduct, handle: string): WineMetafields | null {
  const hasAny = raw.wineProducer || raw.wineRegion || raw.wineGrape || raw.wineTastingNote
  if (!hasAny) return null
  return {
    producer: text(raw.wineProducer),
    region: text(raw.wineRegion),
    country: text(raw.wineCountry),
    grape: list(raw.wineGrape, `wine.grape on ${handle}`),
    vintage: text(raw.wineVintage),
    abv: num(raw.wineAbv),
    volume: text(raw.wineVolume),
    style: { body: text(raw.wineStyleBody), sweetness: text(raw.wineStyleSweetness) },
    tastingNote: text(raw.wineTastingNote),
    foodPairing: text(raw.wineFoodPairing),
    awards: list(raw.wineAwards, `wine.awards on ${handle}`),
    isExclusiveImport: bool(raw.wineIsExclusiveImport),
    rrpComparison: text(raw.wineRrpComparison),
    isAlcoholFree: bool(raw.wineIsAlcoholFree),
    organic: bool(raw.wineOrganic),
    biodynamic: bool(raw.wineBiodynamic),
    fineWine: bool(raw.wineFineWine),
    giftSet: bool(raw.wineGiftSet),
  }
}

export function normaliseProduct(raw: RawProduct): Product {
  const images = raw.images.nodes
    .map(normaliseImage)
    .filter((image): image is ProductImage => image !== null)

  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    descriptionHtml: raw.descriptionHtml,
    kind: kindFromTags(raw.tags, raw.productType),
    images,
    variants: raw.variants.nodes.map(normaliseVariant),
    priceRange: {
      min: money(raw.priceRange.minVariantPrice.amount, raw.priceRange.minVariantPrice.currencyCode),
      max: money(raw.priceRange.maxVariantPrice.amount, raw.priceRange.maxVariantPrice.currencyCode),
    },
    availableForSale: raw.availableForSale,
    tags: raw.tags,
    hamper: normaliseHamper(raw, raw.handle),
    wine: normaliseWine(raw, raw.handle),
    updatedAt: raw.updatedAt,
  }
}

type RawCart = {
  id: string
  checkoutUrl: string
  totalQuantity: number
  cost: { subtotalAmount: { amount: string; currencyCode: string } }
  lines: {
    nodes: {
      id: string
      quantity: number
      attributes: { key: string; value: string }[]
      sellingPlanAllocation?: { sellingPlan: { id: string; name: string } } | null
      cost: {
        totalAmount: { amount: string; currencyCode: string }
        amountPerQuantity: { amount: string; currencyCode: string }
      }
      merchandise: {
        id: string
        title: string
        image: Parameters<typeof normaliseImage>[0]
        product: { handle: string; title: string; tags: string[] }
      }
    }[]
  }
}

export function normaliseCart(raw: RawCart): Cart {
  const lines: CartLine[] = raw.lines.nodes.map((node) => ({
    id: node.id,
    quantity: node.quantity,
    merchandiseId: node.merchandise.id,
    productHandle: node.merchandise.product.handle,
    productTitle: node.merchandise.product.title,
    // Shopify names the only variant of a single-variant product
    // "Default Title". Showing that in the cart looks like a bug.
    variantTitle: node.merchandise.title === 'Default Title' ? null : node.merchandise.title,
    image: normaliseImage(node.merchandise.image),
    unitPrice: money(node.cost.amountPerQuantity.amount, node.cost.amountPerQuantity.currencyCode),
    lineTotal: money(node.cost.totalAmount.amount, node.cost.totalAmount.currencyCode),
    attributes: node.attributes,
    sellingPlanName: node.sellingPlanAllocation?.sellingPlan.name ?? null,
  }))

  const containsAlcohol = raw.lines.nodes.some((node) => {
    const tags = node.merchandise.product.tags
    return tags.includes('type:wine') || tags.includes('type:spirit')
  })

  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    subtotal: money(raw.cost.subtotalAmount.amount, raw.cost.subtotalAmount.currencyCode),
    lines,
    containsAlcohol,
  }
}
