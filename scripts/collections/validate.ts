/**
 * Collection mapping validator.
 *
 * Every listing in src/lib/commerce/collections.ts reads a native Shopify
 * collection by handle. If the merchant deletes or re-handles one, that
 * listing silently darks — the worst failure mode. This asserts every mapped
 * handle still resolves on the live store, so a broken mapping fails the
 * build instead of shipping.
 *
 *   - A confirmed-missing handle (not in PENDING_MERCHANT_COLLECTIONS) exits 1.
 *   - A pending handle (awaiting merchant creation) or a thin collection warns.
 *   - A network/API error warns and does NOT block the build — a Shopify
 *     outage must not stop a deploy, only a genuinely broken mapping does.
 *
 * Run: npm run collections:validate  (also runs inside npm run build)
 */
import { readFileSync } from 'node:fs'
import {
  MAPPED_COLLECTION_HANDLES,
  MIN_PRODUCTS_PER_LISTING,
  PENDING_MERCHANT_COLLECTIONS,
} from '../../src/lib/commerce/collections.ts'
import { BUILDER_TABS } from '../../src/lib/build-a-hamper-tabs.ts'

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
const domain = env.SHOPIFY_STORE_DOMAIN
const token = env.SHOPIFY_STOREFRONT_TOKEN
const VERSION = env.SHOPIFY_API_VERSION || '2025-07'

if (!domain || !token) {
  // No credentials (e.g. a fixture-mode build): nothing to validate against.
  console.log('[collections:validate] no Shopify credentials, skipping (fixture mode)')
  process.exit(0)
}

// Narrowing from the guard above does not reach into the function bodies
// below, because TypeScript cannot know when they are called. The guard
// exits the process, so these are strings by the time anything runs.
const DOMAIN: string = domain
const TOKEN: string = token

type Count = { available: number | 'error' }

async function countAvailable(handle: string): Promise<Count> {
  try {
    const res = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': TOKEN,
      },
      body: JSON.stringify({
        query: `{ collection(handle: "${handle}") { products(first: 50, filters: [{ available: true }]) { nodes { id } } } }`,
      }),
    })
    if (!res.ok) return { available: 'error' }
    const json = (await res.json()) as {
      data?: { collection?: { products: { nodes: unknown[] } } | null }
    }
    if (!('collection' in (json.data ?? {}))) return { available: 'error' }
    const collection = json.data?.collection
    if (!collection) return { available: -1 } // confirmed missing
    return { available: collection.products.nodes.length }
  } catch {
    return { available: 'error' }
  }
}

/**
 * Every collection handle on the store, for suggesting the right one when a
 * mapped handle is missing. Shopify derives a handle from the title and
 * appends -1, -2 when the handle is taken, so "General Hampers 2026" can
 * land as general-hampers-2026-1 and nobody would know from the admin
 * screen. A failed deploy that names the near miss fixes itself in one
 * edit; one that only says "missing" needs a session with store access.
 */
async function storeHandles(): Promise<string[] | null> {
  try {
    const res = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': TOKEN,
      },
      body: JSON.stringify({ query: `{ collections(first: 250) { nodes { handle title } } }` }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      data?: { collections?: { nodes: { handle: string; title: string }[] } }
    }
    return json.data?.collections?.nodes.map((n) => `${n.handle}  ("${n.title}")`) ?? null
  } catch {
    return null
  }
}

function nearMisses(missing: string, all: string[]): string[] {
  const words = missing.split('-').filter((w) => w.length > 3 && !/^\d+$/.test(w))
  return all.filter((entry) => words.some((w) => entry.toLowerCase().includes(w)))
}

const handles = MAPPED_COLLECTION_HANDLES
console.log(`[collections:validate] checking ${handles.length} mapped collections on ${DOMAIN}\n`)

let missing = 0
let pending = 0
let thin = 0
let errored = 0

const results = await Promise.all(
  handles.map(async (handle) => ({ handle, ...(await countAvailable(handle)) })),
)

for (const { handle, available } of results.sort((a, b) => a.handle.localeCompare(b.handle))) {
  if (available === 'error') {
    errored += 1
    console.warn(`  ?  could not verify (API error): ${handle}`)
  } else if (available === -1) {
    if (PENDING_MERCHANT_COLLECTIONS.has(handle)) {
      pending += 1
      console.warn(`  …  pending merchant creation: ${handle}`)
    } else {
      missing += 1
      console.error(`  ✗  MISSING on the store: ${handle}`)
    }
  } else if (available < MIN_PRODUCTS_PER_LISTING) {
    thin += 1
    console.warn(`  ~  thin (${available} < ${MIN_PRODUCTS_PER_LISTING}, route will dark): ${handle}`)
  } else {
    console.log(`  ✓  ${available === 50 ? '50+' : available} available: ${handle}`)
  }
}

// The Build a Hamper tabs. Warnings only: the picker hides a tab whose
// collection is missing or empty, so a builder collection the client
// removes must not block a deploy of the whole site.
console.log('\n[collections:validate] Build a Hamper tabs (warnings only)')
for (const tab of BUILDER_TABS) {
  if (!tab.handle) {
    console.warn(`  …  no handle yet, tab hidden: ${tab.label} ("${tab.title}")`)
    continue
  }
  const { available } = await countAvailable(tab.handle)
  if (available === 'error') console.warn(`  ?  could not verify (API error): ${tab.handle}`)
  else if (available === -1) console.warn(`  ✗  missing on the store, tab hidden: ${tab.handle}`)
  else if (available === 0) console.warn(`  ~  nothing available, tab hidden: ${tab.handle}`)
  else console.log(`  ✓  ${available === 50 ? '50+' : available} available: ${tab.handle}`)
}

console.log(
  `\n[collections:validate] ${handles.length} handles — ` +
    `${missing} missing, ${pending} pending, ${thin} thin, ${errored} unverified`,
)

if (missing > 0) {
  console.error(
    `\n[collections:validate] FAILED: ${missing} mapped collection(s) no longer exist on the store. ` +
      `Fix the handle in src/lib/commerce/collections.ts or mark it pending.`,
  )
  const all = await storeHandles()
  if (all) {
    const unmatched: string[] = []
    for (const { handle, available } of results) {
      if (available !== -1 || PENDING_MERCHANT_COLLECTIONS.has(handle)) continue
      const near = nearMisses(handle, all)
      if (near.length) console.error(`\n  ${handle}: did you mean one of these?\n    ${near.join('\n    ')}`)
      else unmatched.push(handle)
    }
    if (unmatched.length) {
      console.error(
        `\n  Nothing on the store resembles: ${unmatched.join(', ')}.` +
          `\n  The ${all.length} collection handles on the store:\n    ${all.join('\n    ')}`,
      )
    }
  }
  process.exit(1)
}
