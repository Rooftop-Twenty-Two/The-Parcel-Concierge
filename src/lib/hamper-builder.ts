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

// variantTitle values must match the live build-a-hamper product's variant
// titles EXACTLY (note the lower-case "medium"). Capacities are our own
// guidance — the real per-box limits live in a Giftship app metafield the
// Storefront token cannot read, so these are sensible defaults.
export const BOX_OPTIONS: readonly BoxOption[] = [
  {
    id: 'small',
    variantTitle: 'Display Hamper (Small)',
    description: 'Our small display hamper, packed and hand tied by us. Room for up to four things.',
    capacity: 4,
  },
  {
    id: 'medium',
    variantTitle: 'Display Hamper (medium)',
    description: 'The medium display hamper. Room for up to six things, including a bottle.',
    capacity: 6,
  },
  {
    id: 'large',
    variantTitle: 'Display Hamper (Large)',
    description: 'The large display hamper, with room for bottles. Up to nine things.',
    capacity: 9,
  },
]

/**
 * The optional hand tied bow. The charge rides on the gift-bow mechanism
 * product (see BUILDER_BOW_HANDLE), so the price lives on that product and
 * never here.
 */
export const BOW_LABEL = 'Hand tied bow'

/** Cart line attribute keys. Underscore prefixed keys are hidden by Shopify. */
export const BUNDLE_ATTRIBUTES = {
  id: '_bundleId',
  role: '_bundleRole',
  box: 'Box',
  giftMessage: 'Gift message',
  ribbon: 'Ribbon colour',
  bow: 'Bow',
  componentOf: '_partOfHamper',
} as const

export type BuilderSelection = {
  boxId: string
  /** Component variant ids and quantities. */
  components: { variantId: string; quantity: number }[]
  giftMessage: string
  /** Variant id of the gift-bow product when the bow is added. */
  bowVariantId: string | null
}

export function boxById(id: string): BoxOption | undefined {
  return BOX_OPTIONS.find((box) => box.id === id)
}

export function componentCount(selection: Pick<BuilderSelection, 'components'>): number {
  return selection.components.reduce((sum, c) => sum + c.quantity, 0)
}

/**
 * The picker's shelves, in the order the chips appear.
 *
 * The full shop is behind these: every published product in the client's
 * export is either on the main site (wine, offered here from the live
 * catalogue) or a quarantined builder item in one of the importer's aisles.
 * Each shelf maps to a query the commerce layer can answer, so adding one
 * does not mean touching the builder UI.
 *
 * Hamper staples come first. Cards are late on purpose: a card is the last
 * thing you pick up in the shop too.
 */
export type PickerShelf = {
  id: string
  label: string
  /** The native Shopify collection whose products fill the shelf. */
  collection: string
  /** True when everything on the shelf is alcohol. */
  alcohol: boolean
}

export const PICKER_SHELVES: readonly PickerShelf[] = [
  { id: 'all', label: 'Everything', collection: 'all-gifts', alcohol: false },
  { id: 'food', label: 'Food and larder', collection: 'all-food', alcohol: false },
  { id: 'chocolate', label: 'Chocolate and sweet things', collection: 'chocolate-confectionery-1', alcohol: false },
  { id: 'wine', label: 'Wine and Champagne', collection: 'fine-wines-1', alcohol: true },
  { id: 'cellar', label: 'Champagne and sparkling', collection: 'champagne-and-prosecco-1', alcohol: true },
  { id: 'candles', label: 'Candles and fragrance', collection: 'candles-diffusers', alcohol: false },
  { id: 'beauty', label: 'Beauty and bath', collection: 'beauty', alcohol: false },
  { id: 'homeware', label: 'Homeware and kitchen', collection: 'homeware', alcohol: false },
  { id: 'baby', label: 'Baby and children', collection: 'baby', alcohol: false },
  { id: 'jewellery', label: 'Jewellery and accessories', collection: 'jewellery', alcohol: false },
  { id: 'cards', label: 'Cards and stationery', collection: 'greeting-cards', alcohol: false },
]

// There is no delivery-country choice: we deliver within the Republic of
// Ireland only (confirmed by the client, August 2026). The wizard used to
// open with a country step; a question with one answer is not a question,
// so the flow now starts at the box.
