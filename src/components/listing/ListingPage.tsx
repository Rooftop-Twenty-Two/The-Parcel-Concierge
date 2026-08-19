import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { ProductGrid } from '@/components/product/ProductCard'
import { ListingFilters } from '@/components/listing/ListingFilters'
import { AgeGate } from '@/components/commerce/AgeGate'
import { InkWaves } from '@/components/ui/Stamp'
import { getCuratedListing, getListingCopy } from '@/lib/cms'
import { facetOptions, queryListing, queryProducts } from '@/lib/commerce'
import {
  MIN_PRODUCTS_PER_LISTING,
  type CollectionDef,
  type FacetKey,
} from '@/lib/commerce/collections'
import type { ProductQuery } from '@/lib/commerce/types'
import { breadcrumbJsonLd } from '@/lib/seo/structured-data'

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
): Promise<ProductQuery> {
  const query: ProductQuery = { ...collection.query, facets }

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
  const query = await buildListingQuery(collection, facets)

  const [copy, result] = await Promise.all([
    getListingCopy(collection.path),
    collection.curated
      ? queryProducts(query)
      : queryListing(collection.path, query),
  ])

  // The min-four rule applies to the unfiltered listing. A filter that
  // returns nothing is a legitimate empty state, not a broken route.
  if (!hasActiveFilters(facets) && result.items.length < MIN_PRODUCTS_PER_LISTING) {
    if (collection.parentPath === collection.path) notFound()
    redirect(collection.parentPath)
  }

  const facetData = await Promise.all(
    collection.facets.map(async (facet) => ({
      facet,
      options: await facetOptions({ ...collection.query, facets }, facet),
      selected: facets[facet] ?? [],
    })),
  )

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: hubLabel(collection.hub), path: `/${collection.hub}` },
    { name: collection.title, path: collection.path },
  ]

  return (
    <>
      {collection.alcohol ? <AgeGate context="listing" /> : null}

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

      <header className="mx-auto max-w-[1400px] px-4 pt-6 lg:px-8">
        <h1 className="font-display text-[length:var(--text-display)] text-navy">{collection.h1}</h1>
        {copy ? (
          <p className="prose-tpc mt-4 text-lg text-ink-muted">{copy.intro}</p>
        ) : null}
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8">
        {facetData.some((f) => f.options.length > 1) ? (
          <ListingFilters
            basePath={collection.path}
            facets={facetData}
            resultCount={result.totalKnown}
          />
        ) : null}

        {result.items.length ? (
          <div className="mt-8">
            <ProductGrid products={result.items} priorityCount={4} />
          </div>
        ) : (
          <EmptyFilterState basePath={collection.path} />
        )}
      </div>

      {copy ? (
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
      return 'Wine and spirits'
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

  return {
    title: copy?.metaTitle ?? collection.title,
    description: copy?.metaDescription ?? copy?.intro?.slice(0, 155),
    alternates: { canonical: collection.path },
    // A filtered view is shareable and crawlable, but it must not compete
    // with the listing it came from.
    robots: filtered ? { index: false, follow: true } : undefined,
  }
}
