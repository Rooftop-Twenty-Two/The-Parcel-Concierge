import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addMoney,
  formatMinor,
  formatMoney,
  formatPriceRange,
  multiplyMoney,
  toMinor,
} from '../src/lib/commerce/money.ts'

test('parses Shopify decimal strings without float error', () => {
  assert.equal(toMinor('158.00'), 15800)
  assert.equal(toMinor('7.95'), 795)
  // 0.1 + 0.2 territory. Parsing through the string avoids it entirely.
  assert.equal(toMinor('1.10'), 110)
  assert.equal(toMinor('0.07'), 7)
  assert.equal(toMinor('19.9'), 1990)
  assert.equal(toMinor('19'), 1900)
})

test('handles negative amounts, which discounts produce', () => {
  assert.equal(toMinor('-10.50'), -1050)
})

test('does not round away the third decimal place', () => {
  // Shopify sends two decimals. If a third ever appears we truncate rather
  // than round, so a price can never be shown as more than we charge.
  assert.equal(toMinor('9.999'), 999)
})

test('whole euro prices render without decimals', () => {
  assert.equal(formatMoney({ amountMinor: 15800, currencyCode: 'EUR' }), '€158')
  assert.equal(formatMoney({ amountMinor: 795, currencyCode: 'EUR' }), '€7.95')
  assert.equal(formatMinor(6500), '€65')
})

test('adding money rejects a currency mismatch rather than silently summing', () => {
  const eur = { amountMinor: 100, currencyCode: 'EUR' }
  const gbp = { amountMinor: 100, currencyCode: 'GBP' }
  assert.equal(addMoney(eur, eur).amountMinor, 200)
  assert.throws(() => addMoney(eur, gbp), /Cannot add/)
})

test('multiplying keeps integer minor units', () => {
  assert.equal(multiplyMoney({ amountMinor: 795, currencyCode: 'EUR' }, 3).amountMinor, 2385)
})

test('a single price renders bare, a range renders as "From"', () => {
  const min = { amountMinor: 9500, currencyCode: 'EUR' }
  assert.equal(formatPriceRange({ min, max: min }), '€95')
  assert.equal(
    formatPriceRange({ min, max: { amountMinor: 14000, currencyCode: 'EUR' } }),
    'From €95',
  )
})
