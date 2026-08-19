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
 * Product and listing pages are statically generated and revalidated on
 * demand by webhook, so the time-based window is a long backstop for a
 * missed webhook rather than the primary freshness mechanism. Stock and
 * price are verified live at add-to-cart regardless, so a stale page can
 * never complete a sale for something that is gone.
 */
export const REVALIDATE = {
  product: 60 * 60,
  listing: 60 * 30,
  content: 60 * 60,
} as const
