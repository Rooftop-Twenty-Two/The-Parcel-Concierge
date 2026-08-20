#!/usr/bin/env node
/**
 * Turns the Shopify export's hampers into the catalogue interchange
 * format. With this, the last invented product leaves the site: hampers,
 * wine and builder items all come from the client's own export.
 *
 * What the export gives a hamper: title, description, price, photographs
 * and merchandising tags. What it does not give: a structured contents
 * list or an allergen statement, both of which the brief makes mandatory
 * before ingest may publish. So every hamper comes through flagged
 * needsReview with those fields empty, which renders fine on the site and
 * is blocked by the ingest validator until somebody fills them in. A gap
 * in the data stays visible as a gap, never as invented copy.
 *
 * Tag mapping is the same discipline as the wine importer: the shop's own
 * merchandising tags become the locked taxonomy's occasion: and
 * recipient: tags, so the occasion and recipient listings fill with real
 * products.
 *
 * Usage:
 *   node scripts/catalogue/import-hampers.mjs \
 *     --input /path/to/products_export_1.csv \
 *     [--output data/catalogue/hampers.json]
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readCsv } from './csv.mjs'

/** Export tag (lowercased) → locked taxonomy tag. */
const TAG_MAP = {
  christmas: 'occasion:christmas',
  'xmas gift set': 'occasion:christmas',
  baby: 'occasion:new-baby',
  'gifts for baby': 'occasion:new-baby',
  wedding: 'occasion:wedding',
  'gifts for wedding': 'occasion:wedding',
  'gifts by birthday': 'occasion:birthday',
  'birthday girl': 'occasion:birthday',
  'gifts for her': 'recipient:her',
  'xmas her': 'recipient:her',
  'gifts for him': 'recipient:him',
  'gifts for men': 'recipient:him',
  'xmas him': 'recipient:him',
  'gifts for families': 'recipient:family',
  'gifts for employees gifts for employees': 'recipient:client',
  'gifts for employees': 'recipient:client',
  'corporate gifts': 'occasion:corporate',
}

/**
 * Whether the box contains alcohol, read from the shop's own words. This
 * drives the age gate, so it errs towards true: a gate on an alcohol-free
 * box is a wasted click, a missing gate on a Champagne box is a problem.
 */
const ALCOHOL_SIGNAL = /\b(wine|champagne|prosecco|cava|bubbles|gin|whiskey|whisky|vodka|liqueur|baileys|beer|rum|brandy|aperol|cocktail)\b/i

function priceTag(price) {
  if (price < 50) return 'price:under-50'
  if (price < 100) return 'price:50-100'
  if (price < 150) return 'price:100-150'
  return 'price:150-plus'
}

function parseArgs(argv) {
  const args = { input: '', output: 'data/catalogue/hampers.json' }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--input' || argv[i] === '-i') args.input = argv[++i] ?? ''
    else if (argv[i] === '--output' || argv[i] === '-o') args.output = argv[++i] ?? args.output
  }
  if (!args.input) {
    console.error('Usage: import-hampers.mjs --input <export.csv> [--output <file.json>]')
    process.exit(1)
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const rows = await readCsv(args.input)

const byHandle = new Map()
for (const row of rows) {
  if (!row.Handle) continue
  if (!byHandle.has(row.Handle)) byHandle.set(row.Handle, [])
  byHandle.get(row.Handle).push(row)
}

const products = []
const skipped = { unpublished: 0, notHamper: 0, noPrice: 0, noImage: 0 }

for (const [handle, group] of byHandle) {
  const head = group.find((r) => (r.Title || '').trim())
  if (!head) continue

  const tags = (head.Tags || '').split(',').map((t) => t.trim()).filter(Boolean)
  const lower = tags.map((t) => t.toLowerCase())
  const isHamper = /^hamper$/i.test((head.Type || '').trim()) || lower.includes('hampers')
  if (!isHamper) { skipped.notHamper += 1; continue }
  if (head.Published !== 'true') { skipped.unpublished += 1; continue }

  const title = head.Title.trim()

  const variants = group
    .filter((r) => (r['Variant SKU'] || '').trim() || (r['Variant Price'] || '').trim())
    .map((r) => {
      const price = Number(r['Variant Price'])
      if (!Number.isFinite(price) || price <= 0) return null
      const qtyRaw = (r['Variant Inventory Qty'] || '').trim()
      const tracked = (r['Variant Inventory Tracker'] || '').trim() !== ''
      return {
        sku: (r['Variant SKU'] || '').trim() || `TPC-H-${handle.toUpperCase().replace(/-/g, '').slice(0, 22)}`,
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
      alt: (r['Image Alt Text'] || '').trim() || `${title}, a Parcel Concierge hamper`,
      width: 1200,
      height: 1200,
    }))
  if (!images.length) { skipped.noImage += 1; continue }

  const body = (head['Body (HTML)'] || '').trim()
  const cheapest = Math.min(...variants.map((v) => Number(v.price)))
  const containsAlcohol = ALCOHOL_SIGNAL.test(`${title} ${body}`)

  const productTags = ['type:hamper', priceTag(cheapest)]
  // The age gate and the corporate "alcohol-free" filter both key off this.
  if (containsAlcohol) productTags.push('contains:alcohol')
  for (const tag of lower) {
    const mapped = TAG_MAP[tag]
    if (mapped && !productTags.includes(mapped)) productTags.push(mapped)
  }

  products.push({
    handle,
    title,
    descriptionHtml: body,
    productType: 'Hamper',
    vendor: (head.Vendor || '').trim() || 'The Parcel Concierge',
    tags: productTags,
    images,
    variants,
    hamper: {
      contents: [],
      allergens: '',
      containsAlcohol,
    },
    // The export has no structured contents or allergens. The site renders
    // without them; ingest refuses to publish until they are filled in.
    needsReview:
      'Contents list and allergen statement are not in the Shopify export and must be written before ingest.',
  })
}

products.sort((a, b) => a.handle.localeCompare(b.handle))

const outPath = join(process.cwd(), args.output)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(
  outPath,
  JSON.stringify(
    {
      source: `Shopify export, hampers, imported ${new Date().toISOString().slice(0, 10)}`,
      currencyCode: 'EUR',
      products,
    },
    null,
    2,
  ) + '\n',
)

console.log(`Wrote ${products.length} hampers to ${args.output}`)
console.log('Skipped:', skipped)
for (const p of products) {
  console.log(
    ` €${Math.min(...p.variants.map((v) => Number(v.price))).toFixed(2).padStart(7)}`,
    p.hamper.containsAlcohol ? 'alcohol' : '       ',
    p.handle.padEnd(30),
    p.tags.filter((t) => !t.startsWith('type:')).join(', '),
  )
}
