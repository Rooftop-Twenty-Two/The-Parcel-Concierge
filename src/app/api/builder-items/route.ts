import { NextRequest, NextResponse } from 'next/server'
import { queryProducts } from '@/lib/commerce'
import type { ProductCard } from '@/lib/commerce/types'
import { BUILDER_TABS } from '@/lib/build-a-hamper-tabs'
import { isPickable, tabItems, toPickerCard } from '@/lib/builder-picker'

export const dynamic = 'force-dynamic'

/**
 * The hamper builder's picker, served a page at a time.
 *
 * Two thousand products cannot ride into the page as props, so the picker
 * asks for a tab at a time: GET /api/builder-items?shelf=food&q=&page=1.
 * The tabs and their collections live in src/lib/build-a-hamper-tabs.ts.
 *
 * This is the only surface on the site that will answer a query for the
 * quarantined `builder-item` kind. It returns card data, never full
 * products, and it only speaks to the builder.
 */

const PAGE_SIZE = 24
const MAX_PAGE = 20

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const shelfId = params.get('shelf') ?? ''
  const q = (params.get('q') ?? '').slice(0, 60).trim()
  const page = Math.min(Math.max(Number.parseInt(params.get('page') ?? '1', 10) || 1, 1), MAX_PAGE)

  let pickable: ProductCard[]
  let shopifyHasMore = false
  if (q) {
    // A collection has no free-text arg, so a search runs across the whole
    // shop by title, whichever tab is open. The dull paging trade again (see
    // src/lib/commerce/pagination.ts): ask for everything up to this page
    // and slice.
    const result = await queryProducts({ text: q, sort: 'price-asc', first: PAGE_SIZE * page })
    pickable = result.items.filter(isPickable)
    shopifyHasMore = result.pageInfo.hasNextPage
  } else {
    const tab = BUILDER_TABS.find((t) => t.id === shelfId)
    if (!tab) {
      return NextResponse.json({ error: 'No such shelf' }, { status: 400 })
    }
    // The whole tab, in the collection's manual order. See tabItems.
    pickable = await tabItems(tab)
  }

  const start = PAGE_SIZE * (page - 1)
  const items = pickable.slice(start, start + PAGE_SIZE)

  return NextResponse.json(
    {
      items: items.map(toPickerCard),
      page,
      hasMore: pickable.length > start + PAGE_SIZE || shopifyHasMore,
      total: pickable.length,
    },
    // Cached at the edge for a minute, then served stale for up to five
    // while it refreshes. The Storefront reads underneath are tagged, so a
    // Shopify webhook or /api/revalidate clears them; this short edge
    // window is all that stands between a change in Shopify admin and the
    // picker. The site runs on Vercel, whose edge cache keys on the full
    // URL including the query. Netlify-Vary does the same job on Netlify,
    // which netlify.toml still supports: there, without it, every shelf and
    // search was served whichever response got cached first.
    {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
        'Netlify-Vary': 'query',
      },
    },
  )
}
