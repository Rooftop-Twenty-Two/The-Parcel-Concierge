#!/usr/bin/env node
/**
 * Turns a Shopify products export CSV into the catalogue interchange
 * format, for wine and spirits.
 *
 * The export is the real catalogue: 3,040 products, of which about 420 are
 * published wines. It carries far more than the CSV columns suggest,
 * because the tag field has been used for country, grape, style, occasion
 * and merchandising all at once. This script reads that vocabulary and
 * turns it into structured wine.* metafields, so the front end can filter
 * on grape and country properly instead of matching strings.
 *
 * What it will not do is invent anything. Where the export has no
 * description, the product comes through with an empty description and is
 * flagged, rather than having a tasting note written for it. Where it has
 * no alt text, and none of the 421 wines has any, the alt text is built
 * from the title and the bottle, which is true and useful, rather than
 * from a guess about what the label looks like.
 *
 * Usage:
 *   node scripts/catalogue/import-shopify-export.mjs \
 *     --input /path/to/products_export_1.csv \
 *     --output data/catalogue/wines.json
 */

import { createReadStream, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// ---------------------------------------------------------------------------
// Tag vocabulary, read off the real export.
// ---------------------------------------------------------------------------

/** "French Wines" and friends. The export is inconsistent about the plural. */
const COUNTRIES = {
  'french wine': 'France',
  'french wines': 'France',
  'spanish wine': 'Spain',
  'spanish wines': 'Spain',
  'italian wine': 'Italy',
  'italian wines': 'Italy',
  'argentinian wines': 'Argentina',
  'argentinian wine': 'Argentina',
  'new zealand wines': 'New Zealand',
  'new zealand wine': 'New Zealand',
  'portuguese wines': 'Portugal',
  'portuguese wine': 'Portugal',
  'south african wines': 'South Africa',
  'south african wine': 'South Africa',
  'australian wines': 'Australia',
  'australian wine': 'Australia',
  'chilean wines': 'Chile',
  'chilean wine': 'Chile',
  'german wines': 'Germany',
  'german wine': 'Germany',
  'american wines': 'United States',
  'californian wines': 'United States',
  'austrian wines': 'Austria',
  'greek wines': 'Greece',
  'irish wines': 'Ireland',
  'english wines': 'England',
  'hungarian wines': 'Hungary',
  'lebanese wines': 'Lebanon',
}

/** Grape tags. The export suffixes some with "Wine" and not others. */
const GRAPES = [
  'Malbec', 'Sauvignon Blanc', 'Chardonnay', 'Pinot Noir', 'Pinot Grigio',
  'Tempranillo', 'Albarino', 'Albariño', 'Montepulciano', 'Verdejo', 'Shiraz',
  'Syrah', 'Chenin Blanc', 'Cabernet Sauvignon', 'Riesling', 'Primitivo',
  'Garnacha', 'Grenache', 'Merlot', 'Nebbiolo', 'Sangiovese', 'Viognier',
  'Zinfandel', 'Gewurztraminer', 'Glera', 'Macabeo', 'Xarel-lo', 'Mourvedre',
  'Carmenere', 'Nero d’Avola', 'Vermentino', 'Grillo', 'Barbera',
  'Touriga Nacional', 'Petit Verdot', 'Semillon', 'Muscat', 'Cortese',
]

/** Regions worth keeping as a facet. */
const REGIONS = [
  'Bordeaux', 'Rioja', 'Douro', 'Burgundy', 'Chablis', 'Beaujolais', 'Chianti',
  'Barolo', 'Rias Baixas', 'Marlborough', 'Mendoza', 'Tuscany', 'Piedmont',
  'Provence', 'Loire', 'Alsace', 'Champagne', 'Prosecco', 'Penedes', 'Mosel',
  'Ribera del Duero', 'Rueda', 'Priorat', 'Stellenbosch',
]

/**
 * A grape settles the colour when the export never tagged one. This is the
 * single biggest win on the real data: ninety-odd wines carry a grape and
 * no colour tag.
 */
const GRAPE_COLOUR = {
  Malbec: 'Red wine', Merlot: 'Red wine', 'Cabernet Sauvignon': 'Red wine',
  'Pinot Noir': 'Red wine', Tempranillo: 'Red wine', Syrah: 'Red wine',
  Shiraz: 'Red wine', Garnacha: 'Red wine', Grenache: 'Red wine',
  Nebbiolo: 'Red wine', Sangiovese: 'Red wine', Primitivo: 'Red wine',
  Montepulciano: 'Red wine', Zinfandel: 'Red wine', Carmenere: 'Red wine',
  Barbera: 'Red wine', 'Touriga Nacional': 'Red wine', 'Petit Verdot': 'Red wine',
  'Nero d’Avola': 'Red wine', Mourvedre: 'Red wine',
  'Sauvignon Blanc': 'White wine', Chardonnay: 'White wine',
  'Pinot Grigio': 'White wine', 'Albariño': 'White wine', Verdejo: 'White wine',
  Riesling: 'White wine', 'Chenin Blanc': 'White wine', Viognier: 'White wine',
  Gewurztraminer: 'White wine', Vermentino: 'White wine', Grillo: 'White wine',
  Semillon: 'White wine', Cortese: 'White wine', Macabeo: 'White wine',
  'Xarel-lo': 'White wine', Muscat: 'White wine',
  Glera: 'Sparkling wine',
}

/** A region settles the country. Two hundred wines have no country tag. */
const REGION_COUNTRY = {
  Bordeaux: 'France', Burgundy: 'France', Chablis: 'France', Beaujolais: 'France',
  Provence: 'France', Loire: 'France', Alsace: 'France', Champagne: 'France',
  Rioja: 'Spain', 'Ribera del Duero': 'Spain', Rueda: 'Spain', Priorat: 'Spain',
  Penedes: 'Spain', 'Rias Baixas': 'Spain',
  Douro: 'Portugal',
  Chianti: 'Italy', Barolo: 'Italy', Tuscany: 'Italy', Piedmont: 'Italy',
  Prosecco: 'Italy',
  Marlborough: 'New Zealand', Mendoza: 'Argentina',
  Stellenbosch: 'South Africa', Mosel: 'Germany',
}

/**
 * Style, decided in priority order: the first rule that matches wins.
 * Sparkling has to beat colour, because a rosé Champagne is tagged both.
 */
const STYLE_RULES = [
  { productType: 'Wine gift set', tags: ['wine gift sets', 'wine gift set'], titles: [/\b(gift (set|carton|box)|twin (gift )?carton|\d\s?bottle)\b/i] },
  { productType: 'Champagne', tags: ['champagne'], titles: [/\bchampagne\b/i] },
  { productType: 'Sparkling wine', tags: ['prosecco', 'champagne and prosecco', 'sparkling', 'rose sparkling', 'cava'], titles: [/\b(prosecco|cava|spumante|cr[eé]mant|sparkling)\b/i] },
  { productType: 'Port', tags: ['port'], titles: [/\bport\b/i] },
  { productType: 'Sherry', tags: ['sherry'], titles: [/\b(sherry|manzanilla|amontillado|oloroso|fino)\b/i] },
  { productType: 'Dessert wine', tags: ['dessert wine', 'sweet wine'], titles: [/\b(sauternes|tokaji|ice ?wine|moscatel)\b/i] },
  { productType: 'Rosé wine', tags: ['rose', 'rose wine', 'rosé wine'], titles: [/\bros[eé]\b/i] },
  { productType: 'White wine', tags: ['white wine', 'white wines'], titles: [] },
  { productType: 'Red wine', tags: ['red wine', 'red wines'], titles: [] },
]

/** Merchandising tags mapped onto the locked taxonomy. */
const OCCASION_TAGS = {
  christmas: 'occasion:christmas',
  'xmas wine': 'occasion:christmas',
  'xmas her': 'occasion:christmas',
  'xmas him': 'occasion:christmas',
  'xmas gift set': 'occasion:christmas',
  'xmas homeware': 'occasion:christmas',
  'gifts by anniversary': 'occasion:anniversary',
  'gifts by birthday': 'occasion:birthday',
  'birthday girl': 'occasion:birthday',
  'gifts for employees': 'occasion:corporate',
  'gifts for employees gifts for employees': 'occasion:corporate',
  'wedding': 'occasion:wedding',
}

const RECIPIENT_TAGS = {
  'gifts for her': 'recipient:her',
  'gifts for him': 'recipient:him',
  'gifts for men': 'recipient:him',
  'gifts for couples': 'recipient:couple',
  'gifts for families': 'recipient:family',
  'gifts for employees': 'recipient:client',
  'gifts for employees gifts for employees': 'recipient:client',
}

// ---------------------------------------------------------------------------
// CSV reading. Shopify exports embed newlines inside quoted description
// fields, so this cannot be split on lines.
// ---------------------------------------------------------------------------

async function readCsv(path) {
  const text = await new Promise((resolve, reject) => {
    let out = ''
    createReadStream(path, { encoding: 'utf8' })
      .on('data', (c) => (out += c))
      .on('end', () => resolve(out))
      .on('error', reject)
  })

  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1 } else { quoted = false }
      } else cell += ch
      continue
    }
    if (ch === '"') { quoted = true; continue }
    if (ch === ',') { row.push(cell); cell = ''; continue }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue }
    if (ch === '\r') continue
    cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }

  const header = rows.shift().map((h) => h.replace(/^﻿/, '').trim())
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

function tagList(raw) {
  return (raw || '').split(',').map((t) => t.trim()).filter(Boolean)
}

const SPIRITY = /\b(whiskey|whisky|gin|vodka|rum|tequila|brandy|cognac|liqueu?r|vermouth|poit[ií]n|schnapps|aperitif)\b/i

/**
 * Tags that actually mean "this is a bottle of wine".
 *
 * Matching on the title does not work. The catalogue is full of wine
 * glasses, wine carafes, wine coolers, wine bags, a "Wine Butler", a card
 * that says "Partners in Wine" and a chutney for wine and cheese. Every one
 * of those has "wine" in the title and none of them is wine. The tags are
 * the reliable signal, so that is what this reads.
 */
const WINE_TAG_SIGNALS = new Set([
  'red wine', 'red wines', 'white wine', 'white wines', 'rose wine', 'rosé wine',
  'rose', 'rose sparkling', 'champagne', 'champagne and prosecco', 'prosecco',
  'sparkling', 'cava', 'fine wines', 'fine wine', 'port', 'sherry',
  'dessert wine', 'sweet wine', 'wine gift sets', 'wine gift set',
  ...Object.keys(COUNTRIES),
  ...GRAPES.map((g) => g.toLowerCase()),
  ...GRAPES.map((g) => `${g.toLowerCase()} wine`),
])

/**
 * Titles that are wine adjacent rather than wine. Checked only on products
 * the tags let through, so it is a safety net rather than the main filter.
 */
const NOT_A_BOTTLE = /\b(card|candle|glass|glasses|tumbler|flute|bag|carafe|decanter|cooler|chiller|stopper|opener|corkscrew|pourer|aerator|preserver|thermometer|foil cutter|coaster|tray|lamp|wallet|butler|beaker|rules|apron|socks|book|sign|plaque|chutney|sauce|tool|rack|holder|charm|jigsaw|puzzle|sleeve)\b/i

function isWineish(head) {
  const type = (head.Type || '').trim().toLowerCase()
  if (type === 'wine' || type === 'champagne') return true
  // A product typed as something else is that something else.
  if (type) return false

  const tags = tagList(head.Tags).map((t) => t.toLowerCase())
  if (!tags.some((t) => WINE_TAG_SIGNALS.has(t))) return false
  return !NOT_A_BOTTLE.test(head.Title || '')
}

function styleOf(tags, title, grapes) {
  const lower = tags.map((t) => t.toLowerCase())
  for (const rule of STYLE_RULES) {
    if (rule.tags.some((t) => lower.includes(t))) return rule.productType
    if (rule.titles.some((re) => re.test(title))) return rule.productType
  }
  for (const grape of grapes) {
    if (GRAPE_COLOUR[grape]) return GRAPE_COLOUR[grape]
  }
  return null
}

function grapesOf(tags, title) {
  const found = new Set()
  const haystack = `${tags.join(' ')} ${title}`
  for (const grape of GRAPES) {
    const re = new RegExp(`\\b${grape.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (re.test(haystack)) found.add(grape === 'Albarino' ? 'Albariño' : grape)
  }
  return [...found]
}

function regionOf(tags, title) {
  const haystack = `${tags.join(' ')} ${title}`
  for (const region of REGIONS) {
    if (new RegExp(`\\b${region}\\b`, 'i').test(haystack)) return region
  }
  return undefined
}

function countryOf(tags, region) {
  for (const tag of tags) {
    const hit = COUNTRIES[tag.toLowerCase()]
    if (hit) return hit
  }
  if (region && REGION_COUNTRY[region]) return REGION_COUNTRY[region]
  return undefined
}

/** A four digit year in the title, within a plausible vintage window. */
function vintageOf(title) {
  const m = title.match(/\b(19[5-9]\d|20[0-4]\d)\b/)
  return m ? m[1] : undefined
}

/** "375ml", "75cl", "1.5L", "Magnum". */
function volumeOf(title) {
  const ml = title.match(/\b(\d{2,4})\s?ml\b/i)
  if (ml) return `${ml[1]}ml`
  const cl = title.match(/\b(\d{2,3})\s?cl\b/i)
  if (cl) return `${cl[1]}cl`
  const l = title.match(/\b(\d(?:\.\d)?)\s?L\b/)
  if (l) return `${l[1]}L`
  if (/\bmagnum\b/i.test(title)) return '150cl'
  if (/\bhalf bottle\b/i.test(title)) return '37.5cl'
  return undefined
}

/** Some products carry their ABV as a bare tag, e.g. "13.5%". */
function abvOf(tags) {
  for (const tag of tags) {
    const m = tag.match(/^(\d{1,2}(?:\.\d)?)\s?%$/)
    if (m) return Number(m[1])
  }
  return undefined
}

function priceTag(price) {
  if (price < 50) return 'price:under-50'
  if (price < 100) return 'price:50-100'
  if (price < 150) return 'price:100-150'
  return 'price:150-plus'
}

// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { input: '', output: 'data/catalogue/wines.json' }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--input' || argv[i] === '-i') args.input = argv[++i] ?? ''
    else if (argv[i] === '--output' || argv[i] === '-o') args.output = argv[++i] ?? args.output
  }
  if (!args.input) {
    console.error('Usage: import-shopify-export.mjs --input <export.csv> [--output <file.json>]')
    process.exit(1)
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const rows = await readCsv(args.input)

// Group the export's variant and image rows back into products.
const byHandle = new Map()
for (const row of rows) {
  const handle = row.Handle
  if (!handle) continue
  if (!byHandle.has(handle)) byHandle.set(handle, [])
  byHandle.get(handle).push(row)
}

const products = []
const skipped = { unpublished: 0, notWine: 0, noPrice: 0, noImage: 0 }
const flags = { noDescription: [], noStock: [], noStyle: [] }

for (const [handle, group] of byHandle) {
  const head = group.find((r) => (r.Title || '').trim())
  if (!head) continue

  if (head.Published !== 'true') { skipped.unpublished += 1; continue }

  const title = head.Title.trim()
  const tags = tagList(head.Tags)
  const wineish = isWineish(head)
  const spiritTitle = SPIRITY.test(title) && !NOT_A_BOTTLE.test(title)
  // A liqueur tagged "Fine Wines" is still a liqueur.
  const isSpirit = spiritTitle && !/\b(wine|champagne|prosecco|port|sherry)\b/i.test(title)
  if (!wineish && !isSpirit) { skipped.notWine += 1; continue }

  const variantRows = group.filter((r) => (r['Variant SKU'] || '').trim() || (r['Variant Price'] || '').trim())
  const variants = variantRows
    .map((r) => {
      const price = Number(r['Variant Price'])
      if (!Number.isFinite(price) || price <= 0) return null
      const qtyRaw = (r['Variant Inventory Qty'] || '').trim()
      const tracked = (r['Variant Inventory Tracker'] || '').trim() !== ''
      return {
        sku: (r['Variant SKU'] || '').trim() || `TPC-${handle.toUpperCase().replace(/-/g, '').slice(0, 24)}`,
        title: (r['Option1 Value'] || 'Default Title').trim() || 'Default Title',
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
      // Not one of the 421 wines carries alt text. Rather than leave it
      // empty, which the ingest validator rightly blocks, describe what the
      // shot is: a bottle. That is true of every one of them and it is what
      // a screen reader needs.
      alt: (r['Image Alt Text'] || '').trim() || `Bottle of ${title}`,
      width: 1200,
      height: 1200,
    }))

  if (!images.length) { skipped.noImage += 1; continue }

  const body = (head['Body (HTML)'] || '').trim()
  const plain = body.replace(/<[^>]+>/g, ' ')

  const grapes = grapesOf(tags, `${title} ${plain}`)
  const region = regionOf(tags, `${title} ${plain}`)
  const country = countryOf(tags, region)

  const style = styleOf(tags, title, grapes)
  if (!style) flags.noStyle.push(handle)

  const cheapest = Math.min(...variants.map((v) => Number(v.price)))
  const alcoholFree = tags.some((t) => /^non[- ]?alcoholic$/i.test(t))

  const productTags = [
    isSpirit ? 'type:spirit' : 'type:wine',
    priceTag(cheapest),
  ]
  for (const tag of tags) {
    const key = tag.toLowerCase()
    if (OCCASION_TAGS[key]) productTags.push(OCCASION_TAGS[key])
    if (RECIPIENT_TAGS[key]) productTags.push(RECIPIENT_TAGS[key])
  }

  if (!body) flags.noDescription.push(handle)

  const inStock = variants.some((v) => v.inventoryQuantity === null || v.inventoryQuantity > 0)
  if (!inStock) flags.noStock.push(handle)

  products.push({
    handle,
    title,
    descriptionHtml: body,
    productType: style ?? (isSpirit ? 'Spirit' : 'Wine'),
    vendor: (head.Vendor || '').trim() || 'The Parcel Concierge',
    tags: [...new Set(productTags)],
    images,
    variants,
    wine: {
      producer: (head.Vendor || '').trim() || undefined,
      country,
      region,
      grape: grapes,
      vintage: vintageOf(title),
      abv: abvOf(tags),
      volume: volumeOf(title),
      isExclusiveImport: false,
      isAlcoholFree: alcoholFree || undefined,
      organic: tags.some((t) => /^organic$/i.test(t)) || undefined,
      biodynamic: tags.some((t) => /^biodynamic$/i.test(t)) || undefined,
      fineWine: tags.some((t) => /^fine wines?$/i.test(t)) || undefined,
      giftSet: tags.some((t) => /^wine gift sets?$/i.test(t)) || undefined,
    },
    // The copy process picks these up. The ingest tool refuses to publish
    // anything carrying needsReview, so a wine with no description cannot
    // reach the live store until somebody writes one.
    ...(body ? {} : { needsReview: 'No description in the export. Needs copy before it can be published.' }),
  })
}

const catalogue = {
  source: `Shopify products export, imported by scripts/catalogue/import-shopify-export.mjs from ${args.input}`,
  currencyCode: 'EUR',
  products,
}

const out = join(process.cwd(), args.output)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(catalogue, null, 2)}\n`, 'utf8')

// --- Report -----------------------------------------------------------------

const byStyle = {}
for (const p of products) byStyle[p.productType] = (byStyle[p.productType] ?? 0) + 1
const byCountry = {}
for (const p of products) {
  const c = p.wine.country ?? '(not tagged)'
  byCountry[c] = (byCountry[c] ?? 0) + 1
}

console.log(`Imported ${products.length} wines and spirits to ${out}`)
console.log()
console.log('By style')
for (const [k, v] of Object.entries(byStyle).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`)
console.log()
console.log('By country')
for (const [k, v] of Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(v).padStart(4)}  ${k}`)
console.log()
console.log('Skipped')
for (const [k, v] of Object.entries(skipped)) console.log(`  ${String(v).padStart(4)}  ${k}`)
console.log()
console.log('Needs attention')
console.log(`  ${String(flags.noDescription.length).padStart(4)}  no description, held from publishing`)
console.log(`  ${String(flags.noStock.length).padStart(4)}  out of stock`)
console.log(`  ${String(flags.noStyle.length).padStart(4)}  no style could be derived, defaulted`)
