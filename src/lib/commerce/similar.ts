import { queryProducts } from './index'
import { CHRISTMAS_HAMPERS_COLLECTION } from './collections'
import type { ProductCard, ProductKind } from './types'

/**
 * "More like this", for the foot of a product page.
 *
 * Reads the same merchant collection the matching listing page reads. That
 * is deliberate and it is the whole trick: the earlier cross-sell bands
 * queried by `kinds` and by tag, came back empty against the live
 * collection-driven store, and the section then rendered nothing at all.
 * The client's report was a product page that ended at the Add to cart
 * button. A collection that fills a listing will fill this too.
 *
 * Similarity is "from the same part of the shop", not a recommendation
 * engine. Anything cleverer wants the wine.* metafields, and those are not
 * on the store yet: see docs/build-status.md. Honest and full beats clever
 * and empty.
 */
type Source = { collection: string; kinds: ProductKind[] }

/**
 * `kinds` as well as the collection, for two reasons. It keeps a stray
 * product type in a merchant collection out of a band that promises one
 * thing ("More hampers" must not be a wine), and it is what makes the band
 * correct in fixture mode, where the collection filter is not applied and
 * an unconstrained query returns the whole catalogue.
 */
const SOURCE_BY_KIND: Record<ProductKind, Source | null> = {
  hamper: { collection: CHRISTMAS_HAMPERS_COLLECTION, kinds: ['hamper'] },
  wine: { collection: 'fine-wines-1', kinds: ['wine', 'spirit'] },
  spirit: { collection: 'fine-wines-1', kinds: ['wine', 'spirit'] },
  addon: { collection: 'all-gifts', kinds: ['addon'] },
  // A builder item has no page of its own, so nothing ever asks.
  'builder-item': null,
}

export async function similarProducts(
  product: Pick<ProductCard, 'handle' | 'kind'>,
  limit = 8,
): Promise<ProductCard[]> {
  const source = SOURCE_BY_KIND[product.kind]
  if (!source) return []

  // One over, so dropping the product being viewed still leaves a full row.
  const { items } = await queryProducts({
    collection: source.collection,
    kinds: source.kinds,
    first: limit + 1,
    sort: 'featured',
  })
  return items.filter((item) => item.handle !== product.handle).slice(0, limit)
}
