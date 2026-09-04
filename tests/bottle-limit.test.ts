import assert from 'node:assert/strict'
import { test } from 'node:test'
import { countBottles, exceedsBottleLimit } from '../src/lib/commerce/bottle-limit.ts'
import { DELIVERY } from '../src/lib/site-config.ts'

/**
 * The per-order bottle limit.
 *
 * Confirmed by the client, September 2026: we deliver up to six bottles in
 * one order. This is a rule about what the business can physically send, so
 * it gets a test rather than living only in a server action.
 */

const bottle = (quantity: number) => ({ isBottle: true, quantity })
const other = (quantity: number) => ({ isBottle: false, quantity })

test('bottles are counted by quantity, not by line', () => {
  assert.equal(countBottles([]), 0)
  assert.equal(countBottles([bottle(1)]), 1)
  // One line of six is six, which is the case the client hit: the cart
  // quantity box, not six separate add-to-carts.
  assert.equal(countBottles([bottle(6)]), 6)
  assert.equal(countBottles([bottle(2), bottle(3)]), 5)
})

test('only bottle lines count towards the limit', () => {
  // A hamper, a candle and a card are not bottles.
  assert.equal(countBottles([other(4)]), 0)
  assert.equal(countBottles([bottle(2), other(9)]), 2)
})

test('the limit allows exactly the maximum and refuses one more', () => {
  assert.equal(exceedsBottleLimit(0, 6, 6), false)
  assert.equal(exceedsBottleLimit(5, 1, 6), false)
  // The report that started this: a seventh bottle.
  assert.equal(exceedsBottleLimit(6, 1, 6), true)
  assert.equal(exceedsBottleLimit(0, 7, 6), true)
  assert.equal(exceedsBottleLimit(4, 3, 6), true)
})

test('a null limit is no limit', () => {
  assert.equal(exceedsBottleLimit(100, 100, null), false)
})

test('the configured limit is the six the client asked for', () => {
  assert.equal(DELIVERY.maxBottlesPerOrder, 6)
})
