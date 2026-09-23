/**
 * Is every wine on the store reachable on the site?
 *
 * Reads every product on the live store, works out how the site would
 * classify each one (the same kindFromMembership the site uses), and
 * reports the ones a shopper could not find:
 *
 *   - a wine that is in none of the collections the wine listings read,
 *     so it exists at /wine/<handle> but is on no listing page;
 *   - a product that looks like a wine (product type, title) but reads as
 *     a gift, so its page is under /gifts/ and /wine/<handle> is a 404;
 *   - a wine that is out of stock, which the listings hide by design.
 *
 * Then the filter coverage: how many wines carry a tag the Country, Region
 * and Grape filters can read, and which do not. And with --tags, every tag
 * on every wine with its count, which is the store's real vocabulary and
 * the input to tidying it.
 *
 * Pass a handle or a few words of a title to see one product's status:
 *
 *   npm run wines:audit -- tokara
 *   npm run wines:audit -- tokara-directors-reserve-white
 *   npm run wines:audit -- --tags
 *
 * Needs the Storefront credentials in .env.local or the environment, like
 * collections:validate. Read only. Exits 0 either way: it is a report.
 */
import { readFileSync } from 'node:fs'
import { COLLECTIONS, HIDDEN_FROM_LISTINGS } from '../../src/lib/commerce/collections.ts'
import { countryFromLabel, grapeFromLabel, regionFromLabel } from '../../src/lib/commerce/taxonomy.ts'
import { kindFromMembership } from '../../src/lib/shopify/normalise.ts'

function readEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const source of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(new URL(`../../${source}`, import.meta.url), 'utf8').split('\n')) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        const key = match?.[1]
        if (key && !(key in env)) env[key] = (match[2] ?? '').replace(/^["']|["']$/g, '').trim()
      }
    } catch {
      // no such env file; fall through to process.env
    }
  }
  return { ...env, ...process.env } as Record<string, string>
}

const env = readEnv()
const DOMAIN = env.SHOPIFY_STORE_DOMAIN
const TOKEN = env.SHOPIFY_STOREFRONT_TOKEN
const VERSION = env.SHOPIFY_API_VERSION || '2025-07'

if (!DOMAIN || !TOKEN) {
  console.log('[wines:audit] no Shopify credentials (SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN), nothing to audit')
  process.exit(0)
}

type StoreProduct = {
  handle: string
  title: string
  productType: string
  vendor: string
  availableForSale: boolean
  tags: string[]
  collections: { nodes: { handle: string }[] }
}

async function allProducts(): Promise<StoreProduct[]> {
  const out: StoreProduct[] = []
  let after: string | null = null
  for (let page = 0; page < 40; page += 1) {
    const res = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': TOKEN as string },
      body: JSON.stringify({
        query: `query Audit($after: String) {
          products(first: 250, after: $after) {
            nodes { handle title productType vendor availableForSale tags collections(first: 20) { nodes { handle } } }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        variables: { after },
      }),
    })
    if (!res.ok) throw new Error(`Storefront ${res.status} ${res.statusText}`)
    const json = (await res.json()) as {
      data?: { products: { nodes: StoreProduct[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }
      errors?: { message: string }[]
    }
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '))
    const products = json.data?.products
    if (!products) break
    out.push(...products.nodes)
    if (!products.pageInfo.hasNextPage || !products.pageInfo.endCursor) break
    after = products.pageInfo.endCursor
  }
  return out
}

/** The collection handles the wine hub's listings actually read. */
const WINE_LISTING_HANDLES = new Map<string, string[]>()
for (const c of COLLECTIONS) {
  if (c.hub !== 'wine' || !c.query.collection) continue
  WINE_LISTING_HANDLES.set(c.query.collection, [...(WINE_LISTING_HANDLES.get(c.query.collection) ?? []), c.path])
}

const LOOKS_LIKE_WINE = /wine|champagne|prosecco|cava|cr[ée]mant|port|sherry|sparkling|ros[ée]/i

const products = await allProducts()
console.log(`[wines:audit] ${products.length} products on ${DOMAIN}\n`)

type Row = {
  product: StoreProduct
  kind: ReturnType<typeof kindFromMembership>
  listings: string[]
}

const rows: Row[] = products.map((product) => {
  const handles = product.collections.nodes.map((n) => n.handle)
  const kind = kindFromMembership(handles, product.tags, product.productType)
  const listings = handles.flatMap((h) => WINE_LISTING_HANDLES.get(h) ?? [])
  return { product, kind, listings: [...new Set(listings)] }
})

const args = process.argv.slice(2)
const showTags = args.includes('--tags')
const wanted = args
  .filter((a) => !a.startsWith('--'))
  .join(' ')
  .trim()
  .toLowerCase()
if (wanted) {
  const hits = rows.filter(
    ({ product }) => product.handle.includes(wanted) || product.title.toLowerCase().includes(wanted),
  )
  if (!hits.length) {
    console.log(`Nothing on the store matches "${wanted}". It is not a site problem: the product is not in Shopify, or is not published to the Storefront sales channel.`)
  }
  for (const { product, kind, listings } of hits) {
    const hub = kind === 'wine' || kind === 'spirit' ? 'wine' : kind === 'hamper' ? 'hampers' : kind === 'addon' ? 'gifts' : null
    console.log(`${product.title}  (${product.handle})`)
    console.log(`  type: ${product.productType || '-'}   vendor: ${product.vendor || '-'}   ${product.availableForSale ? 'in stock' : 'OUT OF STOCK (hidden from listings)'}`)
    console.log(`  collections: ${product.collections.nodes.map((n) => n.handle).join(', ') || '(none)'}`)
    console.log(`  site reads it as: ${kind}${hub ? `, page at /${hub}/${product.handle}` : ', no page'}`)
    console.log(`  on wine listings: ${listings.length ? listings.join(', ') : 'NONE'}`)
    console.log(`  tags: ${product.tags.join(', ') || '(none)'}`)
    console.log(
      `  filters read from those tags: country ${first(product.tags, countryFromLabel) ?? '-'}, region ${first(product.tags, regionFromLabel) ?? '-'}, grape ${first(product.tags, grapeFromLabel) ?? '-'}`,
    )
    if (kind !== 'wine' && kind !== 'spirit' && LOOKS_LIKE_WINE.test(`${product.productType} ${product.title}`)) {
      console.log(`  !! looks like a wine but is in no wine collection the site knows (WINE_COLLECTION_HANDLES in src/lib/shopify/normalise.ts). Add it to Fine Wines or the red/white/sparkling collection in Shopify.`)
    }
    console.log()
  }
  process.exit(0)
}

const byKind = new Map<string, number>()
for (const { kind } of rows) byKind.set(kind, (byKind.get(kind) ?? 0) + 1)
console.log('By kind:', [...byKind.entries()].map(([k, n]) => `${k} ${n}`).join(', '))

for (const [handle, paths] of WINE_LISTING_HANDLES) {
  const members = rows.filter(({ product }) => product.collections.nodes.some((n) => n.handle === handle))
  const live = members.filter(({ product }) => product.availableForSale && !HIDDEN_FROM_LISTINGS.has(product.handle))
  console.log(`  ${handle}: ${members.length} products, ${live.length} in stock  ->  ${paths.join(', ')}`)
}

const wines = rows.filter(({ kind }) => kind === 'wine' || kind === 'spirit')
const unlisted = wines.filter(({ listings }) => listings.length === 0)
const outOfStock = wines.filter(({ product }) => !product.availableForSale)
const misread = rows.filter(
  ({ kind, product }) =>
    kind !== 'wine' && kind !== 'spirit' && kind !== 'builder-item' && LOOKS_LIKE_WINE.test(`${product.productType} ${product.title}`),
)

function first(tags: readonly string[], lookup: (tag: string) => string | null): string | null {
  for (const tag of tags) {
    const hit = lookup(tag)
    if (hit) return hit
  }
  return null
}

function list(title: string, items: Row[], detail: (r: Row) => string) {
  console.log(`\n${title}: ${items.length}`)
  for (const row of items) console.log(`  ${row.product.title}  (${row.product.handle})  ${detail(row)}`)
}

list('Wines on no wine listing (page exists, but nothing links to it)', unlisted, ({ product }) =>
  `collections: ${product.collections.nodes.map((n) => n.handle).join(', ') || 'none'}`,
)
list('Look like wine but read as something else (page is under the wrong hub)', misread, ({ kind, product }) =>
  `reads as ${kind}; collections: ${product.collections.nodes.map((n) => n.handle).join(', ') || 'none'}`,
)
list('Wines out of stock (hidden from listings by design)', outOfStock, () => '')

// --- Filter coverage -------------------------------------------------------
// The Country, Region and Grape filters read the product tags (the wine.*
// metafields are not on the store). A wine with no readable tag is simply
// absent from that filter, so these lists are the tagging to-do.
const noCountry = wines.filter(({ product }) => first(product.tags, countryFromLabel) === null)
const noGrape = wines.filter(({ product }) => first(product.tags, grapeFromLabel) === null)
const withRegion = wines.filter(({ product }) => first(product.tags, regionFromLabel) !== null)
console.log(
  `\nFilter coverage: country ${wines.length - noCountry.length}/${wines.length}, grape ${wines.length - noGrape.length}/${wines.length}, region ${withRegion.length}/${wines.length}`,
)
list('Wines with no country tag (absent from the Country filter)', noCountry, ({ product }) => `tags: ${product.tags.join(', ') || 'none'}`)
list('Wines with no grape tag (absent from the Grape filter; blends and sparkling are expected here)', noGrape, () => '')

if (showTags) {
  const counts = new Map<string, number>()
  for (const { product } of wines) for (const tag of product.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  console.log(`\nEvery tag on a wine, with how many wines carry it (${counts.size} distinct):`)
  for (const [tag, n] of [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    const reads = [countryFromLabel(tag) && 'country', regionFromLabel(tag) && 'region', grapeFromLabel(tag) && 'grape'].filter(Boolean)
    console.log(`  ${String(n).padStart(4)}  ${tag}${reads.length ? `  (${reads.join(', ')} filter)` : ''}`)
  }
}

console.log(
  `\n[wines:audit] ${wines.length} wines: ${wines.length - unlisted.length - outOfStock.length} on a listing and in stock, ${unlisted.length} on no listing, ${outOfStock.length} out of stock, ${misread.length} misread.`,
)
