/**
 * The Build a Hamper picker's tabs. EDIT THIS FILE to rename, reorder, add
 * or remove a tab; the picker code does not need touching.
 *
 * Each tab reads one Shopify collection, created for the builder alone and
 * titled "Build a Hamper – <Category>". Those collections are separate from
 * the main site's (the main Red Wine listing reads red-wines-1, not the
 * builder's Red Wine collection), so the client can stock the builder
 * without changing a single main-site listing, and the other way round.
 *
 *   order     Tabs appear in ascending order. Leave gaps (10, 20, …) so a
 *             new tab can slot in without renumbering the rest.
 *   id        Stable key used in the picker's URL query. Lower case, no
 *             spaces. Change it only when a tab really is a different tab.
 *   label     What the shopper sees on the tab.
 *   title     The collection's title in Shopify admin. Documentation, and
 *             what `npm run builder:tabs` matches on to find the handle.
 *   handle    The collection's handle, from its admin URL
 *             (…/collections/<handle>), never guessed from the title:
 *             Shopify appends -1, -2 when a handle is taken. Run
 *             `npm run builder:tabs` to look every handle up on the store
 *             and check this file against it. Null hides the tab.
 *             Handles confirmed from the store's collection list,
 *             October 2026.
 *
 * Products in a tab appear in the collection's manual order, the order the
 * client drags them into in Shopify admin. A tab whose collection is empty,
 * missing or has nothing pickable (sold out, €0, no photo) is hidden, and a
 * warning is logged on the server.
 *
 * This file is free of runtime imports so the build scripts can read it.
 */

export type BuilderTab = {
  order: number
  id: string
  label: string
  title: string
  handle: string | null
}

const TABS: readonly BuilderTab[] = [
  { order: 10, id: 'food', label: 'Food & Larder', title: 'Build a Hamper – Food & Larder', handle: 'build-a-hamper-food-larder' },
  {
    order: 20,
    id: 'chocolate',
    label: 'Chocolate & Sweet Things',
    title: 'Build a Hamper – Chocolate & Sweet Things',
    handle: 'build-a-hamper-chocolate-sweet-things',
  },
  { order: 30, id: 'red-wine', label: 'Red Wine', title: 'Build a Hamper – Red Wine', handle: 'build-a-hamper-red-wine' },
  { order: 40, id: 'white-wine', label: 'White Wine', title: 'Build a Hamper – White Wine', handle: 'build-a-hamper-white-wine' },
  { order: 50, id: 'champagne', label: 'Champagne', title: 'Build a Hamper – Champagne', handle: 'build-a-hamper-champagne' },
  { order: 60, id: 'sparkling', label: 'Sparkling', title: 'Build a Hamper – Sparkling', handle: 'build-a-hamper-sparkling' },
  {
    order: 70,
    id: 'candles',
    label: 'Candles & Fragrance',
    title: 'Build a Hamper – Candles & Fragrance',
    handle: 'build-a-hamper-candles-fragrance',
  },
  { order: 80, id: 'beauty', label: 'Beauty & Bath', title: 'Build a Hamper – Beauty & Bath', handle: 'build-a-hamper-beauty-bath' },
  {
    order: 90,
    id: 'homeware',
    label: 'Homeware & Kitchen',
    title: 'Build a Hamper – Homeware & Kitchen',
    handle: 'build-a-hamper-homeware-kitchen',
  },
  { order: 100, id: 'baby', label: 'Baby & Children', title: 'Build a Hamper – Baby & Children', handle: 'build-a-hamper-baby-children' },
  { order: 110, id: 'jewellery', label: 'Jewellery', title: 'Build a Hamper – Jewellery', handle: 'build-a-hamper-jewellery' },
  { order: 120, id: 'accessories', label: 'Accessories', title: 'Build a Hamper – Accessories', handle: 'build-a-hamper-accessories' },
  {
    order: 130,
    id: 'cards',
    label: 'Cards & Stationery',
    title: 'Build a Hamper – Cards & Stationery',
    handle: 'build-a-hamper-cards-stationery',
  },
]

/** Every configured tab, in display order. */
export const BUILDER_TABS: readonly BuilderTab[] = [...TABS].sort((a, b) => a.order - b.order)

/** The handles the build should check exist. Unconfirmed tabs are skipped. */
export const BUILDER_TAB_HANDLES: readonly string[] = BUILDER_TABS.flatMap((tab) =>
  tab.handle ? [tab.handle] : [],
)
