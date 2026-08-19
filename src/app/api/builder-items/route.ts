import { NextRequest, NextResponse } from 'next/server'
import { queryProducts } from '@/lib/commerce'
import type { ProductQuery } from '@/lib/commerce/types'
import { PICKER_SHELVES } from '@/lib/hamper-builder'

export const dynamic = 'force-dynamic'

/**
 * The hamper builder's picker, served a page at a time.
 *
 * Two thousand products cannot ride into the page as props, so the picker
 * asks for a shelf at a time: GET /api/builder-items?shelf=food&q=&page=1.
 *
 * This is the only surface on the site that will answer a query for the
 * quarantined `builder-item` kind. It returns card data, never full
 * products, and it only speaks to the builder.
 */

const PAGE_SIZE = 24
const MAX_PAGE = 20

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const shelfId = params.get('shelf') ?? 'all'
  const q = (params.get('q') ?? '').slice(0, 60).trim()
  const page = Math.min(Math.max(Number.parseInt(params.get('page') ?? '1', 10) || 1, 1), MAX_PAGE)

  const shelf = PICKER_SHELVES.find((s) => s.id === shelfId)
  if (!shelf) {
    return NextResponse.json({ error: 'No such shelf' }, { status: 400 })
  }

  const query: ProductQuery = {
    ...shelfQuery(shelf.query),
    text: q || undefined,
    sort: 'price-asc',
    // The dull paging trade again (see src/lib/commerce/pagination.ts):
    // ask for everything up to this page and slice, so fixture and
    // Storefront behave identically without a cursor in the client.
    first: PAGE_SIZE * page,
  }

  const result = await queryProducts(query)
  const start = PAGE_SIZE * (page - 1)
  const items = result.items.slice(start, start + PAGE_SIZE)

  return NextResponse.json(
    {
      items: items.map((item) => ({
        id: item.id,
        handle: item.handle,
        title: item.title,
        priceMinor: item.defaultVariantPriceMinor ?? item.priceRange.min.amountMinor,
        image: item.image ? { url: item.image.url, alt: item.image.alt } : null,
        variantId: item.defaultVariantId,
        // The age gate arms off this: wine and spirits always, and the
        // stray beers and cream liqueurs the importer flagged.
        alcohol:
          item.kind === 'wine' || item.kind === 'spirit' || item.tags.includes('contains:alcohol'),
      })),
      page,
      hasMore: result.items.length > start + PAGE_SIZE || result.pageInfo.hasNextPage,
      total: result.totalKnown,
    },
    // The catalogue moves slowly; the picker does not need to be fresher
    // than the listings are.
    { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=3600' } },
  )
}

function shelfQuery(query: (typeof PICKER_SHELVES)[number]['query']): ProductQuery {
  switch (query.kind) {
    case 'aisle':
      return { kinds: ['builder-item'], tags: [`aisle:${query.aisle}`] }
    case 'wine':
      return { kinds: ['wine'] }
    case 'spirits':
      return { kinds: ['spirit'] }
    case 'all':
      return { kinds: ['builder-item', 'wine', 'spirit'] }
  }
}
