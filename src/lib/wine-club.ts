/**
 * The Wine Vault Club.
 *
 * A recurring case of wine, chosen by us from the real list. The whole point
 * of it for this business is that it turns a gifting shop, which sells hard
 * for six weeks a year, into something with revenue in February.
 *
 * Two decisions worth recording.
 *
 * 1. THE PRICE IS PER BOTTLE, NOT PER CASE.
 *    The customer picks how many bottles and roughly what per bottle, and
 *    the case price follows. That is honest arithmetic on the real
 *    catalogue rather than a case price nobody has agreed: every band below
 *    is backed by wines actually in stock at that price. It also means the
 *    client can change the range without repricing the club.
 *
 * 2. SHOPIFY OWNS THE RECURRENCE, NOT US.
 *    Subscriptions are Shopify selling plans. We do not store cards, we do
 *    not run a billing schedule, and we do not build a cancel flow: all of
 *    that is the subscription app's job and the customer account portal's.
 *    We select a selling plan and pass its id on the cart line. See
 *    docs/wine-club.md for what has to exist on the Shopify side.
 */

export type ClubCadence = {
  id: string
  label: string
  /** Shown next to the price so nobody has to work out the annual cost. */
  perYear: number
  description: string
}

export const CADENCES: readonly ClubCadence[] = [
  {
    id: 'monthly',
    label: 'Every month',
    perYear: 12,
    description: 'A case a month. For a house that opens a bottle most weeks.',
  },
  {
    id: 'every-two-months',
    label: 'Every two months',
    perYear: 6,
    description: 'Six cases a year. The one we recommend.',
  },
  {
    id: 'quarterly',
    label: 'Every three months',
    perYear: 4,
    description: 'Four cases a year, one a season. For the occasional top-up.',
  },
]

export type ClubSize = {
  id: string
  bottles: number
  label: string
  description: string
}

/**
 * Six bottles is the ceiling, confirmed by the client in September 2026:
 * we deliver a club case of up to six, not twelve. Adding a size back is a
 * row here and nothing else, because every page counts and prices from
 * this list.
 */
export const SIZES: readonly ClubSize[] = [
  { id: '3', bottles: 3, label: 'Three bottles', description: 'A taste of the list without committing the shelf space.' },
  { id: '6', bottles: 6, label: 'Six bottles', description: 'Our standard case. Enough to have something for a Tuesday and something for a Sunday.' },
]

/**
 * Per-bottle bands.
 *
 * `fromMinor` is a floor, not an average, and every band is backed by wines
 * in stock at that price today. The page states the count so nobody has to
 * take our word for the range being real.
 */
export type ClubBand = {
  id: string
  label: string
  fromMinor: number
  toMinor: number | null
  description: string
}

export const BANDS: readonly ClubBand[] = [
  {
    id: 'everyday',
    label: 'Everyday',
    fromMinor: 1500,
    toMinor: 2499,
    description: 'Bottles we would open on a weeknight without thinking about it.',
  },
  {
    id: 'considered',
    label: 'Considered',
    fromMinor: 2500,
    toMinor: 3999,
    description: 'A step up. Growers rather than brands, and a few things you will not have had.',
  },
  {
    id: 'fine',
    label: 'Fine',
    fromMinor: 4000,
    toMinor: null,
    description: 'The top of the list, including the wines we import ourselves.',
  },
]

export type ClubStyle = {
  id: string
  label: string
  /** Product types the case is built from. */
  productTypes: string[]
  description: string
}

export const STYLES: readonly ClubStyle[] = [
  { id: 'mixed', label: 'A mix', productTypes: ['Red wine', 'White wine', 'Rosé wine'], description: 'Red, white and a rosé in summer. What most people choose.' },
  { id: 'red', label: 'Reds only', productTypes: ['Red wine'], description: 'All red, across countries and weights.' },
  { id: 'white', label: 'Whites and rosé', productTypes: ['White wine', 'Rosé wine'], description: 'All white and rosé, leaning to whatever the season suits.' },
]

export type ClubSelection = {
  cadenceId: string
  sizeId: string
  bandId: string
  styleId: string
}

export const DEFAULT_SELECTION: ClubSelection = {
  cadenceId: 'quarterly',
  sizeId: '6',
  bandId: 'considered',
  styleId: 'mixed',
}

/** The "from" price for a case. Bottles times the band floor. */
export function caseFromMinor(size: ClubSize, band: ClubBand): number {
  return size.bottles * band.fromMinor
}

export function resolve(selection: ClubSelection) {
  return {
    cadence: CADENCES.find((c) => c.id === selection.cadenceId) ?? CADENCES[1]!,
    size: SIZES.find((s) => s.id === selection.sizeId) ?? SIZES[1]!,
    band: BANDS.find((b) => b.id === selection.bandId) ?? BANDS[1]!,
    style: STYLES.find((s) => s.id === selection.styleId) ?? STYLES[0]!,
  }
}

/**
 * The Shopify product the club is sold through, and its selling plans.
 *
 * One product, one variant per size-and-band combination, and a selling
 * plan per cadence. Nothing here works until the subscription app exists on
 * the store, which is why the page degrades to an enquiry rather than a
 * broken buy button when SELLING_PLAN_GROUP is unset.
 */
export const CLUB_PRODUCT_HANDLE = 'wine-vault-club'

export const SELLING_PLAN_GROUP = process.env.NEXT_PUBLIC_WINE_CLUB_SELLING_PLAN_GROUP ?? null

export function isClubBuyable(): boolean {
  return SELLING_PLAN_GROUP !== null
}

/** Cart line attributes, so the packing bench knows what to put in the case. */
export const CLUB_ATTRIBUTES = {
  cadence: 'Delivery',
  size: 'Case size',
  band: 'Price band',
  style: 'Style',
  role: '_wineClub',
} as const
