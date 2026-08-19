import 'server-only'

import { getProduct } from './commerce'
import {
  getCollection,
  HIDDEN_FROM_LISTINGS,
  type CollectionDef,
  type CollectionHub,
} from './commerce/collections'
import type { Product } from './commerce/types'

/**
 * Resolving /hampers/[slug], /wine/[slug] and /gifts/[slug].
 *
 * Both listings and products live one segment under their hub, which is what
 * the agreed sitemap specifies. So a single dynamic route resolves the
 * segment: collection first, then product.
 *
 * Collection first matters. A collection slug is a URL we control and have
 * promised to search engines; a product handle is data. If a new product
 * ever lands with the handle "under-75", the listing must win and the
 * product needs a different handle. The ingest tool blocks that collision at
 * write time so it cannot happen silently: see scripts/ingest/validate.ts.
 */

export type ResolvedRoute =
  | { kind: 'collection'; collection: CollectionDef }
  | { kind: 'product'; product: Product }
  | { kind: 'none' }

export async function resolveHubSlug(hub: CollectionHub, slug: string): Promise<ResolvedRoute> {
  const collection = getCollection(hub, slug)
  if (collection) return { kind: 'collection', collection }

  // A hidden product has no product URL of its own. The hamper builder's
  // parent lives at /build-your-own-hamper, and a second URL for it under
  // /hampers would compete with the real one. There is a redirect row for
  // the old path in data/redirects/redirects.csv.
  if (HIDDEN_FROM_LISTINGS.has(slug)) return { kind: 'none' }

  const product = await getProduct(slug)
  if (!product) return { kind: 'none' }

  // A product must only render under its own canonical hub. Reaching a
  // hamper at /wine/the-meath-larder would create a duplicate URL for the
  // same product, which is exactly what the old site did.
  const canonicalHub = hubForKind(product.kind)
  if (canonicalHub !== hub) return { kind: 'none' }

  return { kind: 'product', product }
}

function hubForKind(kind: Product['kind']): CollectionHub | null {
  switch (kind) {
    case 'hamper':
      return 'hampers'
    case 'wine':
    case 'spirit':
      return 'wine'
    case 'addon':
      return 'gifts'
    case 'builder-item':
      // No hub, so no URL. A builder item is only ever seen inside
      // /build-your-own-hamper, which is the whole point of the kind.
      return null
  }
}
