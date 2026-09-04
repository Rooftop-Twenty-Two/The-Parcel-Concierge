'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ProductCardTile } from '@/components/product/ProductCard'
import type { ProductCard as ProductCardModel } from '@/lib/commerce/types'

/**
 * A row of products you can scroll sideways.
 *
 * NOT an autoplay carousel. The design direction rules those out and they
 * are a performance and accessibility problem besides: nothing moves here
 * unless somebody moves it.
 *
 * Native overflow scrolling with CSS snap points does the work, so it
 * scrolls with a trackpad, a touch swipe, the scrollbar or the keyboard
 * before any JavaScript loads. The buttons are an affordance on top of
 * that, not the mechanism: without JS you still get a scrollable row, and
 * the buttons simply never appear.
 */
export function ProductCarousel({
  products,
  label,
}: {
  products: ProductCardModel[]
  /** Names the region for screen readers, e.g. "More hampers". */
  label: string
}) {
  const scroller = useRef<HTMLUListElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    // A pixel of tolerance: sub-pixel layout means scrollLeft rarely lands
    // exactly on either edge, and a button that never enables is worse
    // than one that enables a pixel early.
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [measure])

  function page(direction: 1 | -1) {
    const el = scroller.current
    if (!el) return
    // Just under a full width, so the card at the edge stays partly in
    // view and the reader keeps their place.
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  const scrollable = !(atStart && atEnd)

  return (
    <div className="relative">
      {scrollable ? (
        <div className="mb-4 flex justify-end gap-2">
          <CarouselButton
            direction="left"
            label={`Scroll ${label} backwards`}
            disabled={atStart}
            onClick={() => page(-1)}
          />
          <CarouselButton
            direction="right"
            label={`Scroll ${label} forwards`}
            disabled={atEnd}
            onClick={() => page(1)}
          />
        </div>
      ) : null}

      <ul
        ref={scroller}
        // Focusable so a keyboard can scroll it, and labelled so it is
        // announced as a region rather than as an unexplained scroll area.
        tabIndex={0}
        role="region"
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 focus-visible:outline-offset-4 lg:mx-0 lg:px-0"
      >
        {products.map((product) => (
          <li
            key={product.id}
            className="w-[62%] shrink-0 snap-start sm:w-[42%] lg:w-[calc((100%-3rem)/3)]"
          >
            <ProductCardTile product={product} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function CarouselButton({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right'
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center border border-navy/25 text-navy transition-colors hover:border-navy hover:bg-navy hover:text-cream disabled:pointer-events-none disabled:opacity-30"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`h-4 w-4 ${direction === 'left' ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
