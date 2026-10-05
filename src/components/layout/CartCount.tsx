'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CART_CHANGED_EVENT } from '@/lib/cart-events'

/**
 * The header cart badge.
 *
 * Fetched after hydration rather than rendered on the server, so the root
 * layout never reads a cookie. A cookie read in the layout opts every page
 * on the site out of static rendering, which is a very expensive way to
 * render one number.
 *
 * It refetches on navigation, and whenever something announces a cart
 * change (lib/cart-events). Navigation alone missed the commonest case:
 * adding to cart stays on the same page, router.refresh() does not change
 * the path, and the badge kept its old number (client report, October 2026).
 */
export function CartCount() {
  const pathname = usePathname()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    // Only the latest read may set the count, so a slow earlier response
    // cannot overwrite a newer one.
    let seq = 0

    function load() {
      const mine = ++seq
      fetch('/api/cart', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : { totalQuantity: 0 }))
        .then((body: { totalQuantity?: number }) => {
          if (!cancelled && mine === seq) setCount(body.totalQuantity ?? 0)
        })
        .catch(() => {
          if (!cancelled && mine === seq) setCount(0)
        })
    }

    load()
    window.addEventListener(CART_CHANGED_EVENT, load)
    return () => {
      cancelled = true
      window.removeEventListener(CART_CHANGED_EVENT, load)
    }
  }, [pathname])

  // Render nothing until we know, rather than flashing a zero that is then
  // corrected. An empty badge that fills in reads better than a wrong one.
  if (count === null) {
    return <span className="inline-flex h-6 min-w-6" aria-hidden="true" />
  }

  return (
    <span
      className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-navy px-1.5 text-xs text-cream"
      aria-label={`${count} ${count === 1 ? 'item' : 'items'} in your cart`}
    >
      {count}
    </span>
  )
}
