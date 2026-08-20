import type { Metadata } from 'next'
import Link from 'next/link'
import { ProductGrid } from '@/components/product/ProductCard'
import { PostmarkRoundel } from '@/components/ui/Stamp'
import { queryProducts } from '@/lib/commerce'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Gift card',
  description:
    'A Parcel Concierge gift card, delivered by email, for when you would rather they chose the box themselves.',
  alternates: { canonical: '/gift-card' },
}

/**
 * Gift card.
 *
 * Shopify issues and redeems gift cards natively, so there is nothing for
 * us to build beyond selling the product. The card product does not exist
 * in the store yet, so this page currently explains the alternative rather
 * than showing a buy button for something that cannot be bought.
 */
export default async function GiftCardPage() {
  const { items } = await queryProducts({ productTypes: ['Gift card'], first: 4 })

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <PostmarkRoundel className="h-20 w-20 text-green" />
      <h1 className="mt-6 font-display text-[length:var(--text-hero)] text-navy">Gift card</h1>

      {items.length ? (
        <>
          <p className="mt-4 text-lg text-ink-muted">
            Delivered by email, redeemable against anything on the site, and it does not expire.
          </p>
          <div className="mt-10">
            <ProductGrid products={items} />
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-lg text-ink-muted">
            We are setting our gift cards up now and they are not on sale yet.
          </p>
          <p className="mt-4 text-ink-muted">
            In the meantime, the{' '}
            <Link href="/build-your-own-hamper" className="underline underline-offset-4">
              hamper builder
            </Link>{' '}
            is the closest thing to letting somebody choose for themselves, and the{' '}
            <Link href="/gifts-by-budget/under-50" className="underline underline-offset-4">
              budget pages
            </Link>{' '}
            will get you to something good quickly if you are working to a number.
          </p>
        </>
      )}
    </div>
  )
}
