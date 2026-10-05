'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { formatMinor } from '@/lib/commerce/money'
import { PICKER_SHELVES } from '@/lib/hamper-builder'

/**
 * The picker: the whole shop, one shelf at a time.
 *
 * Two thousand products live behind this, fetched a page at a time from
 * /api/builder-items. The interaction is deliberately shop-like: chips are
 * the aisles, the search box is asking at the counter, and + puts the
 * thing in your box. No product page detour, no cart round trip.
 */

export type PickerItem = {
  id: string
  handle: string
  title: string
  priceMinor: number
  image: { url: string; alt: string } | null
  variantId: string | null
  alcohol: boolean
}

type PickerResponse = {
  items: PickerItem[]
  page: number
  hasMore: boolean
  total: number
}

export function ItemsPicker({
  quantities,
  onAdjust,
}: {
  /** item.id → quantity, owned by the wizard so the box survives step changes. */
  quantities: Record<string, number>
  onAdjust: (item: PickerItem, delta: number) => void
}) {
  const [shelf, setShelf] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pages, setPages] = useState<PickerItem[][]>([])
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const requestSeq = useRef(0)

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    const seq = ++requestSeq.current
    setLoading(true)
    setFailed(false)

    fetch(
      `/api/builder-items?shelf=${encodeURIComponent(shelf)}&q=${encodeURIComponent(debouncedSearch)}&page=1`,
    )
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then((body: PickerResponse) => {
        if (cancelled || seq !== requestSeq.current) return
        setPages([body.items])
        setHasMore(body.hasMore)
        setTotal(body.total)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled || seq !== requestSeq.current) return
        setFailed(true)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [shelf, debouncedSearch])

  async function loadMore() {
    const nextPage = pages.length + 1
    setLoading(true)
    try {
      const r = await fetch(
        `/api/builder-items?shelf=${encodeURIComponent(shelf)}&q=${encodeURIComponent(debouncedSearch)}&page=${nextPage}`,
      )
      if (!r.ok) throw new Error(`${r.status}`)
      const body: PickerResponse = await r.json()
      setPages((current) => [...current, body.items])
      setHasMore(body.hasMore)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  const items = pages.flat()

  return (
    <div>
      {/* The aisles. */}
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Categories">
        {PICKER_SHELVES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={shelf === s.id}
            onClick={() => setShelf(s.id)}
            className={`shrink-0 border px-4 py-2 text-sm transition-colors ${
              shelf === s.id
                ? 'border-navy bg-navy text-cream'
                : 'border-navy/25 bg-cream text-navy hover:border-navy'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex w-full max-w-sm items-center gap-2 border border-navy/25 bg-cream px-3 py-2">
          <span className="sr-only">Search the shop</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the whole shop"
            className="w-full bg-transparent text-sm text-navy outline-none placeholder:text-ink-muted"
          />
        </label>
        {total !== null ? (
          <p className="text-sm text-ink-muted" aria-live="polite">
            {total} {total === 1 ? 'thing' : 'things'}
            {debouncedSearch ? ` matching “${debouncedSearch}”` : ' on this shelf'}
          </p>
        ) : null}
      </div>

      {failed ? (
        <div className="mt-8 border border-rule bg-beige px-6 py-10 text-center">
          <p className="text-navy">The shelf did not load. Check your connection and try again.</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => setShelf((s) => s)}>
            Try again
          </Button>
        </div>
      ) : null}

      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <PickerCard item={item} quantity={quantities[item.id] ?? 0} onAdjust={onAdjust} />
          </li>
        ))}
        {loading && items.length === 0
          ? Array.from({ length: 8 }, (_, i) => (
              <li key={`skeleton-${i}`} aria-hidden="true">
                <div className="aspect-square w-full animate-pulse bg-beige" />
                <div className="mt-3 h-4 w-3/4 animate-pulse bg-beige" />
                <div className="mt-2 h-4 w-1/4 animate-pulse bg-beige" />
              </li>
            ))
          : null}
      </ul>

      {!loading && !failed && items.length === 0 ? (
        <div className="mt-8 border border-rule bg-beige px-6 py-10 text-center text-ink-muted">
          Nothing matches. Try another word, or another shelf.
        </div>
      ) : null}

      {hasMore ? (
        <div className="mt-10 text-center">
          <Button type="button" variant="secondary" onClick={loadMore} disabled={loading}>
            {loading ? 'One moment' : 'Show more'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function PickerCard({
  item,
  quantity,
  onAdjust,
}: {
  item: PickerItem
  quantity: number
  onAdjust: (item: PickerItem, delta: number) => void
}) {
  const inBox = quantity > 0

  return (
    <article
      className={`flex h-full flex-col border transition-colors ${
        inBox ? 'border-navy bg-beige' : 'border-transparent'
      }`}
    >
      <div className="relative bg-beige">
        {item.image ? (
          <Image
            src={item.image.url}
            alt={item.image.alt}
            width={600}
            height={600}
            sizes="(min-width: 1024px) 22vw, 45vw"
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="aspect-square w-full bg-beige" />
        )}
      </div>

      <div className="flex flex-1 flex-col p-2">
        <h3 className="text-sm leading-snug text-navy">{item.title}</h3>
        <p className="mt-1 text-sm font-medium text-navy">{formatMinor(item.priceMinor)}</p>

        <div className="mt-auto pt-3">
          {inBox ? (
            <div className="flex items-center justify-between border border-navy">
              <button
                type="button"
                onClick={() => onAdjust(item, -1)}
                className="px-4 py-2 text-navy hover:bg-navy hover:text-cream"
                aria-label={`Take one ${item.title} out of your hamper`}
              >
                −
              </button>
              <span className="text-sm font-medium text-navy" aria-live="polite">
                {quantity} added
              </span>
              <button
                type="button"
                onClick={() => onAdjust(item, 1)}
                className="px-4 py-2 text-navy hover:bg-navy hover:text-cream"
                aria-label={`Add another ${item.title}`}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAdjust(item, 1)}
              disabled={!item.variantId}
              className="w-full border border-navy py-2 text-sm text-navy transition-colors hover:bg-navy hover:text-cream disabled:opacity-40"
              aria-label={`Add ${item.title} to your hamper`}
            >
              +
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
