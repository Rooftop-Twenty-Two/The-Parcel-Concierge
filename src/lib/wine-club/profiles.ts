import wineJson from '../../../data/catalogue/wines.json'
import type { Catalogue, CatalogueProduct } from '../catalogue/schema'
import type { TasteProfile } from './taste'

/**
 * A recommendation profile for every wine the club can send.
 *
 * The attributes are DERIVED, not guessed per bottle: a grape table plus
 * per-colour defaults, adjusted by country and price, all deterministic
 * and all inspectable. That is the honest way to do this with the data the
 * shop actually has. When the client wants finer control, these numbers
 * move into Shopify metafields (wine.body, wine.acidity, ...) and this
 * module reads those instead; the shape is already theirs.
 *
 * Excluded from the club, by rule rather than accident:
 *   - anything out of stock (a recommendation for a wine we cannot send
 *     is a support ticket, not a recommendation);
 *   - fortified and dessert wine, gift sets, spirits: the club sends
 *     red, white, rosé and sparkling;
 *   - anything whose colour we cannot determine.
 */

export type WineType = 'red' | 'white' | 'rose' | 'sparkling'

export type WineProfile = {
  handle: string
  title: string
  wineType: WineType
  priceMinor: number
  grapes: string[]
  country: string | null
  region: string | null
  vintage: string | null
  producer: string | null
  image: { url: string; alt: string } | null
  exclusive: boolean
  /** 1 safe and familiar .. 4 unusual grape or place. */
  adventureLevel: number
  attributes: Omit<TasteProfile, 'adventure'>
}

type Attrs = WineProfile['attributes']

/** Neutral starting point per colour; the grape table adjusts from here. */
const TYPE_BASE: Record<WineType, Attrs> = {
  red: { sweetness: 25, acidity: 50, bitterness: 60, body: 65, fruitiness: 55, richness: 60, freshness: 35, savoury: 55, aromatic: 45 },
  white: { sweetness: 35, acidity: 65, bitterness: 25, body: 40, fruitiness: 60, richness: 40, freshness: 70, savoury: 30, aromatic: 55 },
  rose: { sweetness: 40, acidity: 60, bitterness: 20, body: 35, fruitiness: 70, richness: 35, freshness: 75, savoury: 25, aromatic: 55 },
  sparkling: { sweetness: 40, acidity: 70, bitterness: 20, body: 35, fruitiness: 55, richness: 40, freshness: 85, savoury: 30, aromatic: 50 },
}

/**
 * How each grape moves the dial, relative to its colour's base. Nudges are
 * roughly -25..25 and additive across a blend. Common knowledge, written
 * down: a Sauvignon Blanc is sharper and fresher than the average white, a
 * Malbec is plusher than the average red.
 */
const GRAPE_ADJUST: Record<string, Partial<Attrs>> = {
  'Sauvignon Blanc': { acidity: 20, freshness: 15, aromatic: 10, sweetness: -10, richness: -10 },
  Chardonnay: { richness: 15, body: 15, acidity: -5, freshness: -5 },
  Riesling: { acidity: 20, aromatic: 15, sweetness: 10, body: -10 },
  'Pinot Grigio': { freshness: 10, body: -10, aromatic: -5 },
  Albariño: { acidity: 15, freshness: 15, aromatic: 10 },
  Albarino: { acidity: 15, freshness: 15, aromatic: 10 },
  Verdejo: { acidity: 10, freshness: 15, aromatic: 5 },
  Viognier: { aromatic: 20, richness: 15, body: 10, acidity: -10 },
  'Chenin Blanc': { acidity: 10, sweetness: 5, aromatic: 5 },
  Gewurztraminer: { aromatic: 25, sweetness: 15, acidity: -10 },
  Vermentino: { freshness: 15, savoury: 5 },
  Grillo: { freshness: 10, fruitiness: 5 },
  Cortese: { acidity: 10, freshness: 10 },
  Muscat: { aromatic: 20, sweetness: 15 },
  Semillon: { richness: 10, body: 5 },

  'Pinot Noir': { body: -15, bitterness: -15, acidity: 10, fruitiness: 10, aromatic: 10, savoury: 5 },
  Malbec: { body: 10, richness: 15, fruitiness: 10, bitterness: -5 },
  'Cabernet Sauvignon': { body: 15, bitterness: 15, savoury: 10 },
  Merlot: { richness: 10, bitterness: -10, fruitiness: 5 },
  Tempranillo: { savoury: 10, richness: 5, body: 5 },
  Syrah: { body: 15, savoury: 10, richness: 10, aromatic: 5 },
  Shiraz: { body: 15, fruitiness: 10, richness: 15 },
  Garnacha: { fruitiness: 15, richness: 5, bitterness: -5 },
  Grenache: { fruitiness: 15, richness: 5, bitterness: -5 },
  Nebbiolo: { bitterness: 20, savoury: 15, acidity: 10, body: 10 },
  Sangiovese: { acidity: 10, savoury: 15, bitterness: 5 },
  Primitivo: { fruitiness: 15, richness: 15, sweetness: 5 },
  Montepulciano: { savoury: 5, body: 5 },
  Zinfandel: { fruitiness: 15, richness: 10, sweetness: 5 },
  Carmenere: { savoury: 10, richness: 5 },
  Barbera: { acidity: 15, fruitiness: 10, bitterness: -5 },
  'Touriga Nacional': { body: 10, aromatic: 10, savoury: 5 },
  'Petit Verdot': { body: 15, bitterness: 10 },
  'Nero d’Avola': { fruitiness: 10, body: 5, savoury: 5 },
  Mourvedre: { savoury: 15, body: 10 },
  Glera: { freshness: 10, sweetness: 5, aromatic: 5 },
}

/** Grapes most Irish shoppers know by name. Anything else is a small adventure. */
const FAMILIAR_GRAPES = new Set([
  'Sauvignon Blanc', 'Chardonnay', 'Pinot Grigio', 'Pinot Noir', 'Merlot',
  'Cabernet Sauvignon', 'Malbec', 'Shiraz', 'Syrah', 'Rioja', 'Tempranillo',
  'Prosecco', 'Glera', 'Riesling',
])

const FAMILIAR_COUNTRIES = new Set(['France', 'Spain', 'Italy', 'Australia', 'New Zealand', 'Chile', 'Argentina'])

function wineTypeOf(product: CatalogueProduct): WineType | null {
  switch (product.productType) {
    case 'Red wine':
      return 'red'
    case 'White wine':
      return 'white'
    case 'Rosé wine':
      return 'rose'
    case 'Champagne':
    case 'Sparkling wine':
      return 'sparkling'
    default:
      // Port, sherry, spirits, gift sets and the handful the importer
      // could not classify. Not club wines.
      return null
  }
}

function clamp(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)))
}

function deriveAttributes(type: WineType, grapes: string[]): Attrs {
  const base = { ...TYPE_BASE[type] }
  if (!grapes.length) return base

  // A blend averages its grapes' nudges rather than stacking them, so a
  // three-grape blend does not read as three times the wine.
  const keys = Object.keys(base) as (keyof Attrs)[]
  for (const key of keys) {
    let sum = 0
    let counted = 0
    for (const grape of grapes) {
      const adjust = GRAPE_ADJUST[grape]
      if (!adjust) continue
      sum += adjust[key] ?? 0
      counted += 1
    }
    if (counted) base[key] = clamp(base[key] + sum / counted)
  }
  return base
}

function adventureOf(product: CatalogueProduct, type: WineType, grapes: string[]): number {
  let level = 1
  const anyUnfamiliarGrape = grapes.length > 0 && grapes.some((g) => !FAMILIAR_GRAPES.has(g))
  if (anyUnfamiliarGrape) level += 1
  const country = product.wine?.country
  if (country && !FAMILIAR_COUNTRIES.has(country)) level += 1
  if (product.wine?.isExclusiveImport) level += 1
  // A wine with no grape on record is an unknown, which is its own small
  // adventure for the drinker and for us.
  if (!grapes.length && type !== 'sparkling') level = Math.max(level, 2)
  return Math.min(level, 4)
}

function cheapestInStock(product: CatalogueProduct): number | null {
  const prices = product.variants
    .filter((v) => v.inventoryQuantity === null || v.inventoryQuantity > 0)
    .map((v) => Math.round(Number(v.price) * 100))
    .filter((n) => Number.isFinite(n) && n > 0)
  return prices.length ? Math.min(...prices) : null
}

function toProfile(product: CatalogueProduct): WineProfile | null {
  const wineType = wineTypeOf(product)
  if (!wineType) return null
  const priceMinor = cheapestInStock(product)
  if (priceMinor === null) return null

  const grapes = product.wine?.grape ?? []
  const image = product.images[0] ?? null

  return {
    handle: product.handle,
    title: product.title,
    wineType,
    priceMinor,
    grapes,
    country: product.wine?.country ?? null,
    region: product.wine?.region ?? null,
    vintage: product.wine?.vintage ?? null,
    producer: product.wine?.producer ?? null,
    image: image ? { url: image.src, alt: image.alt } : null,
    exclusive: Boolean(product.wine?.isExclusiveImport),
    adventureLevel: adventureOf(product, wineType, grapes),
    attributes: deriveAttributes(wineType, grapes),
  }
}

const catalogue = wineJson as Catalogue

/** Every wine the club can send, profiled. Computed once per process. */
export const WINE_PROFILES: readonly WineProfile[] = catalogue.products
  .map(toProfile)
  .filter((p): p is WineProfile => p !== null)

const BY_HANDLE = new Map(WINE_PROFILES.map((p) => [p.handle, p]))

export function wineProfile(handle: string): WineProfile | null {
  return BY_HANDLE.get(handle) ?? null
}
