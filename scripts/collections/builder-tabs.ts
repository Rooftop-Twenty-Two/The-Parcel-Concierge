/**
 * Looks up the Build a Hamper tab collections on the live store.
 *
 * Every tab in src/lib/build-a-hamper-tabs.ts names its Shopify collection
 * by title. This finds each title on the store, prints the real handle, and
 * says whether the config agrees, so a handle is never typed from a guess.
 * It does the same for the Christmas 2026 and General Hampers 2026 ranges.
 *
 *   npm run builder:tabs              handles, and whether the config agrees
 *   npm run builder:tabs -- --products   also each tab's products, in the
 *                                        collection's manual order
 *
 * Exits 1 when a configured handle disagrees with the store.
 */
import { BUILDER_TABS } from '../../src/lib/build-a-hamper-tabs.ts'
import { CHRISTMAS_COLLECTION, HAMPERS_COLLECTION } from '../../src/lib/commerce/collections.ts'

const domain = process.env.SHOPIFY_STORE_DOMAIN
const token = process.env.SHOPIFY_STOREFRONT_TOKEN
const version = process.env.SHOPIFY_API_VERSION || '2025-07'
const withProducts = process.argv.includes('--products')

if (!domain || !token) {
  console.error('[builder:tabs] SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN are required')
  process.exit(1)
}

async function storefront<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token! },
    body: JSON.stringify({ query, variables }),
  })
  const body = (await res.json()) as { data?: T; errors?: unknown }
  if (!res.ok || !body.data) {
    throw new Error(`Storefront ${res.status}: ${JSON.stringify(body.errors ?? body)}`)
  }
  return body.data
}

type Collection = { handle: string; title: string }

async function allCollections(): Promise<Collection[]> {
  const out: Collection[] = []
  let after: string | null = null
  for (;;) {
    const data: {
      collections: { nodes: Collection[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
    } = await storefront(
      `query($after: String) { collections(first: 250, after: $after) { nodes { handle title } pageInfo { hasNextPage endCursor } } }`,
      { after },
    )
    out.push(...data.collections.nodes)
    if (!data.collections.pageInfo.hasNextPage) return out
    after = data.collections.pageInfo.endCursor
  }
}

/** Titles compared loosely on dashes, spacing and case: "–" and "-" alike. */
function fold(title: string): string {
  return title.replace(/[‐-―−-]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase()
}

async function productsInManualOrder(handle: string): Promise<string[]> {
  const data = await storefront<{
    collection: { products: { nodes: { title: string; availableForSale: boolean }[] } } | null
  }>(
    `query($handle: String!) { collection(handle: $handle) { products(first: 250, sortKey: MANUAL) { nodes { title availableForSale } } } }`,
    { handle },
  )
  return (data.collection?.products.nodes ?? []).map((p) => `${p.title}${p.availableForSale ? '' : '  (sold out)'}`)
}

const collections = await allCollections()
const byTitle = new Map<string, Collection[]>()
for (const c of collections) {
  const key = fold(c.title)
  byTitle.set(key, [...(byTitle.get(key) ?? []), c])
}

let disagreements = 0

function report(label: string, title: string, configured: string | null) {
  const found = byTitle.get(fold(title)) ?? []
  const handles = found.map((c) => c.handle)
  let status: string
  if (found.length === 0) status = 'NOT FOUND on the store'
  else if (found.length > 1) status = `AMBIGUOUS, ${found.length} collections share this title`
  else if (configured === handles[0]) status = 'config agrees'
  else if (configured === null) status = 'not yet in config'
  else {
    status = `CONFIG SAYS ${configured}`
    disagreements += 1
  }
  console.log(`  ${label.padEnd(26)} ${handles.join(', ').padEnd(44) || '—'.padEnd(44)} ${status}`)
}

console.log(`[builder:tabs] ${collections.length} collections on ${domain}\n`)
console.log('Build a Hamper tabs, in order:')
for (const tab of BUILDER_TABS) report(tab.label, tab.title, tab.handle)

console.log('\nSeasonal ranges:')
report('Christmas 2026', 'Christmas 2026', CHRISTMAS_COLLECTION)
report('General Hampers 2026', 'General Hampers 2026', HAMPERS_COLLECTION)

const others = collections.filter(
  (c) => fold(c.title).startsWith('build a hamper') && !BUILDER_TABS.some((t) => fold(t.title) === fold(c.title)),
)
if (others.length) {
  console.log('\nBuild a Hamper collections on the store that no tab reads:')
  for (const c of others) console.log(`  ${c.handle}  ("${c.title}")`)
}

if (withProducts) {
  for (const tab of BUILDER_TABS) {
    const handle = tab.handle ?? byTitle.get(fold(tab.title))?.[0]?.handle
    if (!handle) continue
    const titles = await productsInManualOrder(handle)
    console.log(`\n${tab.label} (${handle}), ${titles.length} products in manual order:`)
    titles.forEach((t, i) => console.log(`  ${String(i + 1).padStart(3)}. ${t}`))
  }
}

if (disagreements) {
  console.error(`\n[builder:tabs] ${disagreements} configured handle(s) disagree with the store`)
  process.exit(1)
}
