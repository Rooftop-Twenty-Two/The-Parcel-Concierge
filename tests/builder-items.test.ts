import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { AISLE_TAGS } from '../src/lib/commerce/taxonomy.ts'
import { productPathFor } from '../src/lib/routes.ts'

/**
 * The quarantine.
 *
 * The main site sells hampers and wine. Everything else the shop carries
 * is sold only inside the hamper builder, and these tests hold the data
 * side of that promise: every builder item is marked as one, sorted into
 * exactly one aisle, and cannot collide with a product that has a real URL.
 */

type CatalogueFile = {
  products: { handle: string; title: string; tags: string[]; images: unknown[]; variants: { price: string }[] }[]
}

function load(file: string): CatalogueFile {
  return JSON.parse(readFileSync(join(process.cwd(), 'data/catalogue', file), 'utf8'))
}

const builderItems = load('builder-items.json')
const wines = load('wines.json')
const fixtures = load('fixtures.json')

test('every builder item carries the quarantine tag', () => {
  for (const p of builderItems.products) {
    assert.ok(p.tags.includes('type:builder-item'), `${p.handle} is missing type:builder-item`)
  }
})

test('every builder item is in exactly one aisle, and the aisle is known', () => {
  const known = new Set<string>(AISLE_TAGS)
  for (const p of builderItems.products) {
    const aisles = p.tags.filter((t) => t.startsWith('aisle:'))
    assert.equal(aisles.length, 1, `${p.handle} has ${aisles.length} aisles`)
    assert.ok(known.has(aisles[0]!), `${p.handle} has unknown aisle ${aisles[0]}`)
  }
})

test('no builder item shares a handle with a product that has a URL', () => {
  const taken = new Set([
    ...wines.products.map((p) => p.handle),
    ...fixtures.products.map((p) => p.handle),
  ])
  for (const p of builderItems.products) {
    assert.ok(!taken.has(p.handle), `${p.handle} exists on the main site too`)
  }
})

test('every builder item is pickable: priced and photographed', () => {
  for (const p of builderItems.products) {
    assert.ok(p.images.length > 0, `${p.handle} has no image`)
    assert.ok(
      p.variants.some((v) => Number(v.price) > 0),
      `${p.handle} has no sellable price`,
    )
  }
})

test('a builder item has no URL of its own', () => {
  assert.equal(productPathFor('builder-item', 'anything'), '/build-your-own-hamper')
})
