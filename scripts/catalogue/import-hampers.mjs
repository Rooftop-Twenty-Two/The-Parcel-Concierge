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
 *     [--output data/catalogue/hampers.json] \
 *     [--all]
 *
 * --all is for a curated, hampers-only export: every product in the file
 * is a hamper to be used on the site, so the Type/tag test and the
 * Published filter are skipped. The August 2026 range arrived this way:
 * a fresh store where every product is still a draft, with no Type, no
 * tags and no live stock counts. Under --all the placeholder inventory
 * numbers are imported as untracked (null) rather than as literal zeros,
 * because a draft store's zeros would render the entire range sold out
 * and hide it from every listing. Real counts arrive when the store
 * publishes.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readCsv } from './csv.mjs'

/**
 * Width and height straight out of the JPEG's own SOF marker.
 *
 * The supplied frames are not all the same shape, and next/image needs the
 * true aspect ratio or the product gallery jumps on load. Reading the file
 * beats maintaining a table of numbers by hand that nobody will update
 * when a frame is re-shot.
 */
function jpegSize(path) {
  const data = readFileSync(path)
  let i = 2
  while (i < data.length) {
    if (data[i] !== 0xff) { i += 1; continue }
    const marker = data[i + 1]
    // SOF0..SOF15, skipping the four that are not frame headers.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: data.readUInt16BE(i + 5), width: data.readUInt16BE(i + 7) }
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue }
    i += 2 + data.readUInt16BE(i + 2)
  }
  return null
}

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
 * Studio photography the client supplied directly, by handle.
 *
 * The export's own image URLs point at the Shopify CDN. These frames were
 * shot for the August 2026 range and sent to us as files, so they are
 * served from our own domain and lead the gallery, with the export's CDN
 * images kept behind them. The map lives here rather than in the JSON
 * because the JSON is regenerated from the CSV: hand-editing it would
 * lose the photography on the next import.
 *
 * SEASONAL. These frames are styled for Christmas (a wreath, a dried
 * orange garland, baubles). The box and its contents are untouched, which
 * is the client's own direction, but the styling dates them: they want
 * replacing with neutral frames in January. See docs/build-status.md.
 */
const SUPPLIED_PHOTOGRAPHY = {
  'large-basket': {
    file: 'hamper-the-grand-indulgence.jpg',
    alt: 'A lidded wicker hamper with Butlers chocolates and Hassetts luxury biscuits on the lid, ringed by Baron de Ley Rioja, Louis Roederer Champagne, Chateau Les Moutins red and white, Rathbornes candles, Crossogues preserves and a Max Benjamin fragrance',
  },
  '2-1': {
    file: 'hamper-a-taste-of-luxury.jpg',
    alt: 'A wicker hamper holding Messer del Fauno red and white wine, Prosecco, Hassetts biscuits, a Ballymaloe relish set, a Herb Dublin board and a La Bougie Mission Fig candle and diffuser',
  },
  3: {
    file: 'hamper-hello-baby-boy.jpg',
    alt: 'A blue bedtime bear holding its comforter beside a bottle of Freixenet Prosecco, Julie Clarke hand wash and lotion and a folded lambswool blanket, packed in a green Parcel Concierge tray',
  },
  '4-1': {
    file: 'hamper-hello-baby-girl.jpg',
    alt: 'A pink bedtime bear holding its comforter beside a bottle of Freixenet sparkling rose, Julie Clarke hand wash and lotion and a folded lambswool blanket, packed in a green Parcel Concierge tray',
  },
  '5-2': {
    file: 'hamper-the-italian-job.jpg',
    alt: 'Doppio Passo red and Messer del Fauno Pinot Grigio packed beside Sheridans crackers, a Filligan\u2019s jar and a Chocolate Garden of Ireland box, with a Caulfield Country walnut board and slate alongside',
  },
  'new-mum-and-baby-girl-luxury-hamper': {
    file: 'hamper-new-mum-and-baby-girl.jpg',
    alt: 'A pink teddy cushion blanket, a bottle of Moet and Chandon rose Champagne, a round box of Butlers truffles and a Jo Browne Gift of Sleep set, packed in a green Parcel Concierge tray',
  },
  'new-mum-and-baby-girl-luxury-hamper-copy': {
    file: 'hamper-birdy-awesome.jpg',
    alt: 'A Tipperary Crystal robin mug and matching gift box beside a bottle of Freixenet Prosecco, a Chocolate Garden of Ireland box, a chocolate bar and a Handmade Soap Company candle',
  },
  'because-you-re-amazing-hamper': {
    file: 'hamper-because-youre-amazing.jpg',
    alt: 'A Herb Dublin candle trio in a wooden crate beside a bottle of Bosco Prosecco, a Chocolate Garden of Ireland box and the Handmade Soap Company Because You are Amazing set',
  },
  'all-ireland-food-hamper': {
    file: 'hamper-all-ireland-food.jpg',
    alt: 'An Irish food box holding McEntee\u2019s tea, Keogh\u2019s crisps, Coffee Perfection coffee bags, Hassetts biscuits and crackers, Butlers chocolates, McDaid\u2019s minerals, Hadji Bey fruit jellies and three Filligan\u2019s preserves',
  },
  'the-rose-crystal-celebration-hamper': {
    file: 'hamper-rose-and-crystal-celebration.jpg',
    alt: 'A bottle of Freixenet sparkling rose beside a boxed pair of Tipperary Crystal Champagne flutes, a box of Mienas Turkish delight and a bottle of St-Germain elderflower liqueur',
  },
  'the-perfect-duo': {
    file: 'hamper-the-perfect-duo.jpg',
    alt: 'A bottle of Baie d\u2019Azur rose wine beside a tube of Baileys strawberries and cream chocolate truffles, packed in a red gift box',
  },
  'the-classic-gentleman-s-hamper': {
    file: 'hamper-the-classic-gentlemans.jpg',
    alt: 'A McNutt of Donegal lambswool scarf in its kraft tube, standing beside a bottle of Messer del Fauno Nero d\u2019Avola and a tube of Guinness chocolate truffles',
  },
  'for-the-guinness-lover': {
    file: 'hamper-for-the-guinness-lover.jpg',
    alt: 'A gold box holding Guinness chocolates, Guinness caramel fudge, a Guinness enamel mug, a bag of coffee bags and a boxed set of Guinness mini pint chocolates',
  },
  'bubbles-bliss-hamper': {
    file: 'hamper-bubbles-and-bliss.jpg',
    alt: 'Two bottles of Prosecco either side of a Jo Browne day and night body oil gift set, packed in a green Parcel Concierge tray',
  },
  'bubbles-bliss-luxury-hamper': {
    file: 'hamper-bubbles-and-bliss-luxury.jpg',
    alt: 'Two small bottles of Moet and Chandon Champagne either side of a Jo Browne day and night body oil gift set, packed in a green Parcel Concierge tray',
  },
  'luxury-home-amp-indulgence-hamper': {
    file: 'hamper-luxury-home-and-indulgence.jpg',
    alt: 'A fluted Tipperary Crystal vase flanked by a La Bougie Pomelo 1830 candle and diffuser, a Chocolate Garden of Ireland box and Handmade Soap Company hand wash and lotion',
  },
  'new-baby-celebration': {
    file: 'hamper-new-baby-celebration.jpg',
    alt: 'A plush bunny and a rolled Nancy D\u2019s baby blanket beside a Pestle and Mortar skincare tube, a Chocolate Garden of Ireland box, a congratulations chocolate bar and a bottle of Cremant',
  },
  'taste-of-ireland-gluten-free-hamper': {
    file: 'hamper-taste-of-ireland-gluten-free.jpg',
    alt: 'A gluten free Irish box holding Keogh\u2019s crisps, Blanco Nino tortilla chips, gourmet sodabread toasts, Hadji Bey fruit jellies, a Ballymaloe relish set, Coffee Perfection coffee bags and Chocolate Garden of Ireland chocolates and hot chocolate',
  },
  'new-home-luxury-hamper': {
    file: 'hamper-new-home-luxury.jpg',
    alt: 'A bottle of Henriot Champagne beside a Rathbornes diffuser, a framed Ogham print and a boxed pair of Galway Crystal Champagne flutes',
  },
  'french-wine-port-christmas-trio': {
    file: 'hamper-french-wine-and-port-trio.jpg',
    alt: 'Three bottles, two Chateau Les Moulins and a Quinta port, seated in a patterned insert inside a navy Parcel Concierge gift box with the shop address printed on the front',
  },
}

/**
 * Occasions read from the shop's own product titles, for exports that
 * carry no merchandising tags at all (the August 2026 range). Same
 * discipline as the alcohol signal below: the title is the client's own
 * description of the box, so "Hello Baby Boy" earning occasion:new-baby
 * is reading their words, not inventing merchandising. Deliberately
 * conservative: a title that names no occasion gets no occasion tag.
 */
const TITLE_OCCASION_SIGNALS = [
  [/\b(baby|new mum)\b/i, 'occasion:new-baby'],
  [/\bchristmas\b/i, 'occasion:christmas'],
  [/\bwedding\b/i, 'occasion:wedding'],
  [/\banniversary\b/i, 'occasion:anniversary'],
  [/\bbirthday\b/i, 'occasion:birthday'],
  [/\bthank[- ]you\b/i, 'occasion:thank-you'],
]

/**
 * Whether the box contains alcohol, read from the shop's own words. This
 * drives the age gate, so it errs towards true: a gate on an alcohol-free
 * box is a wasted click, a missing gate on a Champagne box is a problem.
 */
const ALCOHOL_SIGNAL = /\b(wine|champagne|prosecco|cava|cr[eé]mant|sparkling|port|sherry|bubbles|gin|whiskey|whisky|vodka|liqueur|baileys|beer|rum|brandy|aperol|cocktail|nero d['’]avola)\b/i

function priceTag(price) {
  if (price < 50) return 'price:under-50'
  if (price < 100) return 'price:50-100'
  if (price < 150) return 'price:100-150'
  return 'price:150-plus'
}

function parseArgs(argv) {
  const args = { input: '', output: 'data/catalogue/hampers.json', all: false }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--input' || argv[i] === '-i') args.input = argv[++i] ?? ''
    else if (argv[i] === '--output' || argv[i] === '-o') args.output = argv[++i] ?? args.output
    else if (argv[i] === '--all') args.all = true
  }
  if (!args.input) {
    console.error('Usage: import-hampers.mjs --input <export.csv> [--output <file.json>] [--all]')
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
const takenSkus = new Set()
const photographed = []
const awaitingPhoto = []
const unreadable = []

for (const [handle, group] of byHandle) {
  const head = group.find((r) => (r.Title || '').trim())
  if (!head) continue

  const tags = (head.Tags || '').split(',').map((t) => t.trim()).filter(Boolean)
  const lower = tags.map((t) => t.toLowerCase())
  const isHamper = args.all || /^hamper$/i.test((head.Type || '').trim()) || lower.includes('hampers')
  if (!isHamper) { skipped.notHamper += 1; continue }
  if (!args.all && head.Published !== 'true') { skipped.unpublished += 1; continue }

  const title = head.Title.trim()

  const variants = group
    .filter((r) => (r['Variant SKU'] || '').trim() || (r['Variant Price'] || '').trim())
    .map((r) => {
      const price = Number(r['Variant Price'])
      if (!Number.isFinite(price) || price <= 0) return null
      const qtyRaw = (r['Variant Inventory Qty'] || '').trim()
      const tracked = (r['Variant Inventory Tracker'] || '').trim() !== ''
      // The synthesised SKU keeps the whole handle: a 22-character prefix
      // collided the moment the export held two handles differing only in
      // a "-copy" suffix, and SKU is the ingest idempotency key.
      let sku = (r['Variant SKU'] || '').trim() || `TPC-H-${handle.toUpperCase().replace(/-/g, '').slice(0, 40)}`
      while (takenSkus.has(sku)) sku += '-2'
      takenSkus.add(sku)
      return {
        sku,
        title: (r['Option1 Value'] || 'Default Title').trim() || 'Default Title',
        price: price.toFixed(2),
        // See --all in the header: a draft store's zeros are placeholders,
        // not stock decisions.
        inventoryQuantity: args.all || !tracked ? null : Number(qtyRaw || 0),
      }
    })
    .filter(Boolean)
  if (!variants.length) { skipped.noPrice += 1; continue }

  const exportImages = group
    .filter((r) => (r['Image Src'] || '').trim())
    .sort((a, b) => Number(a['Image Position'] || 0) - Number(b['Image Position'] || 0))
    .map((r) => ({
      src: r['Image Src'].trim(),
      alt: (r['Image Alt Text'] || '').trim() || `${title}, a Parcel Concierge hamper`,
      width: 1200,
      height: 1200,
    }))

  // The supplied frame leads, because it is ours, it is served from our
  // own domain and it was shot for this range. The export's CDN images
  // follow it rather than being thrown away.
  //
  // Every hamper in the range has a registered frame, but only the files
  // that have actually landed are used: a registered name with no file
  // behind it would put a 404 at the top of the gallery. Drop the JPEG
  // into public/photography under its registered name, re-run this
  // importer, and it appears. Nothing here needs editing.
  const supplied = SUPPLIED_PHOTOGRAPHY[handle]
  const suppliedPath = supplied && join(process.cwd(), 'public/photography', supplied.file)
  let images = exportImages
  if (supplied && existsSync(suppliedPath)) {
    const size = jpegSize(suppliedPath)
    if (size) {
      images = [
        { src: `/photography/${supplied.file}`, alt: supplied.alt, width: size.width, height: size.height },
        ...exportImages,
      ]
      photographed.push(handle)
    } else {
      unreadable.push(supplied.file)
    }
  } else if (supplied) {
    awaitingPhoto.push(`${supplied.file}  (${handle})`)
  }
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
  for (const [signal, occasionTag] of TITLE_OCCASION_SIGNALS) {
    if (signal.test(title) && !productTags.includes(occasionTag)) productTags.push(occasionTag)
  }
  const occasionTags = productTags.filter((t) => t.startsWith('occasion:'))

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
      ...(occasionTags.length ? { occasionTags } : {}),
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

console.log(`\nSupplied photography: ${photographed.length} of ${Object.keys(SUPPLIED_PHOTOGRAPHY).length} frames in place.`)
if (unreadable.length) {
  console.log('\n  Could not read as JPEG, so not used:')
  for (const file of unreadable) console.log(`    ${file}`)
}
if (awaitingPhoto.length) {
  console.log('\n  Still waiting on these files. Drop each one into')
  console.log('  public/photography under exactly this name and re-run:')
  for (const line of awaitingPhoto.sort()) console.log(`    ${line}`)
}
for (const p of products) {
  console.log(
    ` €${Math.min(...p.variants.map((v) => Number(v.price))).toFixed(2).padStart(7)}`,
    p.hamper.containsAlcohol ? 'alcohol' : '       ',
    p.handle.padEnd(30),
    p.tags.filter((t) => !t.startsWith('type:')).join(', '),
  )
}
