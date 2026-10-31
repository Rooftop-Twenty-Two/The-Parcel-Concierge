import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterByTitle } from '../src/lib/commerce/search-match.ts'

const titles = [
  'Dows Ruby Port',
  'Dow’s 10 Yr Old Aged Tawny Port',
  "Graham's 3 x 200ml Port Selection Pack",
  'Fathers Day tech support',
  'Guinness Sport Metal Bottle',
  'Large Portable BBQ',
  'Wines of Spain and Portugal Puzzle',
  'Important Science Fact',
  'Pasta Portioning Board',
  'Tokara Directors Reserve',
  'Château Gérard Rouge',
]
const search = (term: string) => filterByTitle(titles, term, (t) => t)

test('"port" finds the ports and nothing that merely contains the letters', () => {
  assert.deepEqual(search('port'), [
    'Dows Ruby Port',
    'Dow’s 10 Yr Old Aged Tawny Port',
    "Graham's 3 x 200ml Port Selection Pack",
  ])
})

test('a half-typed last word still finds by prefix when nothing matches whole', () => {
  assert.deepEqual(search('tokara dir'), ['Tokara Directors Reserve'])
  assert.deepEqual(search('portab'), ['Large Portable BBQ'])
})

test('accents and apostrophes are folded', () => {
  assert.deepEqual(search('gerard'), ['Château Gérard Rouge'])
  assert.deepEqual(search("dow's tawny"), ['Dow’s 10 Yr Old Aged Tawny Port'])
})

test('plural of a searched word matches', () => {
  assert.deepEqual(filterByTitle(['Christmas Hampers'], 'hamper', (t) => t), ['Christmas Hampers'])
})
