/**
 * The locked tag taxonomy (brief section 6).
 *
 * This file is the single source of truth. The ingest tool imports it to
 * reject free tagging at write time, the route registry imports it to build
 * listing queries, and the sitemap imports it to decide what can exist. A
 * tag that is not in here cannot be written to Shopify and cannot drive a
 * route.
 */

export const OCCASION_TAGS = [
  'occasion:christmas',
  'occasion:new-baby',
  'occasion:sympathy',
  'occasion:anniversary',
  'occasion:thank-you',
  'occasion:birthday',
  'occasion:wedding',
  'occasion:corporate',
] as const

export const RECIPIENT_TAGS = [
  'recipient:her',
  'recipient:him',
  'recipient:couple',
  'recipient:family',
  'recipient:client',
] as const

export const TYPE_TAGS = [
  'type:hamper',
  'type:wine',
  'type:spirit',
  'type:addon',
  // The quarantined kind: the full shop catalogue, sold only inside the
  // hamper builder. See scripts/catalogue/import-builder-items.mjs.
  'type:builder-item',
] as const

/**
 * The builder's aisles. One per builder item, set by the importer from the
 * shop's own tags and types. These are picker navigation, not site routes.
 */
export const AISLE_TAGS = [
  'aisle:chocolate-sweets',
  'aisle:food-larder',
  'aisle:candles-fragrance',
  'aisle:beauty-bath',
  'aisle:baby-kids',
  'aisle:jewellery-accessories',
  'aisle:homeware-kitchen',
  'aisle:cards-stationery',
  'aisle:wine-cellar-extras',
  'aisle:everything-else',
] as const

/**
 * Alcohol the wine importer did not claim (beer, cider, cream liqueurs
 * sold as food gifts). Arms the age gate when the item goes in a box.
 */
export const CONTENT_TAGS = ['contains:alcohol'] as const

export const PRICE_TAGS = [
  'price:under-50',
  'price:50-100',
  'price:100-150',
  'price:150-plus',
] as const

export const BADGE_TAGS = [
  'badge:exclusive',
  'badge:irish-made',
  'badge:guaranteed-irish',
  'badge:hand-delivered',
] as const

export const ALL_TAGS = [
  ...OCCASION_TAGS,
  ...RECIPIENT_TAGS,
  ...TYPE_TAGS,
  ...PRICE_TAGS,
  ...BADGE_TAGS,
  ...AISLE_TAGS,
  ...CONTENT_TAGS,
] as const

export type Tag = (typeof ALL_TAGS)[number]

const TAG_SET: ReadonlySet<string> = new Set(ALL_TAGS)

export function isKnownTag(tag: string): tag is Tag {
  return TAG_SET.has(tag)
}

/**
 * Validates a product's tags against the taxonomy. Returns the offending
 * tags rather than throwing, so the ingest tool can report every problem in
 * one run instead of one per invocation.
 */
export function findUnknownTags(tags: readonly string[]): string[] {
  return tags.filter((t) => !TAG_SET.has(t))
}

/**
 * Price bands. The minor-unit bounds here are the definition used by the
 * budget routes, the price: tags and the GA4 budget-band dimension, so a
 * shopper, a tag and an analytics report can never disagree about which band
 * a product is in.
 */
export const PRICE_BANDS = [
  { tag: 'price:under-50', label: 'Under €50', minMinor: 0, maxMinor: 4999 },
  { tag: 'price:50-100', label: '€50 to €100', minMinor: 5000, maxMinor: 9999 },
  { tag: 'price:100-150', label: '€100 to €150', minMinor: 10000, maxMinor: 14999 },
  { tag: 'price:150-plus', label: '€150 and over', minMinor: 15000, maxMinor: null },
] as const satisfies readonly {
  tag: (typeof PRICE_TAGS)[number]
  label: string
  minMinor: number
  maxMinor: number | null
}[]

export function priceBandForMinor(amountMinor: number): (typeof PRICE_BANDS)[number] {
  const band = PRICE_BANDS.find(
    (b) => amountMinor >= b.minMinor && (b.maxMinor === null || amountMinor <= b.maxMinor),
  )
  // The bands are exhaustive from 0 upwards, so the fallback is unreachable
  // for any non-negative amount. It exists so the return type stays narrow.
  return band ?? PRICE_BANDS[PRICE_BANDS.length - 1]!
}

/** Human labels for tags, used in breadcrumbs, filter chips and analytics. */
export const TAG_LABELS: Record<string, string> = {
  'occasion:christmas': 'Christmas',
  'occasion:new-baby': 'New baby',
  'occasion:sympathy': 'Sympathy',
  'occasion:anniversary': 'Anniversary',
  'occasion:thank-you': 'Thank you',
  'occasion:birthday': 'Birthday',
  'occasion:wedding': 'Wedding',
  'occasion:corporate': 'Corporate',
  'recipient:her': 'For her',
  'recipient:him': 'For him',
  'recipient:couple': 'For couples',
  'recipient:family': 'For families',
  'recipient:client': 'For clients',
  'type:hamper': 'Hamper',
  'type:wine': 'Wine',
  'type:spirit': 'Spirit',
  'type:addon': 'Add-on',
  'badge:exclusive': 'Exclusive to us',
  'badge:irish-made': 'Irish made',
  'badge:guaranteed-irish': 'Guaranteed Irish',
  'badge:hand-delivered': 'Hand delivered',
  ...Object.fromEntries(PRICE_BANDS.map((band) => [band.tag, band.label])),
}

/**
 * Grape varieties, used to read a clean "Grape" filter out of the store's
 * product tags and collections. The live catalogue does not fill the
 * wine.grape metafield; instead a bottle carries tags and collections like
 * "Syrah Wine", "Grenache Wine" and "Red Wines". Matching against this list
 * keeps only the actual varieties (so "Red Wines" and utility collections drop
 * out) and normalises the merchant's casing and typos to one tidy label.
 *
 * A variety the store sells that is missing here simply will not appear as a
 * filter value; add it and it shows up. Order is display order in the rail.
 */
export const GRAPE_VARIETIES = [
  // Reds
  'Cabernet Sauvignon',
  'Cabernet Franc',
  'Merlot',
  'Pinot Noir',
  'Syrah',
  'Shiraz',
  'Grenache',
  'Malbec',
  'Tempranillo',
  'Sangiovese',
  'Nebbiolo',
  'Barbera',
  'Montepulciano',
  'Zinfandel',
  'Primitivo',
  'Mourvèdre',
  'Carmenère',
  'Petit Verdot',
  'Nero d’Avola',
  'Touriga Nacional',
  'Gamay',
  'Pinotage',
  'Carignan',
  'Cinsault',
  'Corvina',
  'Aglianico',
  // Whites
  'Chardonnay',
  'Sauvignon Blanc',
  'Riesling',
  'Pinot Grigio',
  'Pinot Gris',
  'Gewürztraminer',
  'Viognier',
  'Chenin Blanc',
  'Sémillon',
  'Albariño',
  'Verdejo',
  'Grüner Veltliner',
  'Vermentino',
  'Garganega',
  'Trebbiano',
  'Moscato',
  'Muscat',
  'Marsanne',
  'Roussanne',
  'Fiano',
  'Torrontés',
  'Macabeo',
  'Assyrtiko',
  'Glera',
  // Rosé / other
  'Grenache Rosé',
] as const

function normaliseGrapeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // fold accents: "albariño" -> "albarino"
    .replace(/\s+wines?$/, '') // drop a trailing "wine"/"wines": "syrah wine" -> "syrah"
    .replace(/\s+/g, ' ')
    .trim()
}

const GRAPE_BY_KEY = new Map(GRAPE_VARIETIES.map((name) => [normaliseGrapeKey(name), name]))

/**
 * The canonical grape for a tag or collection label, or null when it is not a
 * grape. Case-, accent- and "… Wine"-insensitive, so "Syrah WIne", "syrah" and
 * "Syrah Wine" all resolve to "Syrah", while "Red Wines" resolves to null.
 */
export function grapeFromLabel(value: string): string | null {
  return GRAPE_BY_KEY.get(normaliseGrapeKey(value)) ?? null
}

/**
 * Countries, read the same way out of the store's tags. The old site tagged
 * a bottle "French Wines", "Spanish Wine", "South African Wines", and was
 * never consistent about the plural or the form, so every spelling the
 * export was found to use maps to one label. Bare names ("France") and
 * demonyms ("French") are accepted too, so the vocabulary can be tidied
 * without the filter going dark.
 *
 * Read only when the wine.country metafield is absent, which on the live
 * store is always: the metafields are not on the store yet. This is what
 * makes the Country filter work today.
 */
const COUNTRY_KEYS: Record<string, string> = {
  france: 'France',
  french: 'France',
  spain: 'Spain',
  spanish: 'Spain',
  italy: 'Italy',
  italian: 'Italy',
  argentina: 'Argentina',
  argentinian: 'Argentina',
  argentine: 'Argentina',
  'new zealand': 'New Zealand',
  portugal: 'Portugal',
  portuguese: 'Portugal',
  'south africa': 'South Africa',
  'south african': 'South Africa',
  australia: 'Australia',
  australian: 'Australia',
  chile: 'Chile',
  chilean: 'Chile',
  germany: 'Germany',
  german: 'Germany',
  'united states': 'United States',
  usa: 'United States',
  american: 'United States',
  california: 'United States',
  californian: 'United States',
  austria: 'Austria',
  austrian: 'Austria',
  greece: 'Greece',
  greek: 'Greece',
  ireland: 'Ireland',
  irish: 'Ireland',
  england: 'England',
  english: 'England',
  hungary: 'Hungary',
  hungarian: 'Hungary',
  lebanon: 'Lebanon',
  lebanese: 'Lebanon',
}

/** The country a tag names, or null. "French Wines", "france", "FRENCH WINE" all give France. */
export function countryFromLabel(value: string): string | null {
  return COUNTRY_KEYS[normaliseGrapeKey(value)] ?? null
}

/**
 * Regions worth a filter value. Exact match on the tag after the same
 * normalisation, so "Rioja Wines" and "rioja" both resolve, and a region
 * word inside a longer tag ("Rioja Reserva Gift Set") does not.
 */
export const WINE_REGIONS = [
  'Bordeaux',
  'Burgundy',
  'Chablis',
  'Beaujolais',
  'Champagne',
  'Loire',
  'Alsace',
  'Provence',
  'Rhône',
  'Languedoc',
  'Rioja',
  'Ribera del Duero',
  'Rueda',
  'Priorat',
  'Penedès',
  'Rías Baixas',
  'Douro',
  'Chianti',
  'Barolo',
  'Tuscany',
  'Piedmont',
  'Veneto',
  'Sicily',
  'Puglia',
  'Prosecco',
  'Mosel',
  'Marlborough',
  'Central Otago',
  "Hawke's Bay",
  'Mendoza',
  'Stellenbosch',
  'Swartland',
  'Western Cape',
  'Barossa',
  'McLaren Vale',
  'Napa Valley',
  'Sonoma',
  'Maipo',
] as const

const REGION_BY_KEY = new Map(WINE_REGIONS.map((name) => [normaliseGrapeKey(name), name]))

/** The region a tag names, or null. */
export function regionFromLabel(value: string): string | null {
  return REGION_BY_KEY.get(normaliseGrapeKey(value)) ?? null
}
