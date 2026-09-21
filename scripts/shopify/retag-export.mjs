#!/usr/bin/env node
/**
 * Re-tags a Shopify product export to match what the current website
 * reads. Structure findings are in data/shopify-import/website-product-structure.md.
 *
 * The rules here are lifted from the site's own code, not invented:
 *   - what counts as wine: isWineish / SPIRITY, from import-shopify-export.mjs
 *   - grape, region, country, colour vocabularies: the same file
 *   - which tags the site reads: kindFromMembership (normalise.ts),
 *     cardFacetValues (commerce/index.ts), taxonomy.ts
 *
 * What it changes: the Tags column, and nothing else. Every other column
 * of every row is written back byte for byte, so the file stays safe to
 * re-import over the existing products.
 *
 * What it deliberately does not do:
 *   - set collections. A product CSV has no collection column, and the
 *     site's collections are manual. Page placement is a Shopify admin job.
 *   - apply type:builder-item. On the live store that tag removes a
 *     product from the Build a Box picker as well as from every listing.
 *   - apply aisle:*, which nothing reads.
 *   - remove any existing tag. The old wine tags ARE the live Country,
 *     Region and Grape filter feed, and nothing else in the vocabulary
 *     was identifiable as old-site-only.
 *
 * Usage:
 *   node scripts/shopify/retag-export.mjs --input <export.csv> --outdir data/shopify-import
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { readCsv } from '../catalogue/csv.mjs'

// --- vocabularies, from scripts/catalogue/import-shopify-export.mjs ---------

const COUNTRIES = {
  'french wine': 'France', 'french wines': 'France', 'spanish wine': 'Spain', 'spanish wines': 'Spain',
  'italian wine': 'Italy', 'italian wines': 'Italy', 'argentinian wines': 'Argentina', 'argentinian wine': 'Argentina',
  'new zealand wines': 'New Zealand', 'new zealand wine': 'New Zealand', 'portuguese wines': 'Portugal',
  'portuguese wine': 'Portugal', 'south african wines': 'South Africa', 'south african wine': 'South Africa',
  'australian wines': 'Australia', 'australian wine': 'Australia', 'chilean wines': 'Chile', 'chilean wine': 'Chile',
  'german wines': 'Germany', 'german wine': 'Germany', 'american wines': 'United States',
  'californian wines': 'United States', 'austrian wines': 'Austria', 'greek wines': 'Greece',
  'irish wines': 'Ireland', 'english wines': 'England', 'hungarian wines': 'Hungary', 'lebanese wines': 'Lebanon',
}
/** The tag the site's countryFromLabel reads back for each country. */
const COUNTRY_TAG = {
  France: 'French Wine', Spain: 'Spanish Wine', Italy: 'Italian Wine', Argentina: 'Argentinian Wine',
  'New Zealand': 'New Zealand Wine', Portugal: 'Portuguese Wine', 'South Africa': 'South African Wine',
  Australia: 'Australian Wine', Chile: 'Chilean Wine', Germany: 'German Wine', 'United States': 'American Wine',
  Austria: 'Austrian Wine', Greece: 'Greek Wine', Ireland: 'Irish Wine', England: 'English Wine',
  Hungary: 'Hungarian Wine', Lebanon: 'Lebanese Wine',
}
const GRAPES = ['Malbec','Sauvignon Blanc','Chardonnay','Pinot Noir','Pinot Grigio','Tempranillo','Albarino','Albariño',
  'Montepulciano','Verdejo','Shiraz','Syrah','Chenin Blanc','Cabernet Sauvignon','Riesling','Primitivo','Garnacha',
  'Grenache','Merlot','Nebbiolo','Sangiovese','Viognier','Zinfandel','Gewurztraminer','Glera','Macabeo','Xarel-lo',
  'Mourvedre','Carmenere','Nero d’Avola','Vermentino','Grillo','Barbera','Touriga Nacional','Petit Verdot','Semillon',
  'Muscat','Cortese']
const REGIONS = ['Bordeaux','Rioja','Douro','Burgundy','Chablis','Beaujolais','Chianti','Barolo','Rias Baixas',
  'Marlborough','Mendoza','Tuscany','Piedmont','Provence','Loire','Alsace','Champagne','Prosecco','Penedes','Mosel',
  'Ribera del Duero','Rueda','Priorat','Stellenbosch']
const GRAPE_COLOUR = { Malbec:'Red Wine',Merlot:'Red Wine','Cabernet Sauvignon':'Red Wine','Pinot Noir':'Red Wine',
  Tempranillo:'Red Wine',Syrah:'Red Wine',Shiraz:'Red Wine',Garnacha:'Red Wine',Grenache:'Red Wine',Nebbiolo:'Red Wine',
  Sangiovese:'Red Wine',Primitivo:'Red Wine',Montepulciano:'Red Wine',Zinfandel:'Red Wine',Carmenere:'Red Wine',
  Barbera:'Red Wine','Touriga Nacional':'Red Wine','Petit Verdot':'Red Wine','Nero d’Avola':'Red Wine',
  Mourvedre:'Red Wine','Sauvignon Blanc':'White Wine',Chardonnay:'White Wine','Pinot Grigio':'White Wine',
  'Albariño':'White Wine',Verdejo:'White Wine',Riesling:'White Wine','Chenin Blanc':'White Wine',Viognier:'White Wine',
  Gewurztraminer:'White Wine',Vermentino:'White Wine',Grillo:'White Wine',Semillon:'White Wine',Cortese:'White Wine',
  Macabeo:'White Wine','Xarel-lo':'White Wine',Muscat:'White Wine' }
const REGION_COUNTRY = { Bordeaux:'France',Burgundy:'France',Chablis:'France',Beaujolais:'France',Provence:'France',
  Loire:'France',Alsace:'France',Champagne:'France',Rioja:'Spain','Ribera del Duero':'Spain',Rueda:'Spain',
  Priorat:'Spain',Penedes:'Spain','Rias Baixas':'Spain',Douro:'Portugal',Chianti:'Italy',Barolo:'Italy',
  Tuscany:'Italy',Piedmont:'Italy',Prosecco:'Italy',Marlborough:'New Zealand',Mendoza:'Argentina',
  Stellenbosch:'South Africa',Mosel:'Germany' }
const STYLE_RULES = [
  { tag:'Wine Gift Set', tags:['wine gift sets','wine gift set'], titles:[/\b(gift (set|carton|box)|twin (gift )?carton|\d\s?bottle)\b/i] },
  { tag:'Champagne', tags:['champagne'], titles:[/\bchampagne\b/i] },
  { tag:'Sparkling', tags:['prosecco','champagne and prosecco','sparkling','rose sparkling','cava'], titles:[/\b(prosecco|cava|spumante|cr[eé]mant|sparkling)\b/i] },
  { tag:'Port', tags:['port'], titles:[/\bport\b/i] },
  { tag:'Sherry', tags:['sherry'], titles:[/\b(sherry|manzanilla|amontillado|oloroso|fino)\b/i] },
  { tag:'Dessert Wine', tags:['dessert wine','sweet wine'], titles:[/\b(sauternes|tokaji|ice ?wine|moscatel)\b/i] },
  { tag:'Rosé Wine', tags:['rose','rose wine','rosé wine'], titles:[/\bros[eé]\b/i] },
  { tag:'White Wine', tags:['white wine','white wines'], titles:[] },
  { tag:'Red Wine', tags:['red wine','red wines'], titles:[] },
]
const OCCASION_MAP = {
  'christmas':'occasion:christmas','xmas wine':'occasion:christmas','xmas her':'occasion:christmas',
  'xmas him':'occasion:christmas','xmas gift set':'occasion:christmas','xmas homeware':'occasion:christmas',
  'xmas food':'occasion:christmas','gifts by anniversary':'occasion:anniversary','gifts by birthday':'occasion:birthday',
  'birthday girl':'occasion:birthday','birthday cards':'occasion:birthday','gifts for employees':'occasion:corporate',
  'gifts for employees gifts for employees':'occasion:corporate','wedding':'occasion:wedding',
  'gifts for wedding':'occasion:wedding','gifts for baby':'occasion:new-baby','new baby':'occasion:new-baby',
  'sympathy':'occasion:sympathy','thank you':'occasion:thank-you',
}
const RECIPIENT_MAP = {
  'gifts for her':'recipient:her','gifts for him':'recipient:him','gifts for men':'recipient:him',
  'gifts for couples':'recipient:couple','gifts for families':'recipient:family',
  'gifts for employees':'recipient:client','gifts for employees gifts for employees':'recipient:client',
  'gifts for customers':'recipient:client',
}
const SPIRITY = /\b(whiskey|whisky|gin|vodka|rum|tequila|brandy|cognac|liqueu?r|vermouth|poit[ií]n|schnapps|aperitif)\b/i
const NOT_A_BOTTLE = /\b(card|candle|glass|glasses|tumbler|flute|bag|carafe|decanter|cooler|chiller|stopper|opener|corkscrew|pourer|aerator|preserver|thermometer|foil cutter|coaster|tray|lamp|wallet|butler|beaker|rules|apron|socks|book|sign|plaque|chutney|sauce|tool|rack|holder|charm|jigsaw|puzzle|sleeve)\b/i
const WINE_TAG_SIGNALS = new Set(['red wine','red wines','white wine','white wines','rose wine','rosé wine','rose',
  'rose sparkling','champagne','champagne and prosecco','prosecco','sparkling','cava','fine wines','fine wine','port',
  'sherry','dessert wine','sweet wine','wine gift sets','wine gift set',
  ...Object.keys(COUNTRIES), ...GRAPES.map(g=>g.toLowerCase()), ...GRAPES.map(g=>`${g.toLowerCase()} wine`)])
const ALCOHOLIC = /\b(beer|ale|stout|lager|cider|liqueur|baileys|whiskey|whisky|gin|vodka|rum|brandy|poitin|poitín|mead)\b/i
const ALCOHOL_FALSE_FRIENDS = /\b(chocolates?|truffles?|fudge|sauce|cake|candle|soap|glass|glasses|tumbler|card|flavoured tea)\b/i

/** The three add-on listings that survive under /gifts, by old tag. */
const ADDON_TAGS = new Set(['candles & diffusers','chocolate & confectionery','crystal','glassware'])
const HIDDEN_HANDLES = new Set(['build-a-hamper','build-a-premium-hamper','gift-bow'])

/**
 * One tag per collection the site reads, so each collection can be
 * automated on "Product tag is equal to <tag>". The tag text is the
 * merchant's own wherever the export already uses one, so most products
 * keep working the moment the collection is switched to automated.
 *
 * A Shopify product CSV has no collection column, so this is how an
 * import reaches collection membership: tag here, automate once in admin.
 * data/shopify-import/collections-to-automate.csv is the setup list.
 */
const COLLECTION_TAG = {
  hampers: 'All Hampers',
  fineWines: 'Fine Wines',
  red: 'Red Wines',
  white: 'White Wines',
  rose: 'Rose Wine',
  sparkling: 'Champagne and Prosecco',
  portSherry: 'Port and Sherry',
  organic: 'Organic Wine',
  nonAlcoholic: 'Non-Alcoholic',
  wineGiftSets: 'Wine Gift Sets',
  allGifts: 'All Gifts',
  food: 'All Food',
  chocolate: 'Chocolate & Confectionery',
  candles: 'Candles & Diffusers',
  crystal: 'Glassware & Crystal',
  beauty: 'Beauty',
  homeware: 'Homeware',
  baby: 'Baby',
  jewellery: 'Jewellery',
  cards: 'Greeting Cards',
}

/** Which collection handle each of those tags should drive. */
const COLLECTION_HANDLE = {
  'All Hampers': 'christmas-2026', 'Fine Wines': 'fine-wines-1', 'Red Wines': 'red-wines-1',
  'White Wines': 'white-wines-1', 'Rose Wine': 'rose', 'Champagne and Prosecco': 'champagne-and-prosecco-1',
  'Port and Sherry': 'port-and-sherry-1', 'Organic Wine': 'organic-wine', 'Non-Alcoholic': 'non-alcoholic-1',
  'Wine Gift Sets': 'wine-gift-sets', 'All Gifts': 'all-gifts', 'All Food': 'all-food',
  'Chocolate & Confectionery': 'chocolate-confectionery-1', 'Candles & Diffusers': 'candles-diffusers',
  'Glassware & Crystal': 'glassware-crystal', Beauty: 'beauty', Homeware: 'homeware', Baby: 'baby',
  Jewellery: 'jewellery', 'Greeting Cards': 'greeting-cards',
}

/**
 * Build a Box shelves, in priority order. Lifted from the AISLES table in
 * scripts/catalogue/import-builder-items.mjs, which was itself read off
 * this export, typos included. First match wins.
 */
const SHELVES = [
  { tag: COLLECTION_TAG.chocolate,
    types: ['chocolate','chocolate bar','nougat','jellies','popcorn','fudge','sweets','marshmallow','toffee'],
    tags: ['chocolate & confectionery'],
    titles: /\b(chocolates?|choc\b|easter egg|fudge|honeycomb|truffles?|toffee|caramels?|liquorice|marshmallows?|nougat|sweets|bonbons?|praline)\b/i },
  { tag: COLLECTION_TAG.candles,
    types: ['candle','candles','diffuser','wax melt','room spray'],
    tags: ['candles & diffusers'],
    titles: /\b(candles?|diffusers?|wax melts?|room spray|incense)\b/i },
  { tag: COLLECTION_TAG.beauty,
    types: ['soap','shampoo','deodrant','deodorant','bath salt','bodycare','moisturiser','lip balm','hand cream','perfume'],
    tags: ['beauty','skincare','bath and body'],
    titles: /\b(soap|shampoo|conditioner|body ?(wash|lotion|butter|cream)|moisturis|lip balm|hand cream|bath (salts?|bomb|soak)|sea sponge|face (mask|cream)|serum|cleanser|perfume|eau de)\b/i },
  { tag: COLLECTION_TAG.baby,
    types: ['teddy','toy','babygrow','sleepsuit'],
    tags: ['gifts for baby','baby','gifts for children'],
    titles: /\b(teddy|babygrow|sleepsuit|romper|rattle|twinkle twinkle|jellycat)\b/i },
  { tag: COLLECTION_TAG.jewellery,
    types: ['earrings','necklace','bracelet','brooch','socks','scarf','wallet','pen'],
    tags: ['jewellery','earrings'],
    titles: /\b(pendant|earrings?|necklace|bracelet|bangle|brooch|cufflinks?|scarf|wallet|socks?|rollerball|fountain pen|ballpoint|keyring|umbrella|gloves|beanie|cap)\b/i },
  { tag: COLLECTION_TAG.crystal,
    types: ['glasses','tumbler','vase'],
    tags: ['crystal','glassware'],
    titles: /\b(crystal|decanter|tumblers?|wine glass(es)?|champagne flutes?|vase)\b/i },
  { tag: COLLECTION_TAG.homeware,
    types: ['chopping board','mug','teapot','coaster','tray','frame','throw','cushion','bowl','plate','jug','lamp'],
    tags: ['homeware','xmas homeware','kitchen'],
    titles: /\b(mugs?|bowls?|(serving|chopping|cheese) ?boards?|lamp|bookends?|money tin|frame|coasters?|tray|jug|teapot|plates?|cushion|throw|blanket|ornament|decoration|bottle opener|corkscrew|tea light|apron|tea towel|door ?stop|clock|planter)\b/i },
  { tag: COLLECTION_TAG.cards,
    types: ['greeting card','card','journal','notebook','book','sign','plaque','print'],
    tags: ['greeting cards','greeting card','birthday cards','other card','age cards','as gaeilge'],
    titles: /\b(cards?|journal|notebook|notecards?|sign|plaque|print|bookmark|book light)\b/i },
  { tag: COLLECTION_TAG.food,
    types: ['jam','crisps','biscuits','coffee','tea','oil','rapeseed oil','salt','chutney','sauce','honey','granola','relish','mineral','shortbread','crackers','pasta','porridge','biscuit'],
    tags: ['all food','food','xmas food','gluten-free food','jams & chutneys','condiment essentials','gifts for foodies','crisps & crackers'],
    titles: /\b(sauce|balsamics?|ketchup|kimchi|soda|mayo(nnaise)?|dressing|jam|marmalade|chutney|relish|granola|biscuits?|crackers?|shortbread|coffee|tea|oil|honey|porridge|crisps|popcorn|pesto|sauerkraut|tapenade|mustard|vinegar|syrup|olives?|nuts|fudge)\b/i },
]

function shelfFor(type, tags, title) {
  const t = lower(type)
  const set = new Set(tags.map(lower))
  for (const s of SHELVES) { if (s.types.includes(t)) return s.tag; if (s.tags.some((x) => set.has(x))) return s.tag }
  for (const s of SHELVES) if (s.titles.test(title)) return s.tag
  return null
}

// --- helpers ---------------------------------------------------------------

const lower = (s) => (s || '').trim().toLowerCase()
const tagList = (raw) => (raw || '').split(',').map((t) => t.trim()).filter(Boolean)

function isWineish(type, tags, title) {
  const t = lower(type)
  if (t === 'wine' || t === 'champagne') return true
  if (/\bwine\b/.test(t)) return true // "ITALIAN WHITE WINE" and friends
  if (t) return false
  if (!tags.some((x) => WINE_TAG_SIGNALS.has(lower(x)))) return false
  return !NOT_A_BOTTLE.test(title)
}
function grapesOf(tags, title, type) {
  const found = new Set()
  const hay = `${tags.join(' ')} ${title} ${type}`
  for (const g of GRAPES) {
    if (new RegExp(`\\b${g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(hay)) {
      found.add(g === 'Albarino' ? 'Albariño' : g)
    }
  }
  return [...found]
}
function regionOf(tags, title, type) {
  const hay = `${tags.join(' ')} ${title} ${type}`
  for (const r of REGIONS) if (new RegExp(`\\b${r}\\b`, 'i').test(hay)) return r
  return null
}
function countryOf(tags, type, region) {
  for (const t of [...tags, type]) { const hit = COUNTRIES[lower(t)]; if (hit) return hit }
  // "ITALIAN WHITE WINE" as a Type: read the demonym out of it.
  for (const [key, country] of Object.entries(COUNTRIES)) {
    const word = key.split(' ')[0]
    if (new RegExp(`\\b${word}\\b`, 'i').test(type)) return country
  }
  return region ? (REGION_COUNTRY[region] ?? null) : null
}
function styleOf(tags, title, type, grapes) {
  const set = new Set(tags.map(lower))
  for (const rule of STYLE_RULES) {
    if (rule.tags.some((t) => set.has(t))) return rule.tag
    if (rule.titles.some((re) => re.test(title))) return rule.tag
    if (rule.titles.some((re) => re.test(type))) return rule.tag
  }
  for (const g of grapes) if (GRAPE_COLOUR[g]) return GRAPE_COLOUR[g]
  return null
}
function priceTag(price) {
  const p = Number.parseFloat(price)
  if (!Number.isFinite(p)) return null
  if (p < 50) return 'price:under-50'
  if (p < 100) return 'price:50-100'
  if (p < 150) return 'price:100-150'
  return 'price:150-plus'
}
function csvEscape(v) {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// --- run -------------------------------------------------------------------

const args = process.argv.slice(2)
const input = args[args.indexOf('--input') + 1]
const outdir = args.includes('--outdir') ? args[args.indexOf('--outdir') + 1] : 'data/shopify-import'
if (!input) { console.error('Usage: retag-export.mjs --input <export.csv> [--outdir <dir>]'); process.exit(1) }
mkdirSync(outdir, { recursive: true })

const headerLine = readFileSync(input, 'utf8').split(/\r?\n/)[0]
const headers = []
{ // parse the header line with the same quoting rules
  let cur = '', inQ = false
  for (let i = 0; i < headerLine.length; i += 1) {
    const c = headerLine[i]
    if (inQ) { if (c === '"' && headerLine[i + 1] === '"') { cur += '"'; i += 1 } else if (c === '"') inQ = false; else cur += c }
    else if (c === '"') inQ = true
    else if (c === ',') { headers.push(cur); cur = '' }
    else cur += c
  }
  headers.push(cur)
}

const rows = await readCsv(input)
const byHandle = new Map()
for (const r of rows) { const h = r.Handle; if (!h) continue; if (!byHandle.has(h)) byHandle.set(h, []); byHandle.get(h).push(r) }

/**
 * Ground truth for the two groups the export cannot describe itself.
 *
 * The 20 live hampers carry no product type and no tags at all: the
 * merchant keeps them in a collection by hand and the export shows an
 * empty row. Classifying from the file alone tagged 46 retired drafts as
 * the hamper range and missed all 20, which would have emptied the
 * hamper collection the moment it was automated.
 *
 * data/catalogue/*.json is the client's own export as read by the site,
 * so it is the authority on which handles are hampers and which are
 * bottles. Both lists are checked first, before anything is inferred.
 */
const KNOWN_HAMPERS = new Set(
  (await import('../../data/catalogue/hampers.json', { with: { type: 'json' } })).default.products.map((p) => p.handle),
)
const KNOWN_WINES = new Set(
  (await import('../../data/catalogue/wines.json', { with: { type: 'json' } })).default.products.map((p) => p.handle),
)

/**
 * Vendor as a last resort for a product with no type, tags or usable
 * title. Read from the data rather than guessed: a vendor whose
 * classifiable products land overwhelmingly on one shelf puts its
 * unclassifiable ones there too. Tipperary Crystal sells homeware, Card
 * Boutique sells cards, and 528 products in this export say nothing at
 * all about themselves.
 */
const vendorShelfTally = new Map()
for (const [, group] of byHandle) {
  const head = group.find((r) => (r.Title || '').trim()) || group[0]
  const vendor = (head.Vendor || '').trim()
  if (!vendor) continue
  const shelf = shelfFor((head.Type || '').trim(), tagList(head.Tags), (head.Title || '').trim())
  if (!shelf) continue
  if (!vendorShelfTally.has(vendor)) vendorShelfTally.set(vendor, new Map())
  const t = vendorShelfTally.get(vendor)
  t.set(shelf, (t.get(shelf) || 0) + 1)
}
const VENDOR_SHELF = new Map()
for (const [vendor, tally] of vendorShelfTally) {
  const total = [...tally.values()].reduce((a, b) => a + b, 0)
  const [top, n] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]
  // Three or more classified products and at least 70% agreement.
  if (total >= 3 && n / total >= 0.7) VENDOR_SHELF.set(vendor, top)
}

const audit = []
const review = []
const collectionCounts = new Map()
let changed = 0
let unplaced = 0

for (const [handle, group] of byHandle) {
  const head = group.find((r) => (r.Title || '').trim()) || group[0]
  const title = (head.Title || '').trim()
  const type = (head.Type || '').trim()
  const original = tagList(head.Tags)
  const set = new Set(original)           // every original tag is kept
  const lowerSet = new Set(original.map(lower))
  const price = group.map((r) => r['Variant Price']).find((p) => p && p.trim())
  const notes = []
  let classification
  let section
  let needsReview = false
  let ambiguity = ''
  let confidence = 'high'

  const isGiftCard = lower(head['Gift Card']) === 'true'
  const isMechanism = HIDDEN_HANDLES.has(handle) || type === 'GIST_BUILDER_PRODUCT'
  const isHamper = KNOWN_HAMPERS.has(handle) || /hamper/i.test(type) || lowerSet.has('all hampers') || lowerSet.has('hampers')
  const wineish = KNOWN_WINES.has(handle) || isWineish(type, original, title)
  const spiritTitle = SPIRITY.test(title) && !NOT_A_BOTTLE.test(title)
  const isSpirit = spiritTitle && !/\b(wine|champagne|prosecco|port|sherry)\b/i.test(title)

  if (isGiftCard) {
    classification = 'Gift card'; section = 'Checkout only'
    notes.push('Left untouched: Shopify handles gift cards specially.')
  } else if (isMechanism) {
    classification = 'Build a Box mechanism'; section = '/build-your-own-hamper'
    notes.push('Left untouched: excluded everywhere by handle and by the GIST_BUILDER_PRODUCT type.')
  } else if (isHamper) {
    classification = 'Hamper'; section = '/hampers and /occasions/christmas'
    set.add('type:hamper'); set.add(COLLECTION_TAG.hampers)
    notes.push('Added type:hamper and the All Hampers collection tag.')
  } else if (isSpirit) {
    classification = 'Spirit'; section = '/wine'
    set.add('type:spirit'); set.add('contains:alcohol'); set.add(COLLECTION_TAG.fineWines)
    notes.push('Added type:spirit, contains:alcohol and the Fine Wines collection tag.')
  } else if (wineish) {
    classification = 'Wine'; section = '/wine'
    set.add('type:wine'); set.add('contains:alcohol'); set.add(COLLECTION_TAG.fineWines)
    notes.push('Added type:wine, contains:alcohol and the Fine Wines collection tag.')
    const grapes = grapesOf(original, title, type)
    const region = regionOf(original, title, type)
    const country = countryOf(original, type, region)
    const style = styleOf(original, title, type, grapes)
    // Only add a filter tag when the site cannot already read one.
    if (country && !original.some((t) => COUNTRIES[lower(t)])) {
      set.add(COUNTRY_TAG[country]); notes.push(`Added "${COUNTRY_TAG[country]}" so the Country filter can read it.`)
    }
    if (region && !lowerSet.has(lower(region))) {
      set.add(region); notes.push(`Added "${region}" for the Region filter.`)
    }
    for (const g of grapes) if (!lowerSet.has(lower(g)) && !lowerSet.has(`${lower(g)} wine`)) {
      set.add(g); notes.push(`Added "${g}" for the Grape filter.`)
    }
    const styleTag = style ?? null
    if (styleTag && !STYLE_RULES.some((r) => r.tags.some((t) => lowerSet.has(t)))) {
      set.add(styleTag); notes.push(`Added "${styleTag}" as the colour/style.`)
    }
    // The colour/style tag is also the sub-collection tag, so a red lands
    // on /wine/red and a Champagne on /wine/champagne-sparkling.
    const subs = { 'Red Wine': COLLECTION_TAG.red, 'White Wine': COLLECTION_TAG.white,
      'Rosé Wine': COLLECTION_TAG.rose, Champagne: COLLECTION_TAG.sparkling,
      Sparkling: COLLECTION_TAG.sparkling, Port: COLLECTION_TAG.portSherry,
      Sherry: COLLECTION_TAG.portSherry, 'Wine Gift Set': COLLECTION_TAG.wineGiftSets }
    const effectiveStyle = styleTag ?? STYLE_RULES.find((r) => r.tags.some((t) => lowerSet.has(t)))?.tag ?? null
    if (effectiveStyle && subs[effectiveStyle]) {
      set.add(subs[effectiveStyle]); notes.push(`Added the ${subs[effectiveStyle]} collection tag.`)
    }
    if (lowerSet.has('organic')) set.add(COLLECTION_TAG.organic)
    if (/\b(alcohol[- ]?free|non[- ]?alcoholic|0%|zero)\b/i.test(title)) set.add(COLLECTION_TAG.nonAlcoholic)
    if (!country) { needsReview = true; confidence = 'medium'; ambiguity = 'No country identifiable from tags or type.' }
    if (!effectiveStyle) { needsReview = true; confidence = 'medium'; ambiguity += (ambiguity ? ' ' : '') + 'No colour or style identifiable, so it lands in Fine Wines but on no colour listing.' }
  } else {
    // Everything that is not a hamper or a bottle. It is not a standalone
    // shopping category, so it goes to the Build a Box shelves: All Gifts
    // (the Everything shelf) plus its own shelf.
    const fromData = shelfFor(type, original, title)
    const fromVendor = fromData ? null : VENDOR_SHELF.get((head.Vendor || '').trim()) ?? null
    const shelf = fromData ?? fromVendor
    set.add(COLLECTION_TAG.allGifts)
    if (shelf) set.add(shelf)
    if (fromVendor) notes.push(`Shelf read from the vendor: ${(head.Vendor || '').trim()} products are overwhelmingly ${fromVendor}.`)
    const isAddon = original.some((t) => ADDON_TAGS.has(lower(t))) ||
      shelf === COLLECTION_TAG.candles || shelf === COLLECTION_TAG.chocolate || shelf === COLLECTION_TAG.crystal
    if (isAddon) {
      classification = 'Add-on gift'; section = '/gifts and Build a Box'
      set.add('type:addon')
      notes.push(`Added type:addon and the ${shelf ?? 'All Gifts'} collection tag: one of the three add-on listings that survive under /gifts.`)
    } else {
      classification = 'Build a Box item'; section = 'Build a Box'
      notes.push(`Added the All Gifts${shelf ? ` and ${shelf}` : ''} collection tag. No type: tag: type:builder-item would remove it from the picker.`)
    }
    if (!shelf) {
      needsReview = true; confidence = 'low'
      ambiguity = 'No shelf identifiable from type, tags or title, so it reaches Build a Box only through the Everything shelf.'
    }
  }

  // Alcohol that is not wine or a spirit: beer, cider, cream liqueurs.
  if (!isGiftCard && !isMechanism && classification !== 'Wine' && classification !== 'Spirit') {
    if (ALCOHOLIC.test(title) && !ALCOHOL_FALSE_FRIENDS.test(title)) {
      set.add('contains:alcohol'); notes.push('Added contains:alcohol so the age gate arms in Build a Box.')
    }
  }
  // Occasion and recipient facets, from the old vocabulary.
  if (!isGiftCard && !isMechanism) {
    for (const t of original) {
      const o = OCCASION_MAP[lower(t)]; if (o && !set.has(o)) { set.add(o); notes.push(`Mapped "${t}" to ${o}.`) }
      const r = RECIPIENT_MAP[lower(t)]; if (r && !set.has(r)) { set.add(r); notes.push(`Mapped "${t}" to ${r}.`) }
    }
    const p = priceTag(price)
    if (p && !original.some((t) => t.startsWith('price:'))) { set.add(p); notes.push(`Added ${p} from the variant price.`) }
  }

  const updated = [...set]
  const newTags = updated.join(', ')
  if (newTags !== (head.Tags || '')) { head.__newTags = newTags; changed += 1 }

  const targetCollections = updated
    .filter((t) => COLLECTION_HANDLE[t])
    .map((t) => COLLECTION_HANDLE[t])
  for (const c of targetCollections) collectionCounts.set(c, (collectionCounts.get(c) || 0) + 1)
  if (targetCollections.length === 0 && !isGiftCard && !isMechanism) unplaced += 1

  audit.push({
    Handle: handle, Title: title, 'Original tags': original.join(', '), 'Updated tags': newTags,
    Classification: classification, 'Website section': section,
    'Target collections': targetCollections.join(', ') || 'none',
    'Changes made': updated.filter((t) => !original.includes(t)).join(', ') || 'None',
    'Reason': notes.join(' '), 'Confidence': confidence,
    'Manual review required': needsReview ? 'Yes' : 'No',
  })
  if (needsReview) {
    review.push({
      Handle: handle, Title: title, 'Current tags': original.join(', '),
      Ambiguity: ambiguity,
      'Decision required': classification === 'Wine'
        ? 'Confirm the colour/style and country so the wine filters can show it, then add the tag in Shopify.'
        : 'Confirm whether this is still sold, and if so which Build a Box shelf collection it belongs in.',
    })
  }
}

// --- write ------------------------------------------------------------------

const out = [headers.map(csvEscape).join(',')]
let written = 0
// In this export the Tags cell is only ever populated on a product's first
// row; 628 products carry none at all. __newTags is set on that first row
// and nowhere else, so writing it wherever it exists keeps the shape the
// export already has and still reaches a product that started untagged.
for (const r of rows) {
  const tags = r.__newTags !== undefined ? r.__newTags : r.Tags || ''
  out.push(headers.map((h) => csvEscape(h === 'Tags' ? tags : r[h])).join(','))
  written += 1
}
writeFileSync(join(outdir, 'shopify-products-ready-for-import.csv'), out.join('\n') + '\n')

function writeCsv(name, list, cols) {
  const lines = [cols.map(csvEscape).join(',')]
  for (const row of list) lines.push(cols.map((c) => csvEscape(row[c])).join(','))
  writeFileSync(join(outdir, name), lines.join('\n') + '\n')
}
writeCsv('product-tagging-audit.csv', audit,
  ['Handle','Title','Original tags','Updated tags','Classification','Website section','Target collections','Changes made','Reason','Confidence','Manual review required'])
writeCsv('manual-review-required.csv', review,
  ['Handle','Title','Current tags','Ambiguity','Decision required'])

// The Shopify admin job the CSV cannot do: each collection switched to
// automated on the one tag the import applies.
const SITE_USE = {
  'christmas-2026': '/hampers, its four price bands, /occasions/christmas and the homepage band',
  'fine-wines-1': '/wine, /wine/fine-wines, the three wine price bands and the Build a Box wine shelf',
  'red-wines-1': '/wine/red', 'white-wines-1': '/wine/white', rose: '/wine/rose',
  'champagne-and-prosecco-1': '/wine/champagne-sparkling and the Build a Box sparkling shelf',
  'port-and-sherry-1': '/wine/port-dessert', 'organic-wine': '/wine/organic-biodynamic',
  'non-alcoholic-1': '/wine/alcohol-free', 'wine-gift-sets': '/wine/gift-sets',
  'all-gifts': 'the Build a Box Everything shelf. Not a shopper-facing listing: Gifts by budget was retired in September 2026',
  'all-food': 'the Build a Box food shelf',
  'chocolate-confectionery-1': '/gifts/chocolate-treats and the Build a Box chocolate shelf',
  'candles-diffusers': '/gifts/candles-diffusers and the Build a Box candles shelf',
  'glassware-crystal': '/gifts/crystal-glassware', beauty: 'the Build a Box beauty shelf',
  homeware: 'the Build a Box homeware shelf', baby: 'the Build a Box baby shelf',
  jewellery: 'the Build a Box jewellery shelf', 'greeting-cards': 'the Build a Box cards shelf',
}
writeCsv('collections-to-automate.csv',
  Object.entries(COLLECTION_HANDLE).map(([tag, h]) => ({
    'Collection handle': h,
    'Condition to set': `Product tag is equal to ${tag}`,
    'Products this import tags': collectionCounts.get(h) || 0,
    'What it feeds on the site': SITE_USE[h] || '',
  })),
  ['Collection handle','Condition to set','Products this import tags','What it feeds on the site'])

const counts = {}
for (const a of audit) counts[a.Classification] = (counts[a.Classification] || 0) + 1
console.log(`rows in ${rows.length}, rows out ${written}`)
console.log(`products ${byHandle.size}, tag strings changed ${changed}, flagged for review ${review.length}`)
console.log('classification:', Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '))
console.log('products reaching no collection:', unplaced)
console.log('collection placements:', [...collectionCounts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(', '))
