/**
 * Showing more than the first page of a listing.
 *
 * With thirty hampers a fixed grid of twenty four was close enough to the
 * whole thing. With three hundred and forty one wines it is not: the red
 * wine listing counted 131 products and rendered 24, which is a listing
 * that lies about itself.
 *
 * The mechanism is deliberately the dull one. `?more=2` re-runs the same
 * query asking for twice as many products from the start, and the grid
 * grows. No cursors in the URL, no client-side appending, no infinite
 * scroll.
 *
 * That buys three things worth more than the saved bytes:
 *
 *   - it works with JavaScript off, and every product is a real link in
 *     server-rendered HTML;
 *   - the URL is shareable and lands the reader on the same set;
 *   - it behaves identically against the fixture catalogue and against
 *     Storefront, because both take `first` from the start of the result
 *     set. A cursor scheme would need the cursor to survive in the URL,
 *     and Shopify's cursors are opaque and short lived.
 *
 * The cost is refetching the earlier products on each step. Next dedupes
 * and caches the query, and a listing nobody pages past twice is not worth
 * a more complicated design.
 */

/**
 * Storefront refuses more than 250 in one call. This is the page size the
 * commerce layer reads a collection in, not a ceiling on a listing: a
 * collection bigger than this is read page by page (productsByCollection).
 */
export const MAX_FIRST = 250

/**
 * The most products a listing will ever read or show. Four Storefront
 * pages. The wine range passed 250 in 2026 (331 in the August export) and
 * the old ceiling of one page meant every wine past position 250 of the
 * merchant's order was on no listing at all: the client's report was a
 * wine missing from the website. A thousand is well past anything the shop
 * stocks and bounds what a crafted URL can ask for.
 */
export const MAX_LISTING = 1000

/**
 * How many steps a reader can take. Enough steps of the standard 24 to
 * reach MAX_LISTING, and the cap stops a crafted URL asking for an
 * unbounded page.
 */
export const MAX_STEPS = Math.ceil(MAX_LISTING / 24)

/** Reads `?more=` off a listing URL. Anything unparseable is step one. */
export function parseStep(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number.parseInt(value ?? '1', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(parsed, MAX_STEPS)
}

/** How many products to ask for at this step. */
export function firstForStep(pageSize: number, step: number): number {
  return Math.min(pageSize * step, MAX_LISTING)
}

/**
 * The href for the next step, keeping every filter the reader has set.
 *
 * The fragment lands them where the grid ended rather than at the top of a
 * page they have already read.
 */
export function nextStepHref(
  basePath: string,
  searchParams: Record<string, string | string[] | undefined>,
  step: number,
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'more' || value === undefined) continue
    for (const one of Array.isArray(value) ? value : [value]) {
      if (one) params.append(key, one)
    }
  }
  params.set('more', String(step + 1))
  return `${basePath}?${params.toString()}#more`
}

/** True when there is another step to offer. */
export function hasMore(
  pageInfo: { hasNextPage: boolean },
  step: number,
  pageSize: number,
): boolean {
  if (step >= MAX_STEPS) return false
  if (firstForStep(pageSize, step) >= MAX_LISTING) return false
  return pageInfo.hasNextPage
}
