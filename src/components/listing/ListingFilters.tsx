'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import type { FacetKey } from '@/lib/commerce/collections'
import { PRICE_BANDS, TAG_LABELS } from '@/lib/commerce/taxonomy'

/**
 * Listing filters.
 *
 * One quiet row of facet buttons instead of forty open chips. Each button
 * discloses its values in a panel below the bar; what is selected shows as
 * removable pills, so the resting state of the page stays calm however
 * many grapes the cellar carries.
 *
 * Still URL driven and server fed: every value and pill is a link, so a
 * filtered view is a real, shareable URL rather than client state that
 * vanishes on refresh. The panels are native <details>, so the whole thing
 * opens, filters and closes without JavaScript; the script on top only
 * adds manners (one panel at a time, close on outside click or Escape).
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
  const sectionRef = useRef<HTMLElement>(null)
  const active = facets.flatMap((f) => f.selected.map((value) => ({ facet: f.facet, value })))

  useEffect(() => {
    function closeAll() {
      sectionRef.current
        ?.querySelectorAll<HTMLDetailsElement>('details[data-facet]')
        .forEach((panel) => {
          panel.open = false
        })
    }
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && sectionRef.current?.contains(event.target)) return
      closeAll()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeAll()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  function closeSiblings(opened: HTMLDetailsElement) {
    sectionRef.current
      ?.querySelectorAll<HTMLDetailsElement>('details[data-facet]')
      .forEach((panel) => {
        if (panel !== opened) panel.open = false
      })
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Filter these products"
      className="relative border-y border-rule py-4"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="text-sm text-ink-muted" role="status">
          {resultCount} {resultCount === 1 ? 'product' : 'products'}
        </p>

        <div className="flex flex-wrap gap-2">
          {facets
            .filter((f) => f.options.length > 1)
            .map((entry) => (
              <details
                key={entry.facet}
                data-facet={entry.facet}
                className="group"
                onToggle={(event) => {
                  if (event.currentTarget.open) closeSiblings(event.currentTarget)
                }}
              >
                <summary
                  className={`flex cursor-pointer select-none items-center gap-2 border px-3 py-1.5 text-sm text-navy transition-colors [&::-webkit-details-marker]:hidden ${
                    entry.selected.length
                      ? 'border-navy bg-beige'
                      : 'border-rule bg-cream hover:border-navy'
                  }`}
                  style={{ listStyle: 'none' }}
                >
                  {FACET_LABELS[entry.facet]}
                  {entry.selected.length ? (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-navy px-1 text-[11px] leading-none text-cream">
                      {entry.selected.length}
                    </span>
                  ) : null}
                  <svg
                    viewBox="0 0 10 6"
                    aria-hidden="true"
                    className="h-1.5 w-2.5 transition-transform group-open:rotate-180"
                  >
                    <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </summary>

                <div className="absolute inset-x-0 top-full z-20 border border-rule bg-cream p-4 shadow-[0_16px_32px_rgba(27,42,74,0.12)]">
                  <ul className="flex flex-wrap gap-2">
                    {orderedOptions(entry.facet, entry.options).map((option) => {
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
                </div>
              </details>
            ))}
        </div>
      </div>

      {active.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {active.map(({ facet, value }) => (
            <Link
              key={`${facet}:${value}`}
              href={toggleHref(basePath, facets, facet, value)}
              rel="nofollow"
              className="inline-flex items-center gap-1.5 border border-navy bg-navy px-3 py-1 text-sm text-cream transition-colors hover:bg-navy/85"
            >
              {label(facet, value)}
              <span aria-hidden="true">×</span>
              <span className="sr-only">Remove this filter</span>
            </Link>
          ))}
          <Link
            href={basePath}
            className="text-sm text-navy underline underline-offset-4"
          >
            Clear all
          </Link>
        </div>
      ) : null}
    </section>
  )
}
