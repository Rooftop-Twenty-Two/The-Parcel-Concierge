import { queryListing } from './index'
import { MIN_PRODUCTS_PER_LISTING, type CollectionDef } from './collections'

/**
 * The listings in `defs` that have enough products to render.
 *
 * A listing under the four-product floor redirects to its parent
 * (ListingPage), so a card that links to one is a card that goes nowhere:
 * on the hamper hub it reloads the page you are on. The homepage budget
 * cards and the hub's "Where would you like to start?" cards go through
 * this so they only ever offer a band that will open.
 *
 * Curated listings are filled by the CMS, not by a query, so they are kept
 * as they are. A listing whose query fails is kept too: a Shopify blip must
 * not make cards vanish, and the listing itself has the same fallback.
 *
 * The reads are the same cached Storefront calls the listing pages make, so
 * this costs nothing on a warm cache.
 */
export async function populatedListings(defs: readonly CollectionDef[]): Promise<CollectionDef[]> {
  const keep = await Promise.all(
    defs.map(async (def) => {
      if (def.curated) return true
      try {
        const { items } = await queryListing(def.path, def.query)
        return items.length >= MIN_PRODUCTS_PER_LISTING
      } catch {
        return true
      }
    }),
  )
  return defs.filter((_, i) => keep[i])
}
