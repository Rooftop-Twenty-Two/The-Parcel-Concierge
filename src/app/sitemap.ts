import type { MetadataRoute } from 'next'
import { getGuides, listingPathsWithCopy } from '@/lib/cms'
import { isFixtureMode, queryProducts } from '@/lib/commerce'
import {
  COLLECTIONS,
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
    { url: url('/corporate-gifting'), priority: 0.8, changeFrequency: 'monthly' },
    { url: url('/corporate-gifting/bulk-orders'), priority: 0.6, changeFrequency: 'monthly' },
    { url: url('/corporate-gifting/branding-personalisation'), priority: 0.6, changeFrequency: 'monthly' },
    { url: url('/corporate-gifting/enquiry'), priority: 0.6, changeFrequency: 'monthly' },
    { url: url('/occasions'), priority: 0.7, changeFrequency: 'monthly' },
    { url: url('/gifts-for'), priority: 0.6, changeFrequency: 'monthly' },
    { url: url('/gifts-by-budget'), priority: 0.8, changeFrequency: 'monthly' },
    { url: url('/gifts'), priority: 0.5, changeFrequency: 'monthly' },
    { url: url('/guides'), priority: 0.6, changeFrequency: 'monthly' },
    { url: url('/about'), priority: 0.5, changeFrequency: 'yearly' },
    { url: url('/about/our-makers'), priority: 0.6, changeFrequency: 'monthly' },
    { url: url('/about/guaranteed-irish'), priority: 0.4, changeFrequency: 'yearly' },
    { url: url('/delivery'), priority: 0.8, changeFrequency: 'monthly' },
    { url: url('/faq'), priority: 0.5, changeFrequency: 'monthly' },
    { url: url('/contact'), priority: 0.4, changeFrequency: 'yearly' },
    { url: url('/gift-card'), priority: 0.4, changeFrequency: 'monthly' },
  ]

  const withCopy = new Set(listingPathsWithCopy())

  const listingEntries = (
    await Promise.all(COLLECTIONS.map((collection) => listingEntry(collection, url, withCopy)))
  ).filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  const guides = await getGuides()
  const guideEntries: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: url(`/guides/${guide.slug}`),
    lastModified: guide.updatedAt,
    priority: 0.5,
    changeFrequency: 'yearly',
  }))

  const { items } = await queryProducts({ first: 250 })
  const productEntries: MetadataRoute.Sitemap = items.map((product) => ({
    url: url(productPathFor(product.kind, product.handle)),
    priority: product.kind === 'hamper' ? 0.8 : 0.6,
    changeFrequency: 'weekly',
  }))

  return [...staticEntries, ...listingEntries, ...guideEntries, ...productEntries]
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
