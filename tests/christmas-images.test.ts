import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import {
  withChristmasGallery,
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

// Deliberately not a real handle. This used to name a hamper that had no
// photograph yet, which made the test a hostage to the photography: the day
// every hamper had one, the test failed for the best possible reason. The
// behaviour under test is "handle not in the map", so the handle should be
// one that cannot be in the map.
const UNPHOTOGRAPHED = 'a-hamper-we-hold-no-christmas-photograph-for'

test('a hamper we hold no Christmas photograph for keeps its own image', () => {
  assert.ok(!(UNPHOTOGRAPHED in CHRISTMAS_IMAGES))
  const [kept] = withChristmasImages([card(UNPHOTOGRAPHED)])
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

test('the product page opens on the Christmas photograph, keeping every other image', () => {
  const everyday = [
    { url: 'https://cdn.shopify.com/a.png', alt: 'a', width: 1, height: 1 },
    { url: 'https://cdn.shopify.com/b.png', alt: 'b', width: 1, height: 1 },
  ]
  const gallery = withChristmasGallery('large-basket', everyday)
  assert.equal(gallery[0]!.url, '/photography/christmas/large-basket.webp')
  assert.equal(gallery.length, 3, 'nothing is dropped')
  assert.deepEqual(gallery.slice(1), everyday)
})

test('a hamper with no Christmas photograph keeps its gallery exactly', () => {
  const everyday = [{ url: 'https://cdn.shopify.com/a.png', alt: 'a', width: 1, height: 1 }]
  assert.deepEqual(withChristmasGallery(UNPHOTOGRAPHED, everyday), everyday)
})
