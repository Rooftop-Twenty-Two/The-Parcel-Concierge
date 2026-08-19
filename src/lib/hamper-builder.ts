/**
 * The custom hamper builder.
 *
 * Two decisions are recorded here because they are the ones that matter.
 *
 * 1. THE BUILDER LIVES ON THIS DOMAIN.
 *    It used to sit on parcel-concierge.vercel.app, which leaked SEO
 *    authority and broke trust at the highest-intent moment on the whole
 *    site. It is a first-class route at /build-your-own-hamper.
 *
 * 2. HOW A BUILT HAMPER GOES INTO THE CART: parent line plus component
 *    lines, linked by a bundle id.
 *
 *    The alternative was a Shopify bundle product with component line
 *    items. We chose parent-plus-components because:
 *
 *    - Inventory stays correct without any extra work. Each component is a
 *      real variant, so Shopify decrements the right stock and refuses to
 *      oversell a component that has run out. A bundle product would need
 *      its own inventory rules and would let us sell a hamper whose
 *      contents are gone, which is the exact failure the brief warns about.
 *    - The packing bench gets a real picking list. Every component appears
 *      on the Shopify order with its own SKU.
 *    - No app dependency and no plan requirement. Shopify's native bundles
 *      need a specific plan and app surface; line attributes work on every
 *      plan and through the standard Cart API.
 *
 *    The cost is that the cart has to group and present those lines as one
 *    hamper rather than as loose items, and quantity changes have to move
 *    the whole group. That is presentation work we control, which is the
 *    better place for the complexity to sit.
 *
 *    Attribute contract, written on every line in a bundle:
 *      _bundleId    a per-hamper id, so lines that belong together can be
 *                   found. Underscore prefixed, so Shopify hides it from
 *                   the customer-facing order.
 *      _bundleRole  "parent" or "component".
 *      Gift message, Ribbon colour, ... on the parent only.
 */

/**
 * The parent product. One Shopify product with one variant per box size,
 * priced at the cost of the box and the packing. The builder looks it up by
 * this handle, so renaming the product in Shopify breaks the builder.
 *
 * Defined in the collection registry, which also hides it from every
 * listing, and re-exported here so the builder has one import.
 */
export { BUILDER_PARENT_HANDLE } from './commerce/collections'

export type BoxOption = {
  id: string
  /** Must match the parent product's variant title in Shopify. */
  variantTitle: string
  description: string
  /** How many components fit. */
  capacity: number
}

export const BOX_OPTIONS: readonly BoxOption[] = [
  {
    id: 'small',
    variantTitle: 'The small box',
    description: 'Shallow kraft box, tissue lined and hand tied. Room for up to four things.',
    capacity: 4,
  },
  {
    id: 'standard',
    variantTitle: 'The standard box',
    description: 'Our usual deep kraft box. Room for up to six things, including a bottle.',
    capacity: 6,
  },
  {
    id: 'large',
    variantTitle: 'The large box',
    description: 'Deep box with a fitted base for bottles. Room for up to nine things.',
    capacity: 9,
  },
  {
    id: 'wicker',
    variantTitle: 'The wicker hamper',
    description: 'A lidded wicker hamper that gets kept. Room for up to twelve things.',
    capacity: 12,
  },
]

export const RIBBON_COLOURS = ['Forest green', 'Gold', 'Cream', 'Wine red'] as const

/** Cart line attribute keys. Underscore prefixed keys are hidden by Shopify. */
export const BUNDLE_ATTRIBUTES = {
  id: '_bundleId',
  role: '_bundleRole',
  box: 'Box',
  giftMessage: 'Gift message',
  ribbon: 'Ribbon colour',
  componentOf: '_partOfHamper',
} as const

export type BuilderSelection = {
  boxId: string
  /** Component variant ids and quantities. */
  components: { variantId: string; quantity: number }[]
  giftMessage: string
  ribbonColour: string
}

export function boxById(id: string): BoxOption | undefined {
  return BOX_OPTIONS.find((box) => box.id === id)
}

export function componentCount(selection: Pick<BuilderSelection, 'components'>): number {
  return selection.components.reduce((sum, c) => sum + c.quantity, 0)
}

/**
 * Categories offered in the builder, in the order they are shown. Each maps
 * to a query the commerce layer can answer, so adding a category does not
 * mean touching the builder UI.
 */
export const BUILDER_CATEGORIES = [
  { id: 'wine', label: 'Wine and Champagne', productTypes: ['Red wine', 'White wine', 'Rosé wine', 'Champagne', 'Sparkling wine'], alcohol: true },
  { id: 'spirits', label: 'Whiskey, gin and spirits', productTypes: ['Irish whiskey', 'Gin', 'Vodka', 'Liqueur'], alcohol: true },
  { id: 'sweet', label: 'Chocolate and treats', productTypes: ['Chocolate', 'Confectionery'], alcohol: false },
  { id: 'home', label: 'Candles and home', productTypes: ['Candle', 'Diffuser'], alcohol: false },
  { id: 'glass', label: 'Crystal and glassware', productTypes: ['Crystal', 'Glassware'], alcohol: false },
] as const

export type BuilderCategoryId = (typeof BUILDER_CATEGORIES)[number]['id']
