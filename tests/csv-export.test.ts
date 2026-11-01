import assert from 'node:assert/strict'
import { test } from 'node:test'
import { csvCell, toCsv } from '../src/lib/corporate/csv.ts'

test('quotes cells and doubles inner quotes', () => {
  assert.equal(csvCell('Mary'), '"Mary"')
  assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  assert.equal(csvCell(42), '"42"')
})

test('prefixes cells that would open as a formula', () => {
  for (const start of ['=', '+', '-', '@', '\t', '\r']) {
    assert.equal(csvCell(`${start}1`), `"'${start}1"`)
  }
})

test('leaves ordinary text alone, including a character mid-cell', () => {
  assert.equal(csvCell('D02 X285'), '"D02 X285"')
  assert.equal(csvCell('Happy Christmas - from all of us'), '"Happy Christmas - from all of us"')
  assert.equal(csvCell(''), '""')
})

test('joins rows with CRLF', () => {
  assert.equal(toCsv([['a', 'b'], ['c', '=d']]), '"a","b"\r\n"c","\'=d"')
})
