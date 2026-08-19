import assert from 'node:assert/strict'
import { test } from 'node:test'
import { join } from 'node:path'
import {
  BUILDER_PARENT_HANDLE,
  COLLECTIONS,
  HIDDEN_FROM_LISTINGS,
  MIN_PRODUCTS_PER_LISTING,
  collectionsInHub,
  getCollectionByPath,
} from '../src/lib/commerce/collections.ts'
import { parseRedirects } from '../scripts/redirects/parse.ts'
import { productPathFor } from '../src/lib/routes.ts'
import { ALL_TAGS } from '../src/lib/commerce/taxonomy.ts'

test('a product has exactly one canonical URL, decided by its kind', () => {
  assert.equal(productPathFor('hamper', 'the-meath-larder'), '/hampers/the-meath-larder')
  assert.equal(productPathFor('wine', 'barone-ferri-barolo'), '/wine/barone-ferri-barolo')
  assert.equal(productPathFor('spirit', 'tara-hill-small-batch-gin'), '/wine/tara-hill-small-batch-gin')
  assert.equal(productPathFor('addon', 'wild-gorse-soy-candle'), '/gifts/wild-gorse-soy-candle')
})

test('collection paths are unique', () => {
  const paths = COLLECTIONS.map((c) => c.path)
  assert.equal(new Set(paths).size, paths.length)
})

test('every collection path is its hub plus its slug', () => {
  for (const collection of COLLECTIONS) {
    assert.equal(collection.path, `/${collection.hub}/${collection.slug}`)
  }
})

test('every collection has a parent that is not itself', () => {
  for (const collection of COLLECTIONS) {
    assert.notEqual(
      collection.parentPath,
      collection.path,
      `${collection.path} would redirect to itself when under-populated`,
    )
    assert.ok(collection.parentPath.startsWith('/'))
  }
})

test('collection queries only use tags from the locked taxonomy', () => {
  const known = new Set<string>(ALL_TAGS)
  for (const collection of COLLECTIONS) {
    for (const tag of collection.query.tags ?? []) {
      assert.ok(known.has(tag), `${collection.path} queries unknown tag "${tag}"`)
    }
  }
})

test('curated listings do not also carry a tag query', () => {
  // A curated listing is curated because a query cannot pick the right
  // products. Carrying both would make it ambiguous which one wins.
  for (const collection of COLLECTIONS.filter((c) => c.curated)) {
    assert.equal(
      collection.query.tags,
      undefined,
      `${collection.path} is curated but also has a tag query`,
    )
  }
})

test('grape variety is a facet, never a route', () => {
  // The old site had roughly 50 grape sub-collections. None of them should
  // come back as routes.
  const grapeRoutes = COLLECTIONS.filter((c) =>
    ['malbec', 'merlot', 'chardonnay', 'pinot-noir', 'tempranillo', 'nebbiolo'].includes(c.slug),
  )
  assert.deepEqual(grapeRoutes, [])

  const wineListings = collectionsInHub('wine')
  assert.ok(
    wineListings.some((c) => c.facets.includes('grape')),
    'grape must be available as a filter somewhere in the wine hub',
  )
})

test('the hamper hub carries the four budget bands', () => {
  for (const path of [
    '/hampers/under-75',
    '/hampers/75-125',
    '/hampers/125-200',
    '/hampers/luxury-200-plus',
  ]) {
    assert.ok(getCollectionByPath(path), `${path} is missing`)
  }
})

test('hamper budget bands tile the price line without gaps or overlaps', () => {
  const bands = [
    getCollectionByPath('/hampers/under-75')!,
    getCollectionByPath('/hampers/75-125')!,
    getCollectionByPath('/hampers/125-200')!,
    getCollectionByPath('/hampers/luxury-200-plus')!,
  ]
  for (let i = 0; i < bands.length - 1; i += 1) {
    const max = bands[i]!.query.maxPriceMinor!
    const nextMin = bands[i + 1]!.query.minPriceMinor!
    assert.equal(max + 1, nextMin, `gap between ${bands[i]!.path} and ${bands[i + 1]!.path}`)
  }
  assert.equal(bands[bands.length - 1]!.query.maxPriceMinor, undefined)
})

test('every alcohol listing is flagged so the age gate arms', () => {
  for (const collection of collectionsInHub('wine')) {
    assert.ok(collection.alcohol, `${collection.path} sells alcohol but is not flagged`)
  }
})

test('the four-product floor is what the brief says', () => {
  assert.equal(MIN_PRODUCTS_PER_LISTING, 4)
})

test('the hamper builder parent is hidden from listings and has one URL', () => {
  // It is a real Shopify product so the box can be priced, but it is a
  // mechanism rather than a hamper you buy off a grid. Left visible it
  // appears in every hamper listing priced "From €8", and
  // /hampers/build-your-own-hamper becomes a second, worse URL for the
  // builder.
  assert.ok(HIDDEN_FROM_LISTINGS.has(BUILDER_PARENT_HANDLE))

  const { rows } = parseRedirects(join(process.cwd(), 'data/redirects/redirects.csv'))
  const rule = rows.find((r) => r.source === `/hampers/${BUILDER_PARENT_HANDLE}`)
  assert.ok(rule, 'the old product URL needs a redirect to the builder')
  assert.equal(rule.destination, '/build-your-own-hamper')
})
