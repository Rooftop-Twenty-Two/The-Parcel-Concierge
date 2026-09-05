import assert from 'node:assert/strict'
import { test } from 'node:test'
import { demoteHeadings } from '../src/lib/seo/demote-headings.ts'
import { productMetaDescription } from '../src/lib/seo/meta-description.ts'
import { DELIVERY } from '../src/lib/site-config.ts'

const wine = { title: 'Decoy Zinfandel', kind: 'wine' as const, descriptionHtml: '' }

/** The real line the product pages pass, so the test covers what ships. */
const DELIVERY_LINE = `${DELIVERY.national.label}, free over €100.`

test('a product with a description uses its own words', () => {
  const description = productMetaDescription({
    ...wine,
    descriptionHtml: '<p>A Zinfandel from Sonoma County.</p>',
  }, DELIVERY_LINE)
  assert.equal(description, 'A Zinfandel from Sonoma County.')
})

test('a product with no description still gets one', () => {
  const description = productMetaDescription(wine, DELIVERY_LINE)
  assert.ok(description.length > 0)
  assert.ok(description.startsWith('Decoy Zinfandel.'))
  assert.ok(description.includes('Dunshaughlin'))
})

test('the fallback claims nothing about how anything tastes', () => {
  const description = productMetaDescription(wine, DELIVERY_LINE).toLowerCase()
  for (const invented of ['notes of', 'palate', 'pairs', 'aroma', 'finish', 'crisp']) {
    assert.ok(!description.includes(invented), `fallback should not say "${invented}"`)
  }
})

test('a meta description stays inside what Google will render', () => {
  const long = productMetaDescription({
    ...wine,
    descriptionHtml: `<p>${'word '.repeat(200)}</p>`,
  }, DELIVERY_LINE)
  assert.ok(long.length <= 155)
  // Cut on a word boundary, so it never ends mid-word.
  assert.ok(!long.endsWith('wor'))
})

test('a merchant h1 in a description is demoted so the page keeps one h1', () => {
  const html = '<h1 class="text-30">CHIANTI CLASSICO</h1><p>Tuscany.</p>'
  const demoted = demoteHeadings(html)
  assert.equal(demoted, '<h3 class="text-30">CHIANTI CLASSICO</h3><p>Tuscany.</p>')
  assert.ok(!/<h1/i.test(demoted))
})

test('demotion leaves h3 and below where they are', () => {
  assert.equal(demoteHeadings('<h3>Contents</h3><h4>Allergens</h4>'), '<h3>Contents</h3><h4>Allergens</h4>')
})

test('demotion handles h2 and mixed case tags', () => {
  assert.equal(demoteHeadings('<H2>Tasting</H2>'), '<h3>Tasting</h3>')
})
