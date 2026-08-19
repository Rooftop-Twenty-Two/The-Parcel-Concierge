import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MAX_FIRST,
  MAX_STEPS,
  firstForStep,
  hasMore,
  nextStepHref,
  parseStep,
} from '../src/lib/commerce/pagination.ts'

test('a missing or unparseable step is the first page', () => {
  assert.equal(parseStep(undefined), 1)
  assert.equal(parseStep(''), 1)
  assert.equal(parseStep('banana'), 1)
  assert.equal(parseStep('0'), 1)
  assert.equal(parseStep('-4'), 1)
})

test('a crafted step cannot ask for an unbounded page', () => {
  assert.equal(parseStep('999999'), MAX_STEPS)
  assert.ok(firstForStep(24, MAX_STEPS) <= MAX_FIRST)
  assert.ok(firstForStep(48, MAX_STEPS) <= MAX_FIRST)
})

test('each step asks for one more page worth, from the start', () => {
  assert.equal(firstForStep(24, 1), 24)
  assert.equal(firstForStep(24, 2), 48)
  assert.equal(firstForStep(48, 3), 144)
})

test('paging keeps the filters the reader has set', () => {
  const href = nextStepHref('/wine/red', { grape: 'malbec', country: 'argentina' }, 1)
  const url = new URL(href, 'https://example.com')
  assert.equal(url.pathname, '/wine/red')
  assert.equal(url.searchParams.get('grape'), 'malbec')
  assert.equal(url.searchParams.get('country'), 'argentina')
  assert.equal(url.searchParams.get('more'), '2')
})

test('paging replaces the old step rather than stacking another one', () => {
  const href = nextStepHref('/wine/red', { more: '3', grape: 'malbec' }, 3)
  const url = new URL(href, 'https://example.com')
  assert.deepEqual(url.searchParams.getAll('more'), ['4'])
})

test('a repeated filter survives paging', () => {
  const href = nextStepHref('/wine/red', { grape: ['malbec', 'syrah'] }, 1)
  const url = new URL(href, 'https://example.com')
  assert.deepEqual(url.searchParams.getAll('grape'), ['malbec', 'syrah'])
})

test('the next step lands the reader at the end of what they read', () => {
  assert.ok(nextStepHref('/wine/red', {}, 1).endsWith('#more'))
})

test('there is no next step past the caps, whatever the source says', () => {
  const more = { hasNextPage: true }
  assert.equal(hasMore(more, 1, 24), true)
  assert.equal(hasMore(more, MAX_STEPS, 24), false)
  // 48 a page hits the Storefront ceiling before the step ceiling.
  assert.equal(hasMore(more, 6, 48), false)
})

test('there is no next step when the source says there is nothing left', () => {
  assert.equal(hasMore({ hasNextPage: false }, 1, 24), false)
})
