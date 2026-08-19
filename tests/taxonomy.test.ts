import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  findUnknownTags,
  isKnownTag,
  PRICE_BANDS,
  priceBandForMinor,
} from '../src/lib/commerce/taxonomy.ts'

test('the taxonomy is locked: free tagging is rejected', () => {
  assert.ok(isKnownTag('occasion:christmas'))
  assert.ok(isKnownTag('badge:exclusive'))
  assert.equal(isKnownTag('occasion:halloween'), false)
  assert.equal(isKnownTag('Occasion:Christmas'), false, 'tags are lowercase')
  assert.equal(isKnownTag('christmas'), false, 'tags are namespaced')
})

test('every offending tag is reported, not just the first', () => {
  const unknown = findUnknownTags([
    'type:hamper',
    'occasion:halloween',
    'recipient:dog',
    'badge:exclusive',
  ])
  assert.deepEqual(unknown, ['occasion:halloween', 'recipient:dog'])
})

test('price bands are exhaustive and do not overlap', () => {
  for (let i = 0; i < PRICE_BANDS.length - 1; i += 1) {
    const band = PRICE_BANDS[i]!
    const next = PRICE_BANDS[i + 1]!
    assert.equal(band.maxMinor! + 1, next.minMinor, `gap or overlap between band ${i} and ${i + 1}`)
  }
  assert.equal(PRICE_BANDS[PRICE_BANDS.length - 1]!.maxMinor, null, 'top band is open ended')
})

test('a price lands in exactly one band, including on the boundaries', () => {
  assert.equal(priceBandForMinor(0).tag, 'price:under-50')
  assert.equal(priceBandForMinor(4999).tag, 'price:under-50')
  assert.equal(priceBandForMinor(5000).tag, 'price:50-100')
  assert.equal(priceBandForMinor(9999).tag, 'price:50-100')
  assert.equal(priceBandForMinor(10000).tag, 'price:100-150')
  assert.equal(priceBandForMinor(14999).tag, 'price:100-150')
  assert.equal(priceBandForMinor(15000).tag, 'price:150-plus')
  assert.equal(priceBandForMinor(99999).tag, 'price:150-plus')
})
