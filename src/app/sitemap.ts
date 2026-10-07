import type { MetadataRoute } from 'next'
import { listingPathsWithCopy } from '@/lib/cms'
import { isFixtureMode, queryProducts } from '@/lib/commerce'
import {
  COLLECTIONS,
  HIDDEN_FROM_LISTINGS,
  MIN_PRODUCTS_PER_LISTING,
  type CollectionDef,
} from '@/lib/commerce/collections'
import { buildListingQuery } from '@/components/listing/ListingPage'
import { productPathFor } from '@/lib/routes'
import { SITE } from '@/lib/site-config'

/**
 * The sitemap.
 *
 * Two rules that matter more than the rest:
 *
 *   - An under-populated listing is excluded. Fewer than four products and
 *     the route redirects to its parent, so submitting it for indexing
 *     would be submitting a redirect.
 *   - Out-of-stock products are excluded. The product query already
 *     filters them, and an out-of-stock product must never be an
 *     indexable, buyable-looking page.
 *
 * In fixture mode the sitemap is empty. A preview build has nothing worth
 * indexing and the layout sets noindex anyway.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isFixtureMode()) return []

  const url = (path: string) => new URL(path, SITE.url).toString()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: url('/'), priority: 1, changeFrequency: 'weekly' },
    { url: url('/hampers'), priority: 0.9, changeFrequency: 'weekly' },
    { url: url('/build-your-own-hamper'), priority: 0.9, changeFrequency: 'monthly' },
    { url: url('/wine'), priority: 0.9, changeFrequency: 'weekly' },
    { url: url('/wine-club'), priority: 0.9, changeFrequency: 'monthly' },
    { url: url('/corporate-gifting'), priority: 0.8, changeFrequency: 'monthly' },
    { url: url('/corporate-gifting/enquiry'), priority: 0.6, changeFrequency: 'monthly' },
    { url: url('/occasions'), priority: 0.7, changeFrequency: 'monthly' },
    { url: url('/about'), priority: 0.5, changeFrequency: 'yearly' },
    { url: url('/about/our-makers'), priority: 0.6, changeFrequency: 'monthly' },
    { url: url('/about/guaranteed-irish'), priority: 0.4, changeFrequency: 'yearly' },
    { url: url('/delivery'), priority: 0.8, changeFrequency: 'monthly' },
    { url: url('/faq'), priority: 0.5, changeFrequency: 'monthly' },
    { url: url('/contact'), priority: 0.4, changeFrequency: 'yearly' },
    { url: url('/gift-card'), priority: 0.4, changeFrequency: 'monthly' },
    { url: url('/legal/terms'), priority: 0.2, changeFrequency: 'yearly' },
    { url: url('/legal/privacy'), priority: 0.2, changeFrequency: 'yearly' },
    { url: url('/legal/returns'), priority: 0.2, changeFrequency: 'yearly' },
    { url: url('/legal/cookies'), priority: 0.2, changeFrequency: 'yearly' },
  ]

  const withCopy = new Set(listingPathsWithCopy())

  const listingEntries = (
    await Promise.all(COLLECTIONS.map((collection) => listingEntry(collection, url, withCopy)))
  ).filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  // Every product, a Storefront page at a time. This used to be one page of
  // 250, and the catalogue is bigger than that: every product past the
  // first page was left out of the sitemap.
  const productEntries: MetadataRoute.Sitemap = []
  let after: string | undefined
  for (let page = 0; page < 8; page += 1) {
    const { items, pageInfo } = await queryProducts({ first: 250, after })
    for (const product of items) {
      // Hidden products (the builder's boxes and baskets) have no product
      // URL and 404, and a builder item's only "page" is the builder itself,
      // which is already listed above. Neither belongs in here.
      if (HIDDEN_FROM_LISTINGS.has(product.handle) || product.kind === 'builder-item') continue
      productEntries.push({
        url: url(productPathFor(product.kind, product.handle)),
        priority: product.kind === 'hamper' ? 0.8 : 0.6,
        changeFrequency: 'weekly',
      })
    }
    if (!pageInfo.hasNextPage || !pageInfo.endCursor || items.length === 0) break
    after = pageInfo.endCursor
  }

  // One entry per URL: a listing and a product can never share a path, but
  // nothing else guarantees it, and a sitemap with duplicates is noise.
  const seen = new Set<string>()
  return [...staticEntries, ...listingEntries, ...productEntries].filter((entry) => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}

async function listingEntry(
  collection: CollectionDef,
  url: (path: string) => string,
  withCopy: Set<string>,
): Promise<MetadataRoute.Sitemap[number] | null> {
  const query = await buildListingQuery(collection, {})
  const { items } = await queryProducts(query)
  if (items.length < MIN_PRODUCTS_PER_LISTING) return null

  return {
    url: url(collection.path),
    // A listing with intent-matching copy is worth more than a bare grid,
    // and it is the copy that makes it rankable.
    priority: withCopy.has(collection.path) ? 0.8 : 0.6,
    changeFrequency: 'weekly',
  }
}
