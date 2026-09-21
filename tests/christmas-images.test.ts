import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import {
  CHRISTMAS_IMAGES,
  CHRISTMAS_IMAGE_PATHS,
  withChristmasImages,
} from '../src/lib/commerce/christmas-images.ts'
import type { ProductCard } from '../src/lib/commerce/types.ts'

function card(handle: string): ProductCard {
  return {
    id: `gid://shopify/Product/${handle}`,
    handle,
    title: handle,
    kind: 'hamper',
    priceRange: {
      min: { amountMinor: 9900, currencyCode: 'EUR' },
      max: { amountMinor: 9900, currencyCode: 'EUR' },
    },
    image: { url: 'https://cdn.shopify.com/everyday.png', alt: 'The everyday photograph', width: 1, height: 1 },
    badges: [],
    tags: [],
    availableForSale: true,
  } as unknown as ProductCard
}

test('a hamper we hold Christmas photography for gets it, and nothing else changes', () => {
  const [swapped] = withChristmasImages([card('large-basket')])
  assert.equal(swapped!.image!.url, '/photography/christmas/large-basket.webp')
  assert.match(swapped!.image!.alt, /Christmas/i)
  // Price, stock and link are untouched: same product, different photograph.
  assert.equal(swapped!.handle, 'large-basket')
  assert.equal(swapped!.priceRange.min.amountMinor, 9900)
  assert.equal(swapped!.availableForSale, true)
})

test('a hamper we hold no Christmas photograph for keeps its own image', () => {
  const [kept] = withChristmasImages([card('the-perfect-duo')])
  assert.equal(kept!.image!.url, 'https://cdn.shopify.com/everyday.png')
})

test('every mapped image file exists, so no listing renders a broken image', () => {
  for (const [handle, image] of Object.entries(CHRISTMAS_IMAGES)) {
    assert.ok(
      existsSync(new URL(`../public${image.src}`, import.meta.url)),
      `${handle} points at ${image.src}, which is not in public/`,
    )
    assert.ok(image.alt.length > 20, `${handle} needs real alt text`)
  }
})

test('only the Christmas listing swaps images; the hub and the budget bands do not', () => {
  assert.ok(CHRISTMAS_IMAGE_PATHS.has('/occasions/christmas'))
  for (const path of ['/hampers', '/hampers/under-75', '/hampers/75-125', '/']) {
    assert.equal(CHRISTMAS_IMAGE_PATHS.has(path), false, `${path} must keep the everyday photograph`)
  }
})
