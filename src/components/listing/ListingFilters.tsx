import Link from 'next/link'
import type { FacetKey } from '@/lib/commerce/collections'
import { TAG_LABELS } from '@/lib/commerce/taxonomy'

/**
 * Listing filters.
 *
 * Server rendered and URL driven, so a filtered view is a real, shareable
 * URL rather than client state that vanishes on refresh. Every control is a
 * link, so the whole thing works without JavaScript and the keyboard order
 * is the reading order.
 *
 * Grape, region and style are filters here. They are not fifty separate
 * routes, which is what the old site had.
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
    if (values.length) params.set(entry.facet, values.join(','))
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

  return (
    <section aria-label="Filter these products" className="border-y border-rule py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-sm text-ink-muted" role="status">
          {resultCount} {resultCount === 1 ? 'product' : 'products'}
        </p>
        {active.length ? (
          <Link href={basePath} className="text-sm text-navy underline underline-offset-4">
            Clear all filters
          </Link>
        ) : null}
      </div>

      <div className="mt-4 space-y-4">
        {facets
          .filter((f) => f.options.length > 1)
          .map((entry) => (
            <fieldset key={entry.facet}>
              <legend className="mb-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                {FACET_LABELS[entry.facet]}
              </legend>
              <ul className="flex flex-wrap gap-2">
                {entry.options.map((option) => {
                  const selected = entry.selected.includes(option.value)
                  return (
                    <li key={option.value}>
                      <Link
                        href={toggleHref(basePath, facets, entry.facet, option.value)}
                        rel="nofollow"
                        aria-pressed={selected}
                        className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm transition-colors ${
                          selected
                            ? 'border-navy bg-navy text-cream'
                            : 'border-rule bg-cream text-navy hover:border-navy'
                        }`}
                      >
                        {label(entry.facet, option.value)}
                        <span className={selected ? 'text-cream/70' : 'text-ink-muted'}>
                          {option.count}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </fieldset>
          ))}
      </div>
    </section>
  )
}
