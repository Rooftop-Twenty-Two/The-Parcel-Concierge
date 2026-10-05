import 'server-only'

import { queryProducts } from './commerce'
import { MAX_LISTING } from './commerce/pagination'
import type { ProductCard } from './commerce/types'
import { BUILDER_TABS, type BuilderTab } from './build-a-hamper-tabs'

/**
 * What the Build a Hamper picker may show, and which tabs it offers.
 *
 * Shared by the builder page (which tabs exist) and /api/builder-items (what
 * is on them), so a tab is only offered when it has something on it.
 */

/** One card in the picker. The client component's PickerItem mirrors this. */
export type PickerCardData = {
  id: string
  handle: string
  title: string
  priceMinor: number
  image: { url: string; alt: string } | null
  variantId: string | null
  alcohol: boolean
}

export type PickerTab = Pick<BuilderTab, 'id' | 'label'>

function priceOf(item: ProductCard): number {
  return item.defaultVariantPriceMinor ?? item.priceRange.min.amountMinor
}

/**
 * The picker rules. The builder box products themselves never appear, and
 * neither does anything priced at €0 or without a photo: on this store those
 * are placeholders or stock codes ("A04 3"), not something a shopper can
 * choose by looking at it. Sold-out products are dropped upstream: every
 * read below excludes them.
 */
export function isPickable(item: ProductCard): boolean {
  return item.kind !== 'builder-item' && priceOf(item) > 0 && Boolean(item.image?.url)
}

export function toPickerCard(item: ProductCard): PickerCardData {
  return {
    id: item.id,
    handle: item.handle,
    title: item.title,
    priceMinor: priceOf(item),
    image: item.image ? { url: item.image.url, alt: item.image.alt } : null,
    variantId: item.defaultVariantId,
    // Counts bottles against the basket's limit and the order cap, and arms
    // the over-18 delivery note at review. Wine and spirits always, plus the
    // stray beers and cream liqueurs the importer flagged.
    alcohol: item.kind === 'wine' || item.kind === 'spirit' || item.tags.includes('contains:alcohol'),
  }
}

/**
 * Every pickable product on a tab, in the collection's manual order (the
 * order the client drags them into in Shopify admin). `sort: 'featured'`
 * reads the collection with the MANUAL sort key and drops sold-out products
 * in code, because any Storefront filter would reshuffle the manual order.
 * See productsByCollection in commerce/index.ts.
 *
 * The whole collection is read, once and cached, so paging and the count
 * are exact after the €0 and no-photo rules have thinned it.
 */
export async function tabItems(tab: BuilderTab): Promise<ProductCard[]> {
  if (!tab.handle) return []
  const result = await queryProducts({ collection: tab.handle, sort: 'featured', first: MAX_LISTING })
  return result.items.filter(isPickable)
}

/**
 * The tabs to offer, in config order. A tab is hidden, with a warning in
 * the server log, when its handle is unconfirmed or its collection is
 * missing, empty or has nothing pickable. A tab whose read fails outright
 * (a Shopify blip) is kept: it would be wrong to make a shelf vanish over
 * a timeout, and the picker shows its own retry for that tab.
 */
export async function visibleBuilderTabs(): Promise<PickerTab[]> {
  const shown = await Promise.all(
    BUILDER_TABS.map(async (tab) => {
      if (!tab.handle) {
        console.warn(`[build-a-hamper] tab "${tab.label}" hidden: no collection handle set for "${tab.title}"`)
        return false
      }
      try {
        const items = await tabItems(tab)
        if (items.length === 0) {
          console.warn(
            `[build-a-hamper] tab "${tab.label}" hidden: collection "${tab.handle}" is missing or has no pickable products`,
          )
          return false
        }
        return true
      } catch (error) {
        console.warn(`[build-a-hamper] tab "${tab.label}" could not be checked, keeping it`, error)
        return true
      }
    }),
  )
  return BUILDER_TABS.filter((_, i) => shown[i]).map(({ id, label }) => ({ id, label }))
}
