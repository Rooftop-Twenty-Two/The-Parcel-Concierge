import 'server-only'

import { allProductHandles, getProduct } from './commerce'
import {
  collectionsInHub,
  HIDDEN_FROM_LISTINGS,
  type CollectionHub,
} from './commerce/collections'
import type { ProductKind } from './commerce/types'

/**
 * Static params for the hub slug routes.
 *
 * Product pages prerender. Listing pages fall back to dynamic because they
 * read searchParams for filters, which is the right trade: a product page
 * is where the LCP budget is tightest and where the photography is
 * heaviest, and a listing that has to read a filter cannot be static
 * anyway.
 *
 * The collection slugs are included so a listing still resolves through the
 * same route rather than 404ing on a cold cache.
 */
const HUB_KINDS: Record<CollectionHub, ProductKind[]> = {
  hampers: ['hamper'],
  wine: ['wine', 'spirit'],
  gifts: ['addon'],
  occasions: [],
  'gifts-for': [],
  'gifts-by-budget': [],
  'corporate-gifting': [],
}

export async function hubStaticParams(hub: CollectionHub): Promise<{ slug: string }[]> {
  const kinds = HUB_KINDS[hub]
  const collectionSlugs = collectionsInHub(hub).map((c) => c.slug)

  if (!kinds.length) return collectionSlugs.map((slug) => ({ slug }))

  const handles = await allProductHandles()
  const productSlugs: string[] = []

  // Only handles whose product belongs to this hub. A hamper prerendered
  // under /wine would be a duplicate URL for the same product, which is
  // exactly what the old site did.
  for (const handle of handles) {
    // Hidden products have no product URL, so prerendering one would just
    // build a 404.
    if (HIDDEN_FROM_LISTINGS.has(handle)) continue
    const product = await getProduct(handle)
    if (product && kinds.includes(product.kind)) productSlugs.push(handle)
  }

  return [...collectionSlugs, ...productSlugs].map((slug) => ({ slug }))
}
