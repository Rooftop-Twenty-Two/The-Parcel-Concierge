import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { ProductGrid } from '@/components/product/ProductCard'
import { ListingFilters } from '@/components/listing/ListingFilters'
import { InkWaves } from '@/components/ui/Stamp'
import { getCuratedListing, getListingCopy } from '@/lib/cms'
import { collectionDescription, facetOptions, queryListing, queryProducts } from '@/lib/commerce'
import {
  CHRISTMAS_IMAGE_PATHS,
  LISTING_HEROES,
  withChristmasImages,
} from '@/lib/commerce/christmas-images'
import { ListingHero } from '@/components/listing/ListingHero'
import {
  LISTING_PAGE_SIZE,
  minProductsFor,
  type CollectionDef,
  type FacetKey,
} from '@/lib/commerce/collections'
import {
  firstForStep,
  hasMore,
  nextStepHref,
  parseStep,
} from '@/lib/commerce/pagination'
import type { ProductQuery } from '@/lib/commerce/types'
import { breadcrumbJsonLd } from '@/lib/seo/structured-data'

const RECIPIENT_FILTER_VALUES = ['her', 'him']

/**
 * Every listing page on the site renders through here.
 *
 * The rules that must not be forgotten live here rather than in each route:
 *
 *   - Fewer than four products and the route does not exist. It redirects to
 *     its parent, and the sitemap leaves it out. That is brief section 5,
 *     implemented as a rule rather than a manual check.
 *   - Filters are URL driven and server rendered, so a filtered view is
 *     shareable. Filter combinations are noindex, so they do not compete
 *     with the listing itself in search.
 *   - Copy order is fixed: H1, intro, grid, filters, SEO block.
 */

export type ListingSearchParams = Record<string, string | string[] | undefined>

export function parseFacets(
  searchParams: ListingSearchParams,
  allowed: readonly FacetKey[],
): Record<string, string[]> {
  const facets: Record<string, string[]> = {}
  for (const key of allowed) {
    const raw = searchParams[key]
    if (!raw) continue
    const values = (Array.isArray(raw) ? raw : raw.split(','))
      .map((v) => v.trim())
      .filter(Boolean)
    if (values.length) facets[key] = values
  }
  return facets
}

/** Any active filter puts the view behind noindex. */
export function hasActiveFilters(facets: Record<string, string[]>): boolean {
  return Object.values(facets).some((values) => values.length > 0)
}

export async function buildListingQuery(
  collection: CollectionDef,
  facets: Record<string, string[]>,
  step = 1,
): Promise<ProductQuery> {
  const query: ProductQuery = { ...collection.query, facets }

  // Paging asks for more from the start rather than carrying a cursor in
  // the URL. See src/lib/commerce/pagination.ts for why.
  query.first = firstForStep(collection.query.first ?? LISTING_PAGE_SIZE, step)

  if (collection.curated) {
    const curated = await getCuratedListing(collection.path)
    // A curated listing with no CMS document has nothing to show. It must
    // not silently fall back to a query, because the whole point of curating
    // it is that a query cannot pick the right products.
    query.handles = curated?.handles ?? []
    query.first = Math.max(query.handles.length, 1)
  }

  return query
}

export async function ListingPage({
  collection,
  searchParams,
}: {
  collection: CollectionDef
  searchParams: ListingSearchParams
}) {
  const facets = parseFacets(searchParams, collection.facets)
  const step = parseStep(searchParams.more)
  const pageSize = collection.query.first ?? LISTING_PAGE_SIZE
  const query = await buildListingQuery(collection, facets, step)

  const [copy, fetched, shopifyIntro] = await Promise.all([
    getListingCopy(collection.path),
    collection.curated
      ? queryProducts(query)
      : queryListing(collection.path, query),
    collection.introFromShopify && collection.query.collection
      ? collectionDescription(collection.query.collection)
      : null,
  ])
  // The merchant's own words from Shopify lead where the listing asks for
  // them; the CMS intro is the fallback.
  const intro = shopifyIntro ?? copy?.intro ?? null

  // The Christmas listing shows the hampers dressed for Christmas; every
  // other listing shows the product's own image. Same products, same
  // prices, same links: only the photograph changes. See
  // commerce/christmas-images.ts, and remove this in January.
  const result = CHRISTMAS_IMAGE_PATHS.has(collection.path)
    ? { ...fetched, items: withChristmasImages(fetched.items) }
    : fetched

  // The min-four rule applies to the unfiltered listing. A filter that
  // returns nothing is a legitimate empty state, not a broken route. A
  // listing marked comingSoon is already in the menu, so it stays put and
  // says so rather than bouncing the reader somewhere else.
  const comingSoon =
    collection.comingSoon !== undefined &&
    !hasActiveFilters(facets) &&
    result.items.length < minProductsFor(collection)
  if (!comingSoon && !hasActiveFilters(facets) && result.items.length < minProductsFor(collection)) {
    if (collection.parentPath === collection.path) notFound()
    redirect(collection.parentPath)
  }

  const facetData = await Promise.all(
    collection.facets.map(async (facet) => ({
      facet,
      options: (await facetOptions({ ...collection.query, facets }, facet)).filter(
        // The "For" box offers For her and For him only; For clients and the
        // rest stay off the rail (client, October 2026).
        (option) => facet !== 'recipient' || RECIPIENT_FILTER_VALUES.includes(option.value),
      ),
      selected: facets[facet] ?? [],
    })),
  )
  // A facet with one value or none is not a choice, so the rail only shows when
  // at least one facet offers a real choice between values, or a For value
  // (see ListingFilters). Once a filter is on, the rail stays, so the grid
  // never jumps sideways after a click.
  const showFilters =
    hasActiveFilters(facets) ||
    facetData.some((f) => f.options.length > 1 || (f.facet === 'recipient' && f.options.length === 1))

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: hubLabel(collection.hub), path: `/${collection.hub}` },
    { name: collection.title, path: collection.path },
  ]

  const hero = LISTING_HEROES[collection.path]

  return (
    <>
      {/* A listing with a hero leads with it, full bleed, and the
          breadcrumb follows on cream. Pushing the breadcrumb above would
          put a thin strip of chrome over the one image on the page. */}
      {hero ? <ListingHero content={hero} h1={collection.h1} intro={intro} /> : null}

      <nav aria-label="Breadcrumb" className="mx-auto max-w-[1400px] px-4 pt-6 lg:px-8">
        <ol className="flex flex-wrap gap-2 text-sm text-ink-muted">
          {crumbs.map((crumb, index) => (
            <li key={crumb.path} className="flex gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {index === crumbs.length - 1 ? (
                <span aria-current="page">{crumb.name}</span>
              ) : (
                <Link href={crumb.path} className="hover:underline">
                  {crumb.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* The hero already carries the h1 and the intro, so a listing with
          one does not repeat them here. */}
      {hero ? null : (
        <header className="mx-auto max-w-[1400px] px-4 pt-6 lg:px-8">
          <h1 className="font-display text-[length:var(--text-display)] text-navy">
            {collection.h1}
          </h1>
          {/* The intro, not copy: an entry can now carry a title and a
              meta description with no page copy, and `copy ?` would render
              an empty paragraph under the h1 for every one of those. */}
          {intro ? <p className="prose-tpc mt-4 text-lg text-ink-muted">{intro}</p> : null}
        </header>
      )}

      <div id="grid" className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8">
        <div
          className={
            showFilters ? 'lg:grid lg:grid-cols-[240px_1fr] lg:gap-10 lg:items-start' : undefined
          }
        >
          {showFilters ? (
            <ListingFilters
              basePath={collection.path}
              facets={facetData}
              resultCount={result.totalKnown}
            />
          ) : null}

          <div className={showFilters ? 'mt-6 lg:mt-0' : undefined}>
            {comingSoon && result.items.length === 0 ? (
              <ComingSoonState message={collection.comingSoon!} parentPath={collection.parentPath} />
            ) : result.items.length ? (
              <>
                <ProductGrid products={result.items} priorityCount={4} />
                <ShowMore
                  shown={result.items.length}
                  total={result.totalKnown}
                  paged={step > 1}
                  href={
                    hasMore(result.pageInfo, step, pageSize)
                      ? nextStepHref(collection.path, searchParams, step)
                      : null
                  }
                />
              </>
            ) : (
              <EmptyFilterState basePath={collection.path} />
            )}
          </div>
        </div>
      </div>

      {copy?.seoBlock ? (
        <section className="border-t border-rule bg-beige">
          <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
            <div
              className="prose-tpc text-ink-muted"
              // Copy comes from the CMS, authored by us, not from shoppers.
              dangerouslySetInnerHTML={{ __html: copy.seoBlock }}
            />
          </div>
          <InkWaves className="h-12 w-full text-green/20" lines={3} />
        </section>
      ) : null}

      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  )
}

/**
 * The bottom of a grid.
 *
 * It says how far down the list the reader is, because a grid that shows
 * twenty four of a hundred and thirty one without saying so is the thing
 * this replaced. `total` is only trustworthy where the source knows it:
 * Storefront will not give a count for a search, so the count is stated
 * only when it is larger than what is on screen.
 *
 * The control is a link, not a button. It works with JavaScript off, the
 * URL it produces is shareable, and a crawler follows it.
 */
export function ShowMore({
  shown,
  total,
  href,
  paged,
}: {
  shown: number
  total: number
  href: string | null
  /** True once the reader has asked for more, so the end is worth stating. */
  paged: boolean
}) {
  // A listing that fits on one page needs no footer. One the reader has
  // paged through does: having clicked "Show more" they are owed the word
  // that there is no more.
  if (!href && total <= shown && !paged) return null

  return (
    <div id="more" className="mt-12 flex flex-col items-center gap-3 border-t border-rule pt-10">
      <p className="text-sm text-ink-muted">
        {total > shown ? `Showing ${shown} of ${total}` : `Showing all ${shown}`}
      </p>
      {href ? (
        <Link
          href={href}
          className="border border-navy px-8 py-3 font-serif text-lg text-navy transition-colors hover:bg-navy hover:text-cream"
        >
          Show more
        </Link>
      ) : null}
    </div>
  )
}

function ComingSoonState({ message, parentPath }: { message: string; parentPath: string }) {
  return (
    <div className="mt-10 border border-rule bg-beige px-6 py-14 text-center">
      <h2 className="font-serif text-2xl text-navy">Coming soon</h2>
      <p className="mx-auto mt-2 max-w-xl text-ink-muted">{message}</p>
      <Link href={parentPath} className="mt-5 inline-block text-navy underline underline-offset-4">
        Browse the rest
      </Link>
    </div>
  )
}

function EmptyFilterState({ basePath }: { basePath: string }) {
  return (
    <div className="mt-10 border border-rule bg-beige px-6 py-14 text-center">
      <h2 className="font-serif text-2xl text-navy">Nothing matches those filters</h2>
      <p className="mt-2 text-ink-muted">
        Clear a filter or two and the list will fill back up.
      </p>
      <Link href={basePath} className="mt-5 inline-block text-navy underline underline-offset-4">
        Clear all filters
      </Link>
    </div>
  )
}

function hubLabel(hub: CollectionDef['hub']): string {
  switch (hub) {
    case 'hampers':
      return 'Hampers'
    case 'wine':
      return 'The Wine Vault'
    case 'occasions':
      return 'Occasions'
    case 'gifts-for':
      return 'Gifts for'
    case 'gifts-by-budget':
      return 'Gifts by budget'
    case 'gifts':
      return 'Gifts'
    case 'corporate-gifting':
      return 'Corporate gifting'
  }
}

/**
 * Metadata for a listing route, including the noindex rule for filtered
 * views. Called from each route's generateMetadata.
 */
export async function listingMetadata(
  collection: CollectionDef,
  searchParams: ListingSearchParams,
) {
  const copy = await getListingCopy(collection.path)
  const facets = parseFacets(searchParams, collection.facets)
  const filtered = hasActiveFilters(facets)
  // A coming-soon listing with nothing on it yet is kept out of search
  // until it fills. The same cached read the page makes.
  const empty =
    collection.comingSoon !== undefined &&
    (await queryListing(collection.path, collection.query)).items.length < minProductsFor(collection)

  return {
    title: copy?.metaTitle ?? collection.title,
    // A written description first, then the intro cut to length. The cut
    // used to be a bare slice(0, 155), which lands mid-word about as often
    // as not — "…chosen by us, with someth". Google rewrites a description
    // it does not like, and a truncated word is the clearest signal there
    // is that nobody wrote one.
    description: copy?.metaDescription ?? truncateAtWord(copy?.intro, 155),
    alternates: { canonical: collection.path },
    // A filtered view is shareable, but it must not compete with the listing
    // it came from, and its links only lead to more filter combinations, so a
    // crawler is told not to follow them either.
    robots: filtered
      ? { index: false, follow: false }
      : empty
        ? { index: false, follow: true }
        : undefined,
  }
}

/**
 * `text` cut to at most `max` characters, ending on a word and then an
 * ellipsis. Returns undefined for undefined so it can be handed an optional
 * straight through, and returns the text untouched when it already fits.
 */
export function truncateAtWord(text: string | undefined, max: number): string | undefined {
  if (!text) return undefined
  if (text.length <= max) return text
  // Leave room for the ellipsis, then step back to the last space.
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '')}…`
}
