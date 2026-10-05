/**
 * Cache tags.
 *
 * Tagged per product handle and per collection path so a single product
 * change rebuilds that product and the listings it appears on, not the site.
 * The Shopify webhook route (src/app/api/webhooks/shopify/route.ts) calls
 * revalidateTag with exactly these strings.
 */

export const TAG_ALL_PRODUCTS = 'products'
export const TAG_CATALOGUE = 'catalogue'

export function productTag(handle: string): string {
  return `product:${handle}`
}

export function collectionTag(path: string): string {
  return `collection:${path}`
}

export function cmsTag(documentType: string): string {
  return `cms:${documentType}`
}

/**
 * Revalidation windows.
 *
 * Product and listing pages are revalidated on demand by webhook, and these
 * windows are the backstop. Listings re-read Shopify every minute: dragging
 * products into a new order in a collection does not reliably send a
 * webhook, and the client expects the site to follow their order within a
 * minute or two (October 2026). Storefront reads are cheap and cached
 * between, so a minute costs one read per collection per minute at most.
 * Stock and price are verified live at add-to-cart regardless, so a stale
 * page can never complete a sale for something that is gone.
 */
export const REVALIDATE = {
  product: 60 * 60,
  listing: 60,
  content: 60 * 60,
} as const
