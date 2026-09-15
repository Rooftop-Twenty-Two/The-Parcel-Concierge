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
  'Pinot Meunier',
  'Syrah',
  'Shiraz',
  'Grenache',
  'Garnacha',
  'Malbec',
  'Tempranillo',
  'Sangiovese',
  'Nebbiolo',
  'Barbera',
  'Dolcetto',
  'Montepulciano',
  'Zinfandel',
  'Primitivo',
  'Mourvèdre',
  'Monastrell',
  'Carmenère',
  'Petit Verdot',
  'Nero d’Avola',
  'Negroamaro',
  'Touriga Nacional',
  'Touriga Franca',
  'Gamay',
  'Pinotage',
  'Carignan',
  'Cariñena',
  'Cinsault',
  'Corvina',
  'Aglianico',
  'Bonarda',
  'Bobal',
  'Mencía',
  'Graciano',
  'Sagrantino',
  'Lagrein',
  'Teroldego',
  'Refosco',
  'Nerello Mascalese',
  'Frappato',
  'Blaufränkisch',
  'Zweigelt',
  'Tannat',
  'Petite Sirah',
  'Saperavi',
  'Marselan',
  'Xinomavro',
  'Agiorgitiko',
  'Plavac Mali',
  'Schiava',
  'Lambrusco',
  'Gaglioppo',
  'Susumaniello',
  'Nero di Troia',
  // Whites
  'Chardonnay',
  'Sauvignon Blanc',
  'Riesling',
  'Pinot Grigio',
  'Pinot Gris',
  'Pinot Blanc',
  'Gewürztraminer',
  'Viognier',
  'Chenin Blanc',
  'Sémillon',
  'Albariño',
  'Verdejo',
  'Godello',
  'Grüner Veltliner',
  'Vermentino',
  'Garganega',
  'Cortese',
  'Verdicchio',
  'Falanghina',
  'Greco',
  'Pecorino',
  'Grillo',
  'Catarratto',
  'Trebbiano',
  'Vernaccia',
  'Moscato',
  'Muscat',
  'Marsanne',
  'Roussanne',
  'Fiano',
  'Torrontés',
  'Macabeo',
  'Xarel·lo',
  'Parellada',
  'Assyrtiko',
  'Furmint',
  'Colombard',
  'Melon de Bourgogne',
  'Silvaner',
  'Müller-Thurgau',
  'Malvasia',
  'Palomino',
  'Pedro Ximénez',
  'Glera',
  // Rosé / other
  'Grenache Rosé',
] as const

function normaliseWineLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // fold accents: "albariño" -> "albarino"
    .replace(/\s+wines?$/, '') // drop a trailing "wine"/"wines": "syrah wine" -> "syrah"
    .replace(/\s+/g, ' ')
    .trim()
}

const GRAPE_BY_KEY = new Map(GRAPE_VARIETIES.map((name) => [normaliseWineLabel(name), name]))

/**
 * The canonical grape for a tag or collection label, or null when it is not a
 * grape. Case-, accent- and "… Wine"-insensitive, so "Syrah WIne", "syrah" and
 * "Syrah Wine" all resolve to "Syrah", while "Red Wines" resolves to null.
 */
export function grapeFromLabel(value: string): string | null {
  return GRAPE_BY_KEY.get(normaliseWineLabel(value)) ?? null
}

/**
 * Countries a wine can come from, and the demonyms the store tags them with.
 * The live catalogue tags country the way it tags grape — "French Wines",
 * "Italian Wines" — so each country lists the aliases that resolve to it. The
 * country name resolves to itself too, so a store that later fills a proper
 * country field also works. A country the store sells that is missing here
 * simply will not appear as a filter value; add it and it shows up.
 */
const WINE_COUNTRIES: { name: string; aliases: string[] }[] = [
  { name: 'France', aliases: ['French'] },
  { name: 'Italy', aliases: ['Italian'] },
  { name: 'Spain', aliases: ['Spanish'] },
  { name: 'Portugal', aliases: ['Portuguese'] },
  { name: 'Germany', aliases: ['German'] },
  { name: 'Austria', aliases: ['Austrian'] },
  { name: 'Australia', aliases: ['Australian'] },
  { name: 'New Zealand', aliases: ['New Zealander'] },
  { name: 'Argentina', aliases: ['Argentine', 'Argentinian'] },
  { name: 'Chile', aliases: ['Chilean'] },
  { name: 'United States', aliases: ['American', 'USA', 'US', 'Californian'] },
  { name: 'South Africa', aliases: ['South African'] },
  { name: 'Greece', aliases: ['Greek'] },
  { name: 'Hungary', aliases: ['Hungarian'] },
  { name: 'Georgia', aliases: ['Georgian'] },
  { name: 'Lebanon', aliases: ['Lebanese'] },
  { name: 'Romania', aliases: ['Romanian'] },
  { name: 'Croatia', aliases: ['Croatian'] },
  { name: 'Slovenia', aliases: ['Slovenian'] },
  { name: 'Switzerland', aliases: ['Swiss'] },
  { name: 'England', aliases: ['English'] },
  { name: 'Ireland', aliases: ['Irish'] },
]

const COUNTRY_BY_KEY = new Map(
  WINE_COUNTRIES.flatMap(({ name, aliases }) =>
    [name, ...aliases].map((label) => [normaliseWineLabel(label), name] as const),
  ),
)

/**
 * The canonical country for a tag or collection label, or null when it is not
 * a country. Handles the store's demonym tags ("French Wines" -> "France") as
 * well as a plain country name ("Italy" -> "Italy"); "Red Wines" resolves to
 * null.
 */
export function countryFromLabel(value: string): string | null {
  return COUNTRY_BY_KEY.get(normaliseWineLabel(value)) ?? null
}
