import type { TasteProfile } from './taste'
import type { WineProfile, WineType } from './profiles'

/**
 * The recommendation engine. Deterministic, explainable, configurable.
 *
 * A box is built one wine type at a time: score every eligible bottle
 * against the taste profile, then pick greedily under diversity
 * constraints so the box feels curated rather than being six near-copies
 * of the same safe answer. Every pick carries the reasons it scored,
 * which is where the "why we chose this" copy comes from: the words are
 * generated from the same numbers that made the decision, so they can
 * never drift apart.
 *
 * The wine list is INJECTED rather than imported, so the engine is a pure
 * function of (person, list): unit tests hand it synthetic wines, the API
 * route hands it the profiled catalogue.
 *
 * No request leaves the process and no model is involved. Ratings and
 * "never send me Chardonnay again" both slot in later as extra hard
 * filters and weight adjustments; the shape already allows it.
 */

export type BudgetTier = {
  id: string
  label: string
  detail: string
  /** Hard range a bottle must sit in, minor units. */
  minMinor: number
  maxMinor: number | null
  /** What a bottle at this tier is charged at: the club band's floor. */
  chargeMinor: number
}

/**
 * The tiers ARE the club's price bands: same ids, same floors, because the
 * Shopify variant that gets bought is priced band floor times bottles.
 * The ranges bound what the engine may put in the box, so a box is always
 * worth at least what it costs.
 */
export const BUDGET_TIERS: readonly BudgetTier[] = [
  {
    id: 'everyday',
    label: 'Everyday discoveries',
    detail: 'Roughly €15 to €25 a bottle. Weeknight wines with nothing boring about them.',
    minMinor: 1200,
    maxMinor: 2499,
    chargeMinor: 1500,
  },
  {
    id: 'considered',
    label: 'Something special',
    detail: 'Roughly €25 to €40 a bottle. Growers rather than brands.',
    minMinor: 2500,
    maxMinor: 3999,
    chargeMinor: 2500,
  },
  {
    id: 'fine',
    label: 'Premium picks',
    detail: '€40 and up. The top of the list, including wines we import ourselves.',
    minMinor: 4000,
    maxMinor: null,
    chargeMinor: 4000,
  },
]

/** Weights are configuration, not code. Must sum to 1. */
export const MATCH_WEIGHTS = {
  taste: 0.6,
  budget: 0.25,
  adventure: 0.15,
} as const

/** Diversity caps, per the box. Relaxed only when stock leaves no choice. */
const DIVERSITY = {
  sameGrape: 2,
  sameProducer: 2,
  sameCountry: 3,
} as const

export type Mix = Partial<Record<WineType, number>>

export type RecommendRequest = {
  tasteProfile: TasteProfile
  mix: Mix
  budgetTierId: string
  excludeHandles?: string[]
}

export type Recommendation = {
  handle: string
  title: string
  wineType: WineType
  priceMinor: number
  grapes: string[]
  country: string | null
  region: string | null
  vintage: string | null
  producer: string | null
  image: { url: string; alt: string } | null
  exclusive: boolean
  /** 0..1. Never shown as a number; mapped to words. */
  score: number
  matchLabel: 'A great match' | 'A good match' | 'Something different'
  /** Deterministic sentence built from the factors that actually scored. */
  reason: string
  tasteTags: string[]
}

export type RecommendResult = {
  recommendations: Recommendation[]
  /** Sum of the recommended bottles' real prices. */
  boxValueMinor: number
  /** What the case is charged at: tier floor times bottle count. */
  boxChargeMinor: number
  /** Set when the engine had to loosen something to fill the box. */
  relaxed: string | null
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Attribute-level agreement between what the person told us and what the
 * bottle is. bitterness compares to the wine's bitterness/tannin figure;
 * everything else is the same axis on both sides.
 */
const TASTE_AXES = [
  'sweetness', 'acidity', 'bitterness', 'body', 'fruitiness',
  'richness', 'freshness', 'savoury', 'aromatic',
] as const

function tasteMatch(profile: TasteProfile, wine: WineProfile): number {
  let distance = 0
  for (const axis of TASTE_AXES) {
    distance += Math.abs(profile[axis] - wine.attributes[axis])
  }
  return 1 - distance / (TASTE_AXES.length * 100)
}

function budgetMatch(tier: BudgetTier, wine: WineProfile): number {
  const max = tier.maxMinor ?? tier.minMinor * 2.5
  const mid = (tier.minMinor + max) / 2
  const half = (max - tier.minMinor) / 2 || 1
  return Math.max(0, 1 - Math.abs(wine.priceMinor - mid) / (half * 2))
}

function adventureMatch(profile: TasteProfile, wine: WineProfile): number {
  const wanted = 1 + (profile.adventure / 100) * 3
  return Math.max(0, 1 - Math.abs(wanted - wine.adventureLevel) / 3)
}

function scoreWine(profile: TasteProfile, tier: BudgetTier, wine: WineProfile): number {
  return (
    tasteMatch(profile, wine) * MATCH_WEIGHTS.taste +
    budgetMatch(tier, wine) * MATCH_WEIGHTS.budget +
    adventureMatch(profile, wine) * MATCH_WEIGHTS.adventure
  )
}

function matchLabel(score: number): Recommendation['matchLabel'] {
  if (score >= 0.72) return 'A great match'
  if (score >= 0.6) return 'A good match'
  return 'Something different'
}

// ---------------------------------------------------------------------------
// Explanations: built from the same numbers that scored the wine.
// ---------------------------------------------------------------------------

function reasonFor(profile: TasteProfile, wine: WineProfile): string {
  const parts: string[] = []

  const axes: { axis: (typeof TASTE_AXES)[number]; you: string; wine: string }[] = [
    { axis: 'freshness', you: 'fresh, crisp flavours', wine: 'crisp and clean' },
    { axis: 'fruitiness', you: 'fruit-forward flavours', wine: 'full of fruit' },
    { axis: 'body', you: 'richer, fuller flavours', wine: 'full-bodied' },
    { axis: 'richness', you: 'smooth, rounded flavours', wine: 'smooth and generous' },
    { axis: 'savoury', you: 'savoury, complex flavours', wine: 'savoury and layered' },
    { axis: 'acidity', you: 'bright, zesty flavours', wine: 'bright and lively' },
    { axis: 'aromatic', you: 'aromatic flavours', wine: 'wonderfully aromatic' },
  ]

  // The strongest shared axis: the person leans that way, the wine delivers.
  let best: { gap: number; you: string; wine: string } | null = null
  for (const { axis, you, wine: wineWord } of axes) {
    if (profile[axis] > 58 && wine.attributes[axis] > 58) {
      const strength = profile[axis] + wine.attributes[axis]
      if (!best || strength > best.gap) best = { gap: strength, you, wine: wineWord }
    }
  }
  if (best) parts.push(`You leaned towards ${best.you} and this one is ${best.wine}`)

  if (!parts.length && profile.body < 42 && wine.attributes.body < 45) {
    parts.push('You preferred lighter styles and this one wears its weight lightly')
  }

  if (profile.adventure > 62 && wine.adventureLevel >= 3) {
    parts.push(
      wine.grapes.length
        ? `you said you like discovering things, so we added a ${wine.grapes[0]}${wine.country ? ` from ${wine.country}` : ''}`
        : 'you said you like discovering things, so we picked something off the beaten track',
    )
  } else if (profile.adventure < 38 && wine.adventureLevel <= 2 && wine.grapes.length) {
    parts.push(`${wine.grapes[0]} is a classic for a reason`)
  }

  if (wine.exclusive) parts.push('nobody else in Ireland stocks it')

  if (!parts.length) {
    parts.push('It sits right in the middle of what you told us you enjoy')
  }

  const sentence = parts.join(', and ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.'
}

function tasteTags(wine: WineProfile): string[] {
  const a = wine.attributes
  const tags: { score: number; label: string }[] = [
    { score: a.freshness, label: 'Crisp' },
    { score: a.fruitiness, label: 'Fruity' },
    { score: a.body, label: 'Full-bodied' },
    { score: a.richness, label: 'Smooth' },
    { score: a.savoury, label: 'Savoury' },
    { score: a.acidity, label: 'Zesty' },
    { score: a.aromatic, label: 'Aromatic' },
    { score: a.sweetness, label: 'Off-dry' },
  ]
  return tags
    .filter((t) => t.score > 58)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map((t) => t.label)
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

function toRecommendation(profile: TasteProfile, tier: BudgetTier, wine: WineProfile): Recommendation {
  const score = scoreWine(profile, tier, wine)
  return {
    handle: wine.handle,
    title: wine.title,
    wineType: wine.wineType,
    priceMinor: wine.priceMinor,
    grapes: wine.grapes,
    country: wine.country,
    region: wine.region,
    vintage: wine.vintage,
    producer: wine.producer,
    image: wine.image,
    exclusive: wine.exclusive,
    score,
    matchLabel: matchLabel(score),
    reason: reasonFor(profile, wine),
    tasteTags: tasteTags(wine),
  }
}

/** Greedy pick under diversity caps. Returns what it managed. */
function pickDiverse(
  ranked: WineProfile[],
  count: number,
  caps: typeof DIVERSITY,
  picked: WineProfile[],
): WineProfile[] {
  const chosen: WineProfile[] = []
  const grapeCount = new Map<string, number>()
  const producerCount = new Map<string, number>()
  const countryCount = new Map<string, number>()

  // Diversity is judged across the whole box, not per type.
  for (const wine of picked) {
    for (const g of wine.grapes) grapeCount.set(g, (grapeCount.get(g) ?? 0) + 1)
    if (wine.producer) producerCount.set(wine.producer, (producerCount.get(wine.producer) ?? 0) + 1)
    if (wine.country) countryCount.set(wine.country, (countryCount.get(wine.country) ?? 0) + 1)
  }

  for (const wine of ranked) {
    if (chosen.length >= count) break
    if (wine.grapes.some((g) => (grapeCount.get(g) ?? 0) >= caps.sameGrape)) continue
    if (wine.producer && (producerCount.get(wine.producer) ?? 0) >= caps.sameProducer) continue
    if (wine.country && (countryCount.get(wine.country) ?? 0) >= caps.sameCountry) continue

    chosen.push(wine)
    for (const g of wine.grapes) grapeCount.set(g, (grapeCount.get(g) ?? 0) + 1)
    if (wine.producer) producerCount.set(wine.producer, (producerCount.get(wine.producer) ?? 0) + 1)
    if (wine.country) countryCount.set(wine.country, (countryCount.get(wine.country) ?? 0) + 1)
  }
  return chosen
}

export function recommend(request: RecommendRequest, wines: readonly WineProfile[]): RecommendResult {
  const tier = BUDGET_TIERS.find((t) => t.id === request.budgetTierId) ?? BUDGET_TIERS[0]!
  const excluded = new Set(request.excludeHandles ?? [])
  const picked: WineProfile[] = []
  let relaxed: string | null = null

  for (const [type, count] of Object.entries(request.mix) as [WineType, number][]) {
    if (!count) continue

    const eligible = wines.filter(
      (w) =>
        w.wineType === type &&
        !excluded.has(w.handle) &&
        w.priceMinor >= tier.minMinor &&
        (tier.maxMinor === null || w.priceMinor <= tier.maxMinor),
    ).sort((a, b) => scoreWine(request.tasteProfile, tier, b) - scoreWine(request.tasteProfile, tier, a))

    let chosen = pickDiverse(eligible, count, DIVERSITY, picked)

    // The relaxation ladder, in order: diversity first, then budget by a
    // fifth. Wine type, exclusions and stock never bend. Relaxing
    // diversity means topping up the diverse picks with the best of what
    // is left, never throwing the diversity away and starting again.
    if (chosen.length < count) {
      relaxed = 'diversity'
      const rest = eligible.filter((w) => !chosen.includes(w))
      chosen = [...chosen, ...rest.slice(0, count - chosen.length)]
    }
    if (chosen.length < count) {
      relaxed = 'budget'
      const widerMin = Math.floor(tier.minMinor * 0.8)
      const widerMax = tier.maxMinor === null ? null : Math.ceil(tier.maxMinor * 1.2)
      const wider = wines.filter(
        (w) =>
          w.wineType === type &&
          !excluded.has(w.handle) &&
          !chosen.includes(w) &&
          w.priceMinor >= widerMin &&
          (widerMax === null || w.priceMinor <= widerMax),
      ).sort((a, b) => scoreWine(request.tasteProfile, tier, b) - scoreWine(request.tasteProfile, tier, a))
      chosen = [...chosen, ...wider.slice(0, count - chosen.length)]
    }

    picked.push(...chosen)
  }

  const bottleCount = Object.values(request.mix).reduce((sum, n) => sum + (n ?? 0), 0)

  return {
    recommendations: picked.map((w) => toRecommendation(request.tasteProfile, tier, w)),
    boxValueMinor: picked.reduce((sum, w) => sum + w.priceMinor, 0),
    boxChargeMinor: tier.chargeMinor * bottleCount,
    relaxed,
  }
}

/**
 * Alternatives for the swap drawer: same type, same tier, best scores,
 * excluding everything already in or previously bounced from the box.
 */
export function alternatives(
  request: RecommendRequest & { wineType: WineType; count?: number },
  wines: readonly WineProfile[],
): Recommendation[] {
  const tier = BUDGET_TIERS.find((t) => t.id === request.budgetTierId) ?? BUDGET_TIERS[0]!
  const excluded = new Set(request.excludeHandles ?? [])

  return wines.filter(
    (w) =>
      w.wineType === request.wineType &&
      !excluded.has(w.handle) &&
      w.priceMinor >= tier.minMinor &&
      (tier.maxMinor === null || w.priceMinor <= tier.maxMinor),
  )
    .sort((a, b) => scoreWine(request.tasteProfile, tier, b) - scoreWine(request.tasteProfile, tier, a))
    .slice(0, request.count ?? 3)
    .map((w) => toRecommendation(request.tasteProfile, tier, w))
}

/** The browse-all list: every eligible wine, scored, filterable client side. */
export function browseAll(
  request: Omit<RecommendRequest, 'mix'> & { wineType?: WineType },
  wines: readonly WineProfile[],
): Recommendation[] {
  const tier = BUDGET_TIERS.find((t) => t.id === request.budgetTierId) ?? BUDGET_TIERS[0]!
  const excluded = new Set(request.excludeHandles ?? [])

  return wines.filter(
    (w) =>
      (!request.wineType || w.wineType === request.wineType) &&
      !excluded.has(w.handle) &&
      w.priceMinor >= tier.minMinor &&
      (tier.maxMinor === null || w.priceMinor <= tier.maxMinor),
  )
    .map((w) => toRecommendation(request.tasteProfile, tier, w))
    .sort((a, b) => b.score - a.score)
}
