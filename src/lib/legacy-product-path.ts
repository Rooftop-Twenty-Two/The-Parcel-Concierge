import 'server-only'

import { getProduct } from './commerce'
import { HIDDEN_FROM_LISTINGS } from './commerce/collections'
import { productPathFor } from './routes'

/**
 * Where an old Shopify product URL (/products/<handle>) now lives.
 *
 * The old site served every product at /products/<handle>, and those are
 * the URLs Google has indexed and other sites link to. The redirect map only
 * carries a handful of hand-written /products rows, so without this every
 * other old product URL was a 404 even though the same product, with the
 * same handle, is on the new site under /hampers, /wine or /gifts.
 *
 * Rows in data/redirects/redirects.csv still win: Next applies config
 * redirects before any route runs. This only answers what the map does not.
 *
 * Returns null when the handle is not in the shop, and the caller 404s.
 * A removed product must not be sent to the homepage; its parent listing is
 * a decision for the redirect map (docs/redirects.md), not a guess here.
 */
export async function legacyProductPath(
  handle: string,
  variant: string | undefined,
): Promise<string | null> {
  // The builder's own boxes and baskets have no product page; the builder is
  // the only place they can be bought.
  if (HIDDEN_FROM_LISTINGS.has(handle)) return '/build-your-own-hamper'

  const product = await getProduct(handle)
  if (!product) return null

  const path = productPathFor(product.kind, product.handle)
  // Shopify links often carry ?variant=<id>. The product pages read it, so
  // keep it and the shopper lands on the option they were sent to.
  return variant && /^\d+$/.test(variant) && path !== '/build-your-own-hamper'
    ? `${path}?variant=${variant}`
    : path
}
