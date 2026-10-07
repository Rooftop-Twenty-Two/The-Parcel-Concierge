import Link from 'next/link'
import type { Metadata } from 'next'

// Otherwise a 404 inherits the homepage title, and a tab or a search result
// for a dead URL reads like the front page.
export const metadata: Metadata = { title: 'Page not found' }

/**
 * The bare 404, for routes outside the shop chrome (an expired or
 * mistyped /gift link, mostly). The shop's own 404 lives in (site).
 */
export default function RootNotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-4xl text-navy">We could not find that</h1>
      <p className="mt-3 text-ink-muted">
        If somebody sent you this link as a gift, it may have expired or been mistyped. Check the
        link with them, or visit the shop instead.
      </p>
      <Link href="/" className="mt-6 border-2 border-navy px-5 py-3 text-navy hover:bg-navy hover:text-cream">
        The Parcel Concierge
      </Link>
    </main>
  )
}
