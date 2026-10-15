import Link from 'next/link'
import type { FacetKey } from '@/lib/commerce/collections'
import { PRICE_BANDS, RECIPIENT_TAGS, TAG_LABELS } from '@/lib/commerce/taxonomy'

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
// Recipients lead with For her and For him, the two shoppers reach for.
const RECIPIENT_ORDER = RECIPIENT_TAGS.map((tag) => tag.slice('recipient:'.length))

function orderedOptions(
  facet: FacetKey,
  options: { value: string; count: number }[],
): { value: string; count: number }[] {
  const order = facet === 'price' ? PRICE_ORDER : facet === 'recipient' ? RECIPIENT_ORDER : null
  if (!order) return options
  return [...options].sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value))
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
  defaultOpen,
}: {
  basePath: string
  facets: FacetData[]
  entry: FacetData
  defaultOpen: boolean
}) {
  // Collapsed by default so the long grape list does not dominate the rail;
  // a section with an active selection opens so the choice stays visible. Any
  // number can be open at once — native <details>, no accordion behaviour.
  const open = defaultOpen || entry.selected.length > 0
  return (
    <details open={open} className="group border-t border-rule py-3 first:border-t-0 first:pt-0">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 font-serif text-sm uppercase tracking-wide text-navy [&::-webkit-details-marker]:hidden">
        <span className="flex items-center">
          {FACET_LABELS[entry.facet]}
          {entry.selected.length ? (
            <span className="ml-2 inline-grid h-4 min-w-4 place-items-center rounded-full bg-navy px-1 text-[10px] leading-none text-cream">
              {entry.selected.length}
            </span>
          ) : null}
        </span>
        <svg
          viewBox="0 0 10 6"
          aria-hidden="true"
          className="h-1.5 w-2.5 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
        >
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </summary>
      <ul className="mt-2 flex flex-col gap-1">
        {orderedOptions(entry.facet, entry.options).map((option) => {
          const selected = entry.selected.includes(option.value)
          return (
            <li key={option.value}>
              <Link
                href={toggleHref(basePath, facets, entry.facet, option.value)}
                rel="nofollow"
                scroll={false}
                aria-pressed={selected}
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
    </details>
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
  const active = facets.flatMap((f) => f.selected.map((value) => ({ facet: f.facet, value })))
  // A one-value facet usually covers every product, so it is hidden. Recipient
  // is the exception: only some products carry For her / For him, so even a
  // lone value narrows the grid. Once a filter is on, every facet with a value
  // stays put, so sections do not vanish under the shopper's cursor.
  const shown = facets.filter(
    (f) =>
      f.options.length > 1 ||
      (f.options.length === 1 && (f.facet === 'recipient' || active.length > 0)),
  )

  const sections = shown.map((entry, index) => (
    <FacetSection
      key={entry.facet}
      basePath={basePath}
      facets={facets}
      entry={entry}
      defaultOpen={index === 0}
    />
  ))

  const activePills = active.length ? (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
      {active.map(({ facet, value }) => (
        <Link
          key={`${facet}:${value}`}
          href={toggleHref(basePath, facets, facet, value)}
          rel="nofollow"
          scroll={false}
          className="inline-flex items-center gap-1.5 border border-navy bg-navy px-2.5 py-1 text-xs text-cream transition-colors hover:bg-navy/85"
        >
          {label(facet, value)}
          <span aria-hidden="true">×</span>
          <span className="sr-only">Remove this filter</span>
        </Link>
      ))}
      <Link href={basePath} scroll={false} className="text-sm text-navy underline underline-offset-4">
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

      {/* Desktop: a rail beside the products that scrolls on its own, so a long
          facet list never drags the page grid with it. */}
      <div className="mt-4 hidden lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
        <h2 className="mb-3 font-display text-lg text-navy">Filter</h2>
        {sections}
        {activePills}
      </div>
    </aside>
  )
}
