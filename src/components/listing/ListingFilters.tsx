import Link from 'next/link'
import type { FacetKey } from '@/lib/commerce/collections'
import { PRICE_BANDS, TAG_LABELS } from '@/lib/commerce/taxonomy'

/**
 * Listing filters — a side rail of facets.
 *
 * Grape, region, style and price are filters here, not fifty separate routes
 * like the old site had. The rail shows only the facets the products in this
 * listing actually offer, and each value carries its live count.
 *
 * URL driven and server fed: every value and pill is a plain link, so a
 * filtered view is a real, shareable URL and the whole thing works with no
 * JavaScript. On desktop the rail sits open beside the grid; on narrow screens
 * it collapses into a single native <details> so it never buries the products.
 */

export type FacetData = {
  facet: FacetKey
  options: { value: string; count: number }[]
  selected: string[]
}

const FACET_LABELS: Record<FacetKey, string> = {
  grape: 'Grape',
  region: 'Region',
  country: 'Country',
  style: 'Style',
  price: 'Price',
  occasion: 'Occasion',
  recipient: 'For',
}

// Facet values arrive alphabetised, which reads as nonsense for price
// bands. They follow the band order shoppers expect: low to high.
const PRICE_ORDER = PRICE_BANDS.map((band) => band.tag.slice('price:'.length))

function orderedOptions(
  facet: FacetKey,
  options: { value: string; count: number }[],
): { value: string; count: number }[] {
  if (facet !== 'price') return options
  return [...options].sort(
    (a, b) => PRICE_ORDER.indexOf(a.value) - PRICE_ORDER.indexOf(b.value),
  )
}

function toggleHref(
  basePath: string,
  facets: FacetData[],
  facet: FacetKey,
  value: string,
): string {
  const params = new URLSearchParams()
  for (const entry of facets) {
    const values =
      entry.facet === facet
        ? entry.selected.includes(value)
          ? entry.selected.filter((v) => v !== value)
          : [...entry.selected, value]
        : entry.selected
    // Sorted, so one selection is one URL whatever order it was clicked in.
    // Click order made every set of six grapes 720 different pages.
    if (values.length) params.set(entry.facet, [...values].sort().join(','))
  }
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

function label(facet: FacetKey, value: string): string {
  if (facet === 'occasion') return TAG_LABELS[`occasion:${value}`] ?? value
  if (facet === 'recipient') return TAG_LABELS[`recipient:${value}`] ?? value
  if (facet === 'price') return TAG_LABELS[`price:${value}`] ?? value.replace(/-/g, ' ')
  return value
}

/** One facet's heading and its list of value links. */
function FacetSection({
  basePath,
  facets,
  entry,
}: {
  basePath: string
  facets: FacetData[]
  entry: FacetData
}) {
  return (
    <div className="border-t border-rule py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2 font-serif text-sm uppercase tracking-wide text-navy">
        {FACET_LABELS[entry.facet]}
      </h3>
      <ul className="flex flex-col gap-1">
        {orderedOptions(entry.facet, entry.options).map((option) => {
          const selected = entry.selected.includes(option.value)
          return (
            <li key={option.value}>
              <Link
                href={toggleHref(basePath, facets, entry.facet, option.value)}
                rel="nofollow"
                aria-current={selected ? 'true' : undefined}
                className="group flex items-center gap-2 py-0.5 text-sm text-navy"
              >
                <span
                  aria-hidden="true"
                  className={`grid h-4 w-4 shrink-0 place-items-center border text-[10px] leading-none ${
                    selected
                      ? 'border-navy bg-navy text-cream'
                      : 'border-rule bg-cream group-hover:border-navy'
                  }`}
                >
                  {selected ? '✓' : ''}
                </span>
                <span className="flex-1 group-hover:underline">{label(entry.facet, option.value)}</span>
                <span className="text-ink-muted">{option.count}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ListingFilters({
  basePath,
  facets,
  resultCount,
}: {
  basePath: string
  facets: FacetData[]
  resultCount: number
}) {
  const shown = facets.filter((f) => f.options.length > 1)
  const active = facets.flatMap((f) => f.selected.map((value) => ({ facet: f.facet, value })))

  const sections = shown.map((entry) => (
    <FacetSection key={entry.facet} basePath={basePath} facets={facets} entry={entry} />
  ))

  const activePills = active.length ? (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
      {active.map(({ facet, value }) => (
        <Link
          key={`${facet}:${value}`}
          href={toggleHref(basePath, facets, facet, value)}
          rel="nofollow"
          className="inline-flex items-center gap-1.5 border border-navy bg-navy px-2.5 py-1 text-xs text-cream transition-colors hover:bg-navy/85"
        >
          {label(facet, value)}
          <span aria-hidden="true">×</span>
          <span className="sr-only">Remove this filter</span>
        </Link>
      ))}
      <Link href={basePath} className="text-sm text-navy underline underline-offset-4">
        Clear all
      </Link>
    </div>
  ) : null

  return (
    <aside aria-label="Filter these products" className="lg:sticky lg:top-6 lg:self-start">
      <p className="text-sm text-ink-muted" role="status">
        {resultCount} {resultCount === 1 ? 'product' : 'products'}
      </p>

      {/* Narrow screens: one collapsible panel so it never buries the grid. */}
      <details className="mt-3 border-y border-rule lg:hidden">
        <summary className="flex cursor-pointer select-none items-center justify-between py-3 font-serif text-navy [&::-webkit-details-marker]:hidden">
          Filter
          {active.length ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-navy px-1 text-[11px] leading-none text-cream">
              {active.length}
            </span>
          ) : (
            <span aria-hidden="true" className="text-ink-muted">
              +
            </span>
          )}
        </summary>
        <div className="pb-4">
          {sections}
          {activePills}
        </div>
      </details>

      {/* Desktop: an open rail beside the products. */}
      <div className="mt-4 hidden lg:block">
        <h2 className="mb-3 font-display text-lg text-navy">Filter</h2>
        {sections}
        {activePills}
      </div>
    </aside>
  )
}
