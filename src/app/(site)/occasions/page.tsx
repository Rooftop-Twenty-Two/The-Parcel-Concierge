import type { Metadata } from 'next'
import Link from 'next/link'
import { collectionsInHub } from '@/lib/commerce/collections'
import { populatedListings } from '@/lib/commerce/populated'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Shop by occasion',
  description:
    'Christmas, new baby, sympathy, weddings and the rest. Hampers and gifts grouped by what the day actually is.',
  alternates: { canonical: '/occasions' },
}

export default async function OccasionsHub() {
  // Only the occasions that will actually open. A listing under the
  // four-product floor redirects back to this page, so a card for one is a
  // card that reloads the page you are already on — and with the six
  // seasonal collections retired from the store, that was six of the nine.
  const occasions = await populatedListings(collectionsInHub('occasions'))

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8">
      <h1 className="font-display text-[length:var(--text-hero)] text-navy">Shop by occasion</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-muted">
        If you know what the day is but not what to send, start here. Seasonal pages get reworked
        every year and keep the same address, so a link you saved last Christmas still works.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {occasions.map((occasion) => (
          <li key={occasion.path}>
            <Link
              href={occasion.path}
              className="flex h-full items-center justify-between border border-navy/20 bg-beige px-6 py-6 font-serif text-xl text-navy transition-colors hover:bg-navy hover:text-cream"
            >
              {occasion.title}
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
