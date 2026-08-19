import assert from 'node:assert/strict'
import { test } from 'node:test'
import { join } from 'node:path'
import { parseRedirects } from '../scripts/redirects/parse.mjs'
import { COLLECTIONS } from '../src/lib/commerce/collections.ts'

const CSV = join(process.cwd(), 'data/redirects/redirects.csv')

test('the redirect map parses without errors', () => {
  const { errors } = parseRedirects(CSV)
  assert.deepEqual(errors, [])
})

test('every source appears once', () => {
  const { rows } = parseRedirects(CSV)
  const sources = rows.map((r) => r.source)
  const duplicates = sources.filter((s, i) => sources.indexOf(s) !== i)
  assert.deepEqual(duplicates, [], 'a duplicate source means the second rule never fires')
})

test('nothing redirects to itself', () => {
  const { rows } = parseRedirects(CSV)
  for (const row of rows) {
    assert.notEqual(row.destination.split('?')[0], row.source, `${row.source} redirects to itself`)
  }
})

test('there are no redirect chains', () => {
  const { rows } = parseRedirects(CSV)
  const bySource = new Map(rows.map((r) => [r.source, r]))
  for (const row of rows) {
    const destination = row.destination.split('?')[0]!
    assert.equal(
      bySource.has(destination),
      false,
      `${row.source} chains through ${destination}. Point it straight at the final destination.`,
    )
  }
})

test('no removed product or collection is sent to the homepage', () => {
  // Brief section 9: every removed product 301s to its parent listing page,
  // not to the homepage. Sending them all home throws away the link equity
  // and dumps the shopper nowhere near what they wanted.
  const { rows } = parseRedirects(CSV)
  const homeBound = rows.filter((r) => r.destination === '/')
  assert.deepEqual(
    homeBound.map((r) => r.source),
    [],
    'these should point at their parent listing instead',
  )
})

test('removed grape collections keep the grape as a filter', () => {
  const { rows } = parseRedirects(CSV)
  const grapeRules = rows.filter((r) => r.destination.startsWith('/wine?grape='))
  assert.ok(grapeRules.length > 0, 'expected grape collections to redirect into the wine filter')
  for (const rule of grapeRules) {
    assert.ok(
      rule.source.startsWith('/collections/'),
      `${rule.source} is not an old collection path`,
    )
  }
})

test('every destination is a real route on the new site', () => {
  const { rows } = parseRedirects(CSV)
  const collectionPaths = new Set(COLLECTIONS.map((c) => c.path))
  const staticPaths = new Set([
    '/',
    '/hampers',
    '/wine',
    '/wine-club',
    '/wine-club/build',
    '/gifts',
    '/gift-card',
    '/build-your-own-hamper',
    '/corporate-gifting',
    '/corporate-gifting/bulk-orders',
    '/corporate-gifting/branding-personalisation',
    '/corporate-gifting/enquiry',
    '/occasions',
    '/gifts-for',
    '/gifts-by-budget',
    '/guides',
    '/about',
    '/about/our-makers',
    '/about/guaranteed-irish',
    '/delivery',
    '/faq',
    '/contact',
    '/legal/terms',
    '/legal/privacy',
    '/legal/returns',
    '/legal/cookies',
  ])

  for (const row of rows) {
    const path = row.destination.split('?')[0]!
    const known =
      staticPaths.has(path) ||
      collectionPaths.has(path) ||
      ['/hampers/', '/wine/', '/gifts/', '/guides/'].some(
        (prefix) => path.startsWith(prefix) && path.length > prefix.length,
      )
    assert.ok(known, `${row.source} redirects to ${path}, which is not a route`)
  }
})

test('every rule carries a note for the client review', () => {
  const { rows } = parseRedirects(CSV)
  for (const row of rows) {
    assert.ok(row.note.length > 0, `line ${row.line}: ${row.source} has no note`)
  }
})
