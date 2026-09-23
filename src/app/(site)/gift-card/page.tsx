import type { Metadata } from 'next'
import Link from 'next/link'
import { ProductGrid } from '@/components/product/ProductCard'
import { PostmarkRoundel } from '@/components/ui/Stamp'
import { queryProducts } from '@/lib/commerce'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Gift card',
  description:
    'A Parcel Concierge gift card, by email or as a physical card from the shop in Dunshaughlin, for when you would rather they chose the box themselves.',
  alternates: { canonical: '/gift-card' },
}

/**
 * Gift card.
 *
 * We sell gift cards two ways: an emailed card, which Shopify issues and
 * redeems natively, and a physical card over the counter in Dunshaughlin.
 * Both are confirmed by the client, September 2026.
 *
 * The emailed card is not in the catalogue export yet, so the buy button
 * only appears once the product exists. Until then the page says plainly
 * how to get one rather than pretending we do not sell them.
 */
export default async function GiftCardPage() {
  const { items } = await queryProducts({ productTypes: ['Gift card'], first: 4 })

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <PostmarkRoundel className="h-20 w-20 text-green" />
      <h1 className="mt-6 font-display text-[length:var(--text-hero)] text-navy">Gift card</h1>

      <p className="mt-4 text-lg text-ink-muted">
        We do gift cards two ways: sent by email, or a physical card you can hand over. Both are
        redeemable against anything we sell, online or in the shop.
      </p>

      {items.length ? (
        <div className="mt-10">
          <ProductGrid products={items} />
        </div>
      ) : (
        <p className="mt-4 text-ink-muted">
          The emailed card is not on the site yet, so for the moment{' '}
          <Link href="/contact" className="underline underline-offset-4">
            ring or email us
          </Link>{' '}
          for either kind and we will sort it the same day. The physical cards are on the counter
          in Dunshaughlin whenever you are passing.
        </p>
      )}

      <p className="mt-6 text-ink-muted">
        If you would rather send something they can open, the{' '}
        <Link href="/build-your-own-hamper" className="underline underline-offset-4">
          hamper builder
        </Link>{' '}
        lets you put exactly the right things in a box, and the{' '}
        <Link href="/hampers/under-75" className="underline underline-offset-4">
          budget pages
        </Link>{' '}
        will get you to something good quickly if you are working to a number.
      </p>
    </div>
  )
}
