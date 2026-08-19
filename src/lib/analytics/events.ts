/**
 * GA4 e-commerce events.
 *
 * Two things matter here beyond the usual.
 *
 * 1. Checkout is on Shopify, so the purchase event fires on the Shopify
 *    side of the handoff, not here. This module deliberately has no
 *    `purchase` function: firing one here as well is how a site ends up
 *    double counting revenue across the domain change. The Shopify side is
 *    configured in the store's customer events, and docs/analytics.md sets
 *    out how to verify it fires once and only once.
 *
 * 2. Every event carries a budget band, so we can see which price band
 *    converts. The bands come from the same table as the price: tags and the
 *    budget routes, so a report and a shopper can never disagree.
 */

import { priceBandForMinor } from '../commerce/taxonomy'
import type { Money, ProductCard } from '../commerce/types'

type GtagWindow = Window & {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}

export type AnalyticsItem = {
  item_id: string
  item_name: string
  item_category: string
  item_brand?: string
  price: number
  quantity?: number
  /** Custom dimension. Register it in GA4 as "budget_band". */
  budget_band: string
}

export function toAnalyticsItem(
  product: Pick<ProductCard, 'handle' | 'title' | 'kind' | 'priceRange'>,
  quantity = 1,
): AnalyticsItem {
  return {
    item_id: product.handle,
    item_name: product.title,
    item_category: product.kind,
    price: product.priceRange.min.amountMinor / 100,
    quantity,
    budget_band: priceBandForMinor(product.priceRange.min.amountMinor).tag,
  }
}

function send(name: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const w = window as GtagWindow
  if (typeof w.gtag === 'function') {
    w.gtag('event', name, params)
    return
  }
  w.dataLayer = w.dataLayer ?? []
  w.dataLayer.push({ event: name, ...params })
}

export function trackViewItem(item: AnalyticsItem): void {
  send('view_item', { currency: 'EUR', value: item.price, items: [item] })
}

export function trackViewItemList(listName: string, items: AnalyticsItem[]): void {
  send('view_item_list', { item_list_name: listName, items })
}

export function trackSelectItem(listName: string, item: AnalyticsItem): void {
  send('select_item', { item_list_name: listName, items: [item] })
}

export function trackAddToCart(items: AnalyticsItem[], value: Money): void {
  send('add_to_cart', { currency: value.currencyCode, value: value.amountMinor / 100, items })
}

export function trackRemoveFromCart(items: AnalyticsItem[], value: Money): void {
  send('remove_from_cart', { currency: value.currencyCode, value: value.amountMinor / 100, items })
}

export function trackViewCart(items: AnalyticsItem[], value: Money): void {
  send('view_cart', { currency: value.currencyCode, value: value.amountMinor / 100, items })
}

/**
 * Fired at the handoff, not at the Shopify checkout page. Shopify fires its
 * own begin_checkout, so this one is named distinctly to keep the two apart
 * in reporting.
 */
export function trackCheckoutHandoff(items: AnalyticsItem[], value: Money): void {
  send('begin_checkout', {
    currency: value.currencyCode,
    value: value.amountMinor / 100,
    items,
    handoff: 'shopify_hosted',
  })
}

export function trackHamperBuilderStep(step: string, detail?: Record<string, unknown>): void {
  send('hamper_builder_step', { step, ...detail })
}

export function trackCorporateEnquiry(detail: Record<string, unknown>): void {
  send('generate_lead', { lead_type: 'corporate_gifting', ...detail })
}

export function trackNewsletterSignup(): void {
  send('sign_up', { method: 'newsletter' })
}
