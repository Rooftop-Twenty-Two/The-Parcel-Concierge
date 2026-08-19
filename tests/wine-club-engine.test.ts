import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { WineProfile } from '../src/lib/wine-club/profiles.ts'
import { BUDGET_TIERS, MATCH_WEIGHTS, alternatives, recommend } from '../src/lib/wine-club/recommend.ts'
import { QUIZ, describeProfile, emptyProfile, scoreQuiz } from '../src/lib/wine-club/taste.ts'

/**
 * The recommendation engine, tested against synthetic wines so the tests
 * pin behaviour, not the shifting contents of the shop's list.
 */

function wine(overrides: Partial<WineProfile> & { handle: string }): WineProfile {
  return {
    title: overrides.handle,
    wineType: 'red',
    priceMinor: 2000,
    grapes: ['Merlot'],
    country: 'France',
    region: null,
    vintage: null,
    producer: 'Producer A',
    image: null,
    exclusive: false,
    adventureLevel: 1,
    attributes: {
      sweetness: 30, acidity: 50, bitterness: 50, body: 60,
      fruitiness: 55, richness: 55, freshness: 40, savoury: 50, aromatic: 45,
    },
    ...overrides,
  }
}

const fresh = { ...emptyProfile(), freshness: 90, acidity: 85, body: 20 }

test('the quiz weights configuration is sane', () => {
  assert.equal(QUIZ.length, 7)
  const total = MATCH_WEIGHTS.taste + MATCH_WEIGHTS.budget + MATCH_WEIGHTS.adventure
  assert.ok(Math.abs(total - 1) < 1e-9, 'match weights must sum to 1')
})

test('answers move the profile in the direction they claim to', () => {
  const sweet = scoreQuiz({ chocolate: 'white', coffee: 'sweet' })
  const bitter = scoreQuiz({ chocolate: 'dark', coffee: 'black', drink: 'negroni' })
  assert.ok(sweet.sweetness > 60, `sweet profile sweetness ${sweet.sweetness}`)
  assert.ok(bitter.bitterness > 70, `bitter profile bitterness ${bitter.bitterness}`)
  assert.ok(sweet.bitterness < 40)
})

test('an empty quiz is neutral, not an error', () => {
  const profile = scoreQuiz({})
  assert.deepEqual(profile, emptyProfile())
  assert.ok(describeProfile(profile).length > 0)
})

test('the profile reveal never contains a number', () => {
  const words = describeProfile(scoreQuiz({ chocolate: 'dark', comfort: 'beef', flavour: 'bold' }))
  for (const word of words) assert.ok(!/\d/.test(word), word)
})

test('wine type is a hard filter', () => {
  const wines = [
    wine({ handle: 'red-1', wineType: 'red' }),
    wine({ handle: 'white-1', wineType: 'white' }),
  ]
  const result = recommend({ tasteProfile: fresh, mix: { white: 1 }, budgetTierId: 'everyday' }, wines)
  assert.deepEqual(result.recommendations.map((r) => r.handle), ['white-1'])
})

test('excluded wines never come back, even when they are the only option', () => {
  const wines = [wine({ handle: 'only' })]
  const result = recommend(
    { tasteProfile: fresh, mix: { red: 1 }, budgetTierId: 'everyday', excludeHandles: ['only'] },
    wines,
  )
  assert.equal(result.recommendations.length, 0)
})

test('budget is a hard filter until the ladder loosens it a fifth', () => {
  const wines = [
    wine({ handle: 'in-band', priceMinor: 2000 }),
    wine({ handle: 'way-over', priceMinor: 9000 }),
    wine({ handle: 'slightly-under', priceMinor: 1100 }),
  ]
  const result = recommend({ tasteProfile: fresh, mix: { red: 2 }, budgetTierId: 'everyday' }, wines)
  const handles = result.recommendations.map((r) => r.handle)
  assert.ok(handles.includes('in-band'))
  assert.ok(!handles.includes('way-over'), 'a €90 bottle is not an everyday discovery')
  // 1100 is within 20% of the 1200 floor, so the ladder may reach it.
  assert.equal(result.relaxed, 'budget')
  assert.ok(handles.includes('slightly-under'))
})

test('a full box respects the diversity caps when stock allows it', () => {
  const grapes = ['Merlot', 'Syrah', 'Garnacha', 'Tempranillo', 'Barbera', 'Malbec']
  const countries = ['France', 'Spain', 'Italy', 'Chile']
  const wines = Array.from({ length: 12 }, (_, i) =>
    wine({
      handle: `r${i}`,
      grapes: [grapes[i % grapes.length]!],
      producer: `House ${i % 5}`,
      country: countries[i % countries.length]!,
    }),
  )
  const result = recommend({ tasteProfile: fresh, mix: { red: 6 }, budgetTierId: 'everyday' }, wines)
  assert.equal(result.recommendations.length, 6)
  const byGrape = new Map<string, number>()
  const byCountry = new Map<string, number>()
  for (const r of result.recommendations) {
    for (const g of r.grapes) byGrape.set(g, (byGrape.get(g) ?? 0) + 1)
    if (r.country) byCountry.set(r.country, (byCountry.get(r.country) ?? 0) + 1)
  }
  for (const [g, n] of byGrape) assert.ok(n <= 2, `${n} ${g} in one box`)
  for (const [c, n] of byCountry) assert.ok(n <= 3, `${n} from ${c} in one box`)
  assert.equal(result.relaxed, null)
})

test('diversity gives way before the box goes out short, keeping what variety it can', () => {
  const wines = Array.from({ length: 8 }, (_, i) =>
    wine({
      handle: `same${i}`,
      grapes: [i < 7 ? 'Merlot' : 'Syrah'],
      producer: i < 7 ? 'Same House' : 'Other House',
      country: 'France',
    }),
  )
  const result = recommend({ tasteProfile: fresh, mix: { red: 6 }, budgetTierId: 'everyday' }, wines)
  assert.equal(result.recommendations.length, 6, 'the box still fills')
  assert.equal(result.relaxed, 'diversity')
  // The one Syrah in stock is in the box: relaxing tops up, it does not
  // throw the diverse picks away.
  assert.ok(result.recommendations.some((r) => r.grapes.includes('Syrah')))
})

test('a fresher palate ranks the fresher wine first', () => {
  const wines = [
    wine({
      handle: 'heavy',
      attributes: { sweetness: 20, acidity: 35, bitterness: 70, body: 90, fruitiness: 40, richness: 85, freshness: 15, savoury: 70, aromatic: 30 },
    }),
    wine({
      handle: 'crisp',
      attributes: { sweetness: 30, acidity: 85, bitterness: 20, body: 25, fruitiness: 60, richness: 25, freshness: 90, savoury: 25, aromatic: 60 },
    }),
  ]
  const result = recommend({ tasteProfile: fresh, mix: { red: 1 }, budgetTierId: 'everyday' }, wines)
  assert.equal(result.recommendations[0]!.handle, 'crisp')
})

test('the box charge is the tier floor times the bottle count', () => {
  const wines = Array.from({ length: 6 }, (_, i) => wine({ handle: `w${i}`, priceMinor: 2200 }))
  const result = recommend({ tasteProfile: fresh, mix: { red: 6 }, budgetTierId: 'everyday' }, wines)
  const tier = BUDGET_TIERS.find((t) => t.id === 'everyday')!
  assert.equal(result.boxChargeMinor, tier.chargeMinor * 6)
  assert.ok(result.boxValueMinor >= result.boxChargeMinor, 'the box is worth at least what it costs')
})

test('every recommendation explains itself in words, not numbers', () => {
  const wines = [wine({ handle: 'a' }), wine({ handle: 'b', grapes: ['Syrah'] })]
  const result = recommend({ tasteProfile: fresh, mix: { red: 2 }, budgetTierId: 'everyday' }, wines)
  for (const r of result.recommendations) {
    assert.ok(r.reason.length > 10, 'a reason exists')
    assert.ok(!/%|\d\.\d/.test(r.reason), `no pseudo-precision: ${r.reason}`)
    assert.ok(['A great match', 'A good match', 'Something different'].includes(r.matchLabel))
  }
})

test('alternatives are the same colour and never the wine being swapped', () => {
  const wines = [
    wine({ handle: 'swapping-out' }),
    wine({ handle: 'alt-1', grapes: ['Syrah'] }),
    wine({ handle: 'alt-2', grapes: ['Garnacha'] }),
    wine({ handle: 'white-decoy', wineType: 'white' }),
  ]
  const alts = alternatives(
    { tasteProfile: fresh, mix: {}, budgetTierId: 'everyday', excludeHandles: ['swapping-out'], wineType: 'red' },
    wines,
  )
  assert.ok(alts.length >= 2)
  for (const alt of alts) {
    assert.equal(alt.wineType, 'red')
    assert.notEqual(alt.handle, 'swapping-out')
  }
})
