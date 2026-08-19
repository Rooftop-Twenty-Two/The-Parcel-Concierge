'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * The header cart badge.
 *
 * Fetched after hydration rather than rendered on the server, so the root
 * layout never reads a cookie. A cookie read in the layout opts every page
 * on the site out of static rendering, which is a very expensive way to
 * render one number.
 *
 * It refetches on navigation, which covers the add-to-cart case: the server
 * actions call router.refresh(), the path changes or the tree re-renders,
 * and the badge catches up.
 */
export function CartCount() {
  const pathname = usePathname()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/cart')
      .then((response) => (response.ok ? response.json() : { totalQuantity: 0 }))
      .then((body: { totalQuantity?: number }) => {
        if (!cancelled) setCount(body.totalQuantity ?? 0)
      })
      .catch(() => {
        if (!cancelled) setCount(0)
      })

    return () => {
      cancelled = true
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
