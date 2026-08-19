#!/usr/bin/env node
/**
 * The content report.
 *
 * Answers three questions that otherwise get answered by clicking around:
 *
 *   1. Which listing routes still have no CMS copy? That is the phase 7
 *      work list.
 *   2. Do any CMS documents reference a product handle that does not exist?
 *      A curated listing pointing at a dead handle renders short, and the
 *      min-four rule then 404s the route.
 *   3. Which listings would fall below four products and therefore not
 *      ship at all?
 *
 * Run: npm run content:report
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONTENT } from '../../src/lib/cms/content.ts'
import { COLLECTIONS, MIN_PRODUCTS_PER_LISTING } from '../../src/lib/commerce/collections.ts'
import type { Catalogue } from '../../src/lib/catalogue/schema.ts'

const CATALOGUE = join(process.cwd(), 'data/catalogue/fixtures.json')

const catalogue = JSON.parse(readFileSync(CATALOGUE, 'utf8')) as Catalogue
const handles = new Set(catalogue.products.map((p) => p.handle))
const withCopy = new Set(CONTENT.listingCopy.map((c) => c.path))

let problems = 0

console.log('Content report')
console.log('==============')
console.log(`Catalogue: ${CATALOGUE} (${catalogue.products.length} products)`)
console.log()

// --- 1. Listing copy --------------------------------------------------------

const missingCopy = COLLECTIONS.filter((c) => !withCopy.has(c.path))
console.log(`Listing copy: ${withCopy.size} of ${COLLECTIONS.length + 4} routes written.`)
if (missingCopy.length) {
  console.log()
  console.log(`  Still to write (${missingCopy.length}). These routes render without an intro or`)
  console.log('  an SEO block until they are done. Phase 7.')
  for (const collection of missingCopy) {
    console.log(`    ${collection.path}`)
  }
}
console.log()

// --- 2. Dangling handle references -----------------------------------------

type Reference = { where: string; handle: string }
const references: Reference[] = []

for (const slot of CONTENT.homepage.slots) {
  if (slot.kind === 'featured-hampers') {
    references.push(...slot.handles.map((handle) => ({ where: 'homepage featured hampers', handle })))
  }
  if (slot.kind === 'wine-vault') {
    references.push(...slot.handles.map((handle) => ({ where: 'homepage wine vault', handle })))
  }
  if (slot.kind === 'hero' && slot.imageHandle) {
    references.push({ where: 'homepage hero', handle: slot.imageHandle })
  }
}

for (const listing of CONTENT.curated) {
  references.push(...listing.handles.map((handle) => ({ where: `curated ${listing.path}`, handle })))
}
for (const maker of CONTENT.makers) {
  references.push(...maker.productHandles.map((handle) => ({ where: `maker ${maker.slug}`, handle })))
}
for (const guide of CONTENT.guides) {
  references.push(...guide.productHandles.map((handle) => ({ where: `guide ${guide.slug}`, handle })))
}

const dangling = references.filter((ref) => !handles.has(ref.handle))
if (dangling.length) {
  problems += dangling.length
  console.log(`Dangling product references (${dangling.length}):`)
  for (const ref of dangling) {
    console.log(`  ! ${ref.where} points at "${ref.handle}", which is not in the catalogue.`)
  }
} else {
  console.log(`Product references: all ${references.length} resolve.`)
}
console.log()

// --- 3. Under-populated listings -------------------------------------------

const counts = new Map<string, number>()
for (const collection of COLLECTIONS) {
  const curated = CONTENT.curated.find((c) => c.path === collection.path)
  if (collection.curated) {
    counts.set(collection.path, curated?.handles.filter((h) => handles.has(h)).length ?? 0)
    continue
  }
  counts.set(collection.path, countMatching(collection))
}

const thin = [...counts.entries()].filter(([, count]) => count < MIN_PRODUCTS_PER_LISTING)
if (thin.length) {
  console.log(`Listings below the ${MIN_PRODUCTS_PER_LISTING}-product floor (${thin.length}).`)
  console.log('These redirect to their parent and stay out of the sitemap, by design.')
  console.log('Against the fixture catalogue this is expected. Against the real one it is a')
  console.log('merchandising decision: fill the listing or drop the route.')
  for (const [path, count] of thin) {
    console.log(`    ${path}  (${count})`)
  }
} else {
  console.log('Every listing clears the four-product floor.')
}
console.log()

if (problems) {
  console.log(`${problems} problem${problems === 1 ? '' : 's'} that need fixing.`)
  process.exitCode = 1
} else {
  console.log('No dangling references.')
}

function countMatching(collection: (typeof COLLECTIONS)[number]): number {
  const query = collection.query
  return catalogue.products.filter((product) => {
    if (query.tags && !query.tags.every((tag) => product.tags.includes(tag))) return false
    if (query.kinds) {
      const kind = product.tags.find((t) => t.startsWith('type:'))?.slice('type:'.length)
      if (!kind || !query.kinds.includes(kind as never)) return false
    }
    if (query.productTypes && !query.productTypes.includes(product.productType)) return false

    const cheapest = Math.min(...product.variants.map((v) => Math.round(Number(v.price) * 100)))
    if (query.minPriceMinor !== undefined && cheapest < query.minPriceMinor) return false
    if (query.maxPriceMinor !== undefined && cheapest > query.maxPriceMinor) return false

    return true
  }).length
}
