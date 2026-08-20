#!/usr/bin/env node
/**
 * Turns the full Shopify products export into the builder's catalogue.
 *
 * The strategy decision this implements: THE MAIN SITE SELLS HAMPERS AND
 * WINE. EVERYTHING ELSE THE SHOP CARRIES IS SOLD ONLY AS A THING YOU PUT
 * IN A HAMPER. So every published product in the export that is not
 * already on the site comes through here tagged `type:builder-item`,
 * which the commerce layer keeps out of listings, search, the sitemap and
 * product URLs. The only place a builder item can be seen or bought is
 * inside /build-your-own-hamper.
 *
 * What gets excluded, and why:
 *   - products already in the wine catalogue (they are buyable on the
 *     main site, and the builder offers them from there);
 *   - hampers (a hamper does not go inside a hamper);
 *   - gift cards (Shopify treats them specially at checkout);
 *   - anything unpublished, without a price, or without a photograph. A
 *     picker made of grey squares is worse than a shorter list.
 *
 * Each item is put in exactly one aisle, decided from the shop's own tags
 * and product types. Nothing is renamed and no copy is invented: builder
 * items are picked from a card showing the shop's own photo, title and
 * price.
 *
 * Usage:
 *   node scripts/catalogue/import-builder-items.mjs \
 *     --input /path/to/products_export_1.csv \
 *     [--output data/catalogue/builder-items.json] \
 *     [--exclude data/catalogue/wines.json]
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readCsv } from './csv.mjs'

// ---------------------------------------------------------------------------
// Aisles. First match wins, so the order is a priority order: a chocolate
// tagged both "Chocolate & Confectionery" and "All Food" is chocolate.
// The vocabulary is read off the real export, typos included ("deodrant").
// ---------------------------------------------------------------------------

const AISLES = [
  {
    id: 'chocolate-sweets',
    label: 'Chocolate and sweet things',
    types: ['chocolate', 'chocolate bar', 'nougat', 'jellies', 'popcorn', 'fudge', 'sweets', 'marshmallow', 'toffee'],
    tags: ['chocolate & confectionery'],
    titles: /\b(chocolates?|choc\b|easter egg|fudge|honeycomb|truffles?|toffee|caramels?|liquorice|marshmallows?|nougat|sweets|bonbons?|praline)\b/i,
  },
  {
    id: 'food-larder',
    label: 'Food and larder',
    types: ['jam', 'crisps', 'biscuits', 'coffee', 'tea', 'oil', 'rapeseed oil', 'salt', 'chutney', 'sauce', 'honey', 'granola', 'relish', 'mineral', 'shortbread', 'crackers', 'pasta', 'porridge'],
    tags: ['all food', 'food', 'xmas food', 'gluten-free food', 'jams & chutneys', 'condiment essentials', 'gifts for foodies'],
    titles: /\b(sauce|balsamics?|ketchup|kimchi|soda|mayo(nnaise)?|dressing|jam|marmalade|chutney|relish|granola|biscuits?|crackers?|shortbread|coffee|oil|honey|porridge|crisps|popcorn|pesto|sauerkraut|tapenade|mustard|vinegar|syrup|olives?|nuts)\b/i,
  },
  {
    id: 'candles-fragrance',
    label: 'Candles and home fragrance',
    types: ['candle', 'candles', 'diffuser', 'wax melt', 'room spray'],
    tags: ['candles & diffusers'],
    titles: /\b(candles?|diffusers?|wax melts?|room spray|incense)\b/i,
  },
  {
    id: 'beauty-bath',
    label: 'Beauty and bath',
    types: ['soap', 'shampoo', 'deodrant', 'deodorant', 'bath salt', 'bodycare', 'moisturiser', 'lip balm', 'hand cream', 'perfume'],
    tags: ['beauty', 'skincare', 'bath and body'],
    titles: /\b(soap|shampoo|conditioner|body ?(wash|lotion|butter|cream)|moisturis|lip balm|hand cream|bath (salts?|bomb|soak)|sea sponge|face (mask|cream)|serum|cleanser|perfume|eau de)\b/i,
  },
  {
    id: 'baby-kids',
    label: 'Baby and children',
    types: ['teddy', 'toy', 'babygrow', 'sleepsuit'],
    tags: ['gifts for baby', 'baby', 'gifts for children'],
    titles: /\b(teddy|babygrow|sleepsuit|romper|rattle|twinkle twinkle|jellycat)\b/i,
  },
  {
    id: 'jewellery-accessories',
    label: 'Jewellery and accessories',
    types: ['earrings', 'necklace', 'bracelet', 'brooch', 'socks', 'scarf', 'wallet', 'pen'],
    tags: ['jewellery', 'earrings'],
    titles: /\b(pendant|earrings?|necklace|bracelet|bangle|brooch|cufflinks?|scarf|wallet|socks?|rollerball|fountain pen|ballpoint|keyring|umbrella|gloves|beanie|cap)\b/i,
  },
  {
    id: 'homeware-kitchen',
    label: 'Homeware and kitchen',
    types: ['chopping board', 'mug', 'teapot', 'glasses', 'tumbler', 'coaster', 'tray', 'vase', 'frame', 'throw', 'cushion', 'bowl', 'plate', 'jug', 'lamp'],
    tags: ['homeware', 'xmas homeware', 'kitchen', 'crystal'],
    titles: /\b(mugs?|bowls?|(serving|chopping|cheese) ?boards?|lamp|bookends?|money tin|frame|vase|tumblers?|glass(es)?|coasters?|tray|jug|teapot|plates?|cushion|throw|blanket|ornament|decoration|bottle opener|corkscrew|tea light|apron|tea towel|door ?stop|clock|planter)\b/i,
  },
  {
    id: 'cards-stationery',
    label: 'Cards and stationery',
    types: ['greeting card', 'card', 'journal', 'notebook', 'book', 'sign', 'plaque', 'print'],
    tags: ['greeting cards', 'greeting card', 'birthday cards', 'other card', 'age cards', 'as gaeilge'],
    titles: /\b(cards?|journal|notebook|notecards?|sign|plaque|print|bookmark|book light)\b/i,
  },
]

const FALLBACK_AISLE = { id: 'everything-else', label: 'Everything else' }

/**
 * Bottles the wine importer could not see. A tranche of the export's wines
 * carry no Type and no tags at all, so they failed the wine importer's
 * tag-signal test and are not on the main site. In the builder they are
 * still wine, and they belong on the shelf next to the rest of it.
 */
const WINEISH_TITLE = /\b(cabernet|sauvignon|merlot|pinot|chardonnay|malbec|rioja|medoc|m[eé]doc|bordeaux|chianti|shiraz|syrah|tempranillo|albari[nñ]o|alvarinho|verdejo|prosecco|champagne|cava|chateau|ch[aâ]teau|vinho|barolo|barbera|grenache|garnacha|viognier|riesling|zinfandel|montepulciano|primitivo|sangiovese|nero d)\b/i

const WINE_AISLE = { id: 'wine-cellar-extras', label: 'More from the cellar' }

function aisleOf(type, tags, title) {
  const t = type.toLowerCase()
  const set = new Set(tags.map((x) => x.toLowerCase()))
  // Type and tag first: the shop's own words beat a title guess.
  for (const aisle of AISLES) {
    if (aisle.types.includes(t)) return aisle
    if (aisle.tags.some((tag) => set.has(tag))) return aisle
  }
  if (WINEISH_TITLE.test(title)) return WINE_AISLE
  for (const aisle of AISLES) {
    if (aisle.titles.test(title)) return aisle
  }
  return FALLBACK_AISLE
}

/**
 * Alcohol that slipped past the wine importer: beer, cider, cream
 * liqueurs sold as food gifts. Anything matching arms the age gate when
 * it goes in a box.
 */
const ALCOHOLIC = /\b(beer|ale|stout|lager|cider|liqueur|baileys|whiskey|whisky|gin|vodka|rum|brandy|poitin|poitín|mead)\b/i
const ALCOHOL_FALSE_FRIENDS = /\b(chocolates?|truffles?|fudge|sauce|cake|candle|soap|glass|glasses|tumbler|card|flavoured tea)\b/i

// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    input: '',
    output: 'data/catalogue/builder-items.json',
    exclude: 'data/catalogue/wines.json,data/catalogue/hampers.json,data/catalogue/mechanisms.json',
  }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--input' || argv[i] === '-i') args.input = argv[++i] ?? ''
    else if (argv[i] === '--output' || argv[i] === '-o') args.output = argv[++i] ?? args.output
    else if (argv[i] === '--exclude' || argv[i] === '-x') args.exclude = argv[++i] ?? args.exclude
  }
  if (!args.input) {
    console.error('Usage: import-builder-items.mjs --input <export.csv> [--output <file.json>] [--exclude <a.json,b.json>]')
    process.exit(1)
  }
  return args
}

function tagList(raw) {
  return (raw || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

const args = parseArgs(process.argv.slice(2))
const rows = await readCsv(args.input)

// Handles already on the main site are not builder items: the builder
// offers the wine list from the live catalogue, so importing wine twice
// would put two copies of the same bottle in the picker.
const excluded = new Set(
  args.exclude
    .split(',')
    .flatMap((file) =>
      JSON.parse(readFileSync(join(process.cwd(), file.trim()), 'utf8')).products.map(
        (p) => p.handle,
      ),
    ),
)

const byHandle = new Map()
for (const row of rows) {
  const handle = row.Handle
  if (!handle) continue
  if (!byHandle.has(handle)) byHandle.set(handle, [])
  byHandle.get(handle).push(row)
}

const products = []
const skipped = { unpublished: 0, onMainSite: 0, hamper: 0, giftCard: 0, noPrice: 0, noImage: 0 }
const aisleCounts = new Map()

for (const [handle, group] of byHandle) {
  const head = group.find((r) => (r.Title || '').trim())
  if (!head) continue

  if (head.Published !== 'true') { skipped.unpublished += 1; continue }
  if (excluded.has(handle)) { skipped.onMainSite += 1; continue }

  const title = head.Title.trim()
  const type = (head.Type || '').trim()
  const tags = tagList(head.Tags)
  const lowerTags = tags.map((t) => t.toLowerCase())

  if (/^hamper$/i.test(type) || lowerTags.includes('hampers')) { skipped.hamper += 1; continue }
  if (/gift ?card/i.test(type) || /\bgift card\b/i.test(title)) { skipped.giftCard += 1; continue }

  const variants = group
    .filter((r) => (r['Variant SKU'] || '').trim() || (r['Variant Price'] || '').trim())
    .map((r) => {
      const price = Number(r['Variant Price'])
      if (!Number.isFinite(price) || price <= 0) return null
      const qtyRaw = (r['Variant Inventory Qty'] || '').trim()
      const tracked = (r['Variant Inventory Tracker'] || '').trim() !== ''
      const optionValue = (r['Option1 Value'] || 'Default Title').trim() || 'Default Title'
      return {
        sku: (r['Variant SKU'] || '').trim() || `TPC-BI-${handle.toUpperCase().replace(/-/g, '').slice(0, 22)}`,
        title: optionValue,
        price: price.toFixed(2),
        inventoryQuantity: tracked ? Number(qtyRaw || 0) : null,
      }
    })
    .filter(Boolean)

  if (!variants.length) { skipped.noPrice += 1; continue }

  const images = group
    .filter((r) => (r['Image Src'] || '').trim())
    .sort((a, b) => Number(a['Image Position'] || 0) - Number(b['Image Position'] || 0))
    .map((r) => ({
      src: r['Image Src'].trim(),
      // The export carries almost no alt text. The photo on a picker card
      // shows the product itself, so the title is the honest description.
      alt: (r['Image Alt Text'] || '').trim() || title,
      width: 1200,
      height: 1200,
    }))

  if (!images.length) { skipped.noImage += 1; continue }

  const aisle = aisleOf(type, tags, title)
  aisleCounts.set(aisle.id, (aisleCounts.get(aisle.id) ?? 0) + 1)

  const looksAlcoholic = ALCOHOLIC.test(title) && !ALCOHOL_FALSE_FRIENDS.test(title)

  const productTags = ['type:builder-item', `aisle:${aisle.id}`]
  if (looksAlcoholic) productTags.push('contains:alcohol')

  products.push({
    handle,
    title,
    descriptionHtml: (head['Body (HTML)'] || '').trim(),
    productType: type || 'Gift',
    vendor: (head.Vendor || '').trim() || 'The Parcel Concierge',
    tags: productTags,
    images,
    variants,
  })
}

products.sort((a, b) => a.handle.localeCompare(b.handle))

const catalogue = {
  source: `Shopify export, builder items, imported ${new Date().toISOString().slice(0, 10)}`,
  currencyCode: 'EUR',
  products,
}

const outPath = join(process.cwd(), args.output)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(catalogue, null, 2) + '\n')

console.log(`Wrote ${products.length} builder items to ${args.output}`)
console.log('Skipped:', skipped)
console.log('Aisles:')
for (const aisle of [...AISLES, WINE_AISLE, FALLBACK_AISLE]) {
  console.log(`  ${String(aisleCounts.get(aisle.id) ?? 0).padStart(5)}  ${aisle.label}`)
}
