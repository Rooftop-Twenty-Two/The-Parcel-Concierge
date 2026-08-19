import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateProduct } from '../scripts/ingest/validate.ts'
import type { CatalogueProduct } from '../src/lib/catalogue/schema.ts'

/**
 * These cover the rules the brief says must not be broken. Each one is a
 * "do not" from section 12, so a regression here is a regression against
 * the brief rather than against a preference.
 */

function baseHamper(overrides: Partial<CatalogueProduct> = {}): CatalogueProduct {
  return {
    handle: 'the-test-hamper',
    title: 'The Test Hamper',
    descriptionHtml:
      '<p>A food hamper built from producers near us.</p><p>The cheese comes from Kilbeg Dairy, three miles up the road, and the crackers from Sheridans in Meath. We buy from both directly and pack the box ourselves in Dunshaughlin.</p><p>It arrives in a deep kraft box, tissue lined and hand tied with ribbon, with your message written on a card inside the lid.</p>',
    productType: 'Food hamper',
    vendor: 'The Parcel Concierge',
    tags: ['type:hamper', 'price:50-100', 'occasion:thank-you'],
    images: [
      { src: '/a.png', alt: 'The hamper styled on a linen cloth with the lid open', width: 1200, height: 1500 },
      { src: '/b.png', alt: 'Everything inside the hamper laid out flat', width: 1200, height: 1500 },
      { src: '/c.png', alt: 'The hamper boxed and hand tied with ribbon', width: 1200, height: 1500 },
      { src: '/d.png', alt: 'The hamper held in two hands to show its size', width: 1200, height: 1500 },
    ],
    variants: [{ sku: 'TPC-TEST-1', title: 'Default Title', price: '65.00', inventoryQuantity: 5 }],
    hamper: {
      contents: [{ name: 'Kilbeg Farmhouse Cheddar', producer: 'Kilbeg Dairy', size: '200g' }],
      allergens: 'Contains milk, gluten.',
      containsAlcohol: false,
      packaging: 'A deep kraft box, tissue lined and hand tied.',
      occasionTags: ['occasion:thank-you'],
    },
    ...overrides,
  }
}

function errorFields(product: CatalogueProduct): string[] {
  return validateProduct(product)
    .filter((i) => i.severity === 'error')
    .map((i) => i.field)
}

test('a well formed hamper passes', () => {
  assert.deepEqual(errorFields(baseHamper()), [])
})

test('a hamper with no allergens is blocked', () => {
  const product = baseHamper()
  product.hamper!.allergens = '   '
  assert.ok(errorFields(product).includes('hamper.allergens'))
})

test('a hamper with no contents is blocked', () => {
  const product = baseHamper()
  product.hamper!.contents = []
  assert.ok(errorFields(product).includes('hamper.contents'))
})

test('a product with no images is blocked', () => {
  const product = baseHamper({ images: [] })
  assert.ok(errorFields(product).includes('images'))
})

test('a hamper with fewer than four images is blocked', () => {
  const product = baseHamper()
  product.images = product.images.slice(0, 2)
  assert.ok(errorFields(product).includes('images'))
})

test('alt text that describes nothing is blocked', () => {
  const product = baseHamper()
  product.images[1]!.alt = 'Image 2'
  assert.ok(errorFields(product).includes('images[1].alt'))
})

test('empty alt text is blocked', () => {
  const product = baseHamper()
  product.images[0]!.alt = ''
  assert.ok(errorFields(product).includes('images[0].alt'))
})

test('a tag outside the locked taxonomy is blocked', () => {
  const product = baseHamper()
  product.tags = [...product.tags, 'occasion:halloween']
  assert.ok(errorFields(product).includes('tags'))
})

test('a price tag that disagrees with the price is blocked', () => {
  const product = baseHamper()
  product.variants[0]!.price = '210.00'
  // Still tagged price:50-100, which would put it on the wrong budget page.
  assert.ok(errorFields(product).includes('tags'))
})

test('an em dash is blocked', () => {
  const product = baseHamper({
    descriptionHtml: '<p>A food hamper — built from producers near us and packed by hand here.</p>',
  })
  assert.ok(errorFields(product).includes('descriptionHtml'))
})

test('banned words are blocked', () => {
  for (const word of ['curated', 'indulge', 'perfect for', 'elevate', 'luxurious']) {
    const product = baseHamper({
      descriptionHtml: `<p>A hamper that is ${word} a gift and packed by hand in Meath.</p>`,
    })
    assert.ok(
      errorFields(product).includes('descriptionHtml'),
      `expected "${word}" to be blocked`,
    )
  }
})

test('a popularity claim with no sales data behind it is blocked', () => {
  const product = baseHamper({
    descriptionHtml: '<p>Our bestselling hamper, packed by hand in Meath from Irish producers.</p>',
  })
  assert.ok(errorFields(product).includes('descriptionHtml'))
})

test('a handle that collides with a listing route is blocked', () => {
  // /hampers/under-75 is a listing. A product with that handle would be
  // permanently unreachable, because the route resolver checks collections
  // first by design.
  const product = baseHamper({ handle: 'under-75' })
  assert.ok(errorFields(product).includes('handle'))
})

test('badge:exclusive and is_exclusive_import must agree', () => {
  const wine: CatalogueProduct = {
    handle: 'a-test-wine',
    title: 'A Test Wine',
    descriptionHtml:
      '<p>Sharp green apple and lemon, dry, with a chalky edge that makes your mouth water.</p><p>Made by a family domaine on the limestone that gives the wine its bite.</p><p>Drink it with oysters or a roast chicken.</p>',
    productType: 'White wine',
    vendor: 'Test',
    tags: ['type:wine', 'price:under-50', 'badge:exclusive'],
    images: [{ src: '/w.png', alt: 'A bottle against a plain background', width: 800, height: 1000 }],
    variants: [{ sku: 'TPC-TEST-W', title: 'Default Title', price: '30.00', inventoryQuantity: 5 }],
    wine: { producer: 'Test', isExclusiveImport: false },
  }
  assert.ok(errorFields(wine).includes('wine.is_exclusive_import'))

  wine.wine!.isExclusiveImport = true
  assert.equal(errorFields(wine).includes('wine.is_exclusive_import'), false)
})

test('a product held for review is never written', () => {
  const product = baseHamper({ needsReview: 'Allergen data is missing from the supplier sheet.' })
  assert.ok(errorFields(product).includes('needsReview'))
})
