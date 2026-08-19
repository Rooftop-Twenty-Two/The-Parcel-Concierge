/**
 * The taste quiz: questions, scoring, and the profile they build.
 *
 * The whole quiz is data. Questions, options and their attribute weights
 * live in this one table, so reordering a question, rewording an option or
 * tuning a weighting is an edit here, never a UI change. The scoring is
 * deliberately simple and fully deterministic: each answer nudges named
 * attributes, the nudges are summed, and the result is normalised to
 * 0-100. No model, no black box, and a recommendation can always be
 * explained by pointing at the answers that produced it.
 *
 * The questions ask about food and drink people already know, never about
 * tannin or acidity by name. The mapping from "dark chocolate" to
 * "bitterness tolerance" is our job, not the customer's.
 */

export type TasteProfile = {
  sweetness: number
  acidity: number
  bitterness: number
  body: number
  fruitiness: number
  richness: number
  freshness: number
  savoury: number
  aromatic: number
  /** 0 plays it safe, 100 wants the strange grape from the small place. */
  adventure: number
}

export type TasteAttribute = keyof TasteProfile

/** A nudge an answer applies, in the -3..3 range. */
export type TasteWeights = Partial<Record<TasteAttribute, number>>

export type QuizOption = {
  id: string
  label: string
  /** Little supporting line under the label, optional. */
  detail?: string
  weights: TasteWeights
}

export type QuizQuestion = {
  id: string
  title: string
  lede?: string
  options: QuizOption[]
}

export const QUIZ: readonly QuizQuestion[] = [
  {
    id: 'chocolate',
    title: 'Pick your chocolate',
    lede: 'If you could only choose one, which would it be?',
    options: [
      { id: 'white', label: 'White chocolate', weights: { sweetness: 3, bitterness: -2, richness: 1 } },
      { id: 'milk', label: 'Milk chocolate', weights: { sweetness: 1, richness: 1 } },
      { id: 'dark', label: 'Dark chocolate', weights: { bitterness: 3, richness: 2, body: 1, sweetness: -1 } },
      { id: 'none', label: 'Not a chocolate person', weights: {} },
    ],
  },
  {
    id: 'coffee',
    title: 'How do you take your coffee?',
    options: [
      { id: 'black', label: 'Black', weights: { bitterness: 3, body: 2, savoury: 1, sweetness: -1 } },
      { id: 'splash', label: 'With a splash of milk', weights: { bitterness: 1, richness: 1 } },
      { id: 'milky', label: 'Milky', weights: { richness: 2, body: 1, bitterness: -1 } },
      { id: 'sweet', label: 'Sweet', weights: { sweetness: 3, bitterness: -2 } },
      { id: 'none', label: 'I don’t drink coffee', weights: {} },
    ],
  },
  {
    id: 'refreshing',
    title: 'Which sounds most refreshing?',
    options: [
      { id: 'lemon', label: 'Fresh lemon', weights: { acidity: 3, freshness: 2, sweetness: -1 } },
      { id: 'apple', label: 'Crisp green apple', weights: { acidity: 2, freshness: 2 } },
      { id: 'peach', label: 'Juicy peach', weights: { aromatic: 2, fruitiness: 2, acidity: -1 } },
      { id: 'mango', label: 'Ripe mango', weights: { fruitiness: 3, richness: 1, acidity: -1, sweetness: 1 } },
    ],
  },
  {
    id: 'comfort',
    title: 'Your ideal comfort food?',
    options: [
      { id: 'salad', label: 'A fresh salad', weights: { body: -2, freshness: 2, acidity: 1 } },
      { id: 'fish', label: 'Grilled fish', weights: { body: -1, freshness: 1, savoury: 1 } },
      { id: 'pasta', label: 'Creamy pasta', weights: { richness: 2, body: 1 } },
      { id: 'beef', label: 'Slow-cooked beef', weights: { body: 3, richness: 2, savoury: 2 } },
    ],
  },
  {
    id: 'drink',
    title: 'Pick your drink',
    options: [
      { id: 'gt', label: 'Gin and tonic', weights: { freshness: 2, aromatic: 1, sweetness: -1, bitterness: 1 } },
      { id: 'margarita', label: 'Margarita', weights: { acidity: 2, freshness: 1 } },
      { id: 'mojito', label: 'Mojito', weights: { freshness: 2, aromatic: 2 } },
      { id: 'espresso-martini', label: 'Espresso Martini', weights: { richness: 2, sweetness: 1, body: 1 } },
      { id: 'negroni', label: 'Negroni', weights: { bitterness: 3, savoury: 2, body: 1 } },
      { id: 'none', label: 'None of these', weights: {} },
    ],
  },
  {
    id: 'adventure',
    title: 'How adventurous are you with food?',
    options: [
      { id: 'classic', label: 'Keep it classic', weights: { adventure: -3 } },
      { id: 'sometimes', label: 'Something new now and again', weights: { adventure: 0 } },
      { id: 'discover', label: 'I love finding new flavours', weights: { adventure: 2 } },
      { id: 'surprise', label: 'Surprise me', weights: { adventure: 3 } },
    ],
  },
  {
    id: 'flavour',
    title: 'Which sounds most like your kind of flavour?',
    options: [
      { id: 'fresh', label: 'Fresh and crisp', weights: { freshness: 3, acidity: 2, body: -1 } },
      { id: 'fruity', label: 'Fruity and juicy', weights: { fruitiness: 3, aromatic: 1 } },
      { id: 'smooth', label: 'Smooth and rounded', weights: { richness: 2, body: 1, bitterness: -1 } },
      { id: 'bold', label: 'Rich and bold', weights: { body: 3, richness: 2, bitterness: 1 } },
      { id: 'savoury', label: 'Savoury and complex', weights: { savoury: 3, bitterness: 1, adventure: 1 } },
    ],
  },
]

/** Every attribute starts here and the nudges move it. */
const BASELINE = 50

/**
 * Sum of the largest positive nudge an attribute can collect across the
 * quiz, used to normalise so the scale means the same thing whatever the
 * question set. Recomputed from the table, so editing the quiz cannot
 * silently break the scale.
 */
function attributeRange(attribute: TasteAttribute): number {
  let max = 0
  for (const question of QUIZ) {
    let best = 0
    for (const option of question.options) {
      best = Math.max(best, Math.abs(option.weights[attribute] ?? 0))
    }
    max += best
  }
  return max || 1
}

const RANGES = Object.fromEntries(
  (
    ['sweetness', 'acidity', 'bitterness', 'body', 'fruitiness', 'richness', 'freshness', 'savoury', 'aromatic', 'adventure'] as const
  ).map((a) => [a, attributeRange(a)]),
) as Record<TasteAttribute, number>

export function emptyProfile(): TasteProfile {
  return {
    sweetness: BASELINE,
    acidity: BASELINE,
    bitterness: BASELINE,
    body: BASELINE,
    fruitiness: BASELINE,
    richness: BASELINE,
    freshness: BASELINE,
    savoury: BASELINE,
    aromatic: BASELINE,
    adventure: BASELINE,
  }
}

/** answers: question id → option id. Unanswered questions score neutral. */
export function scoreQuiz(answers: Record<string, string>): TasteProfile {
  const totals: Record<TasteAttribute, number> = {
    sweetness: 0, acidity: 0, bitterness: 0, body: 0, fruitiness: 0,
    richness: 0, freshness: 0, savoury: 0, aromatic: 0, adventure: 0,
  }

  for (const question of QUIZ) {
    const option = question.options.find((o) => o.id === answers[question.id])
    if (!option) continue
    for (const [attribute, weight] of Object.entries(option.weights)) {
      totals[attribute as TasteAttribute] += weight
    }
  }

  const profile = emptyProfile()
  for (const attribute of Object.keys(totals) as TasteAttribute[]) {
    const scaled = (totals[attribute] / RANGES[attribute]) * 50
    profile[attribute] = Math.round(Math.min(100, Math.max(0, BASELINE + scaled)))
  }
  return profile
}

/**
 * The reveal: the profile in words, never in numbers. Ordered by how far
 * each attribute sits from neutral, so the words are the strongest
 * signals, not a fixed list.
 */
export function describeProfile(profile: TasteProfile): string[] {
  const candidates: { score: number; word: string }[] = [
    { score: profile.freshness - 50, word: 'Fresh and crisp' },
    { score: profile.fruitiness - 50, word: 'Fruit-forward' },
    { score: profile.body - 50, word: 'Full-bodied' },
    { score: 50 - profile.body, word: 'Lighter in style' },
    { score: profile.richness - 50, word: 'Smooth and rounded' },
    { score: profile.savoury - 50, word: 'Savoury and complex' },
    { score: profile.acidity - 50, word: 'Bright and zesty' },
    { score: profile.aromatic - 50, word: 'Aromatic' },
    { score: profile.sweetness - 50, word: 'A touch of sweetness' },
    { score: profile.bitterness - 50, word: 'Happy with a bit of grip' },
  ]
  const words = candidates
    .filter((c) => c.score > 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((c) => c.word)

  if (profile.adventure > 62) words.push('A little adventurous')
  else if (profile.adventure < 38) words.push('Fond of the classics')

  return words.length ? words : ['Balanced', 'Open-minded']
}
