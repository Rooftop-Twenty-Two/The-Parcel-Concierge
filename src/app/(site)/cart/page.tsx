import type { Metadata } from 'next'
import Link from 'next/link'
import { CartView } from '@/components/cart/CartView'
import { DeliveryPromise } from '@/components/commerce/DeliveryPromise'
import { CardUpsell } from '@/components/product/CardUpsell'
import { ProductGrid } from '@/components/product/ProductCard'
import { TrustpilotStars } from '@/components/trust/TrustpilotStars'
import { greetingCards, queryProducts } from '@/lib/commerce'
import { getCart } from '@/lib/commerce/cart'
import { getTrustSummary } from '@/lib/trustpilot'

export const metadata: Metadata = {
  title: 'Your cart',
  robots: { index: false, follow: false },
}

// A cart is never static.
export const dynamic = 'force-dynamic'

export default async function CartPage() {
  const [cart, trust, addons, cards] = await Promise.all([
    getCart(),
    getTrustSummary(),
    queryProducts({ kinds: ['addon'], first: 4, sort: 'price-asc' }),
    greetingCards(),
  ])

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center lg:px-8">
        <h1 className="font-display text-[length:var(--text-hero)] text-navy">Your cart is empty</h1>
        <p className="mt-4 text-lg text-ink-muted">
          Nothing in it yet. The hampers are the place to start.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/hampers"
            className="bg-red px-6 py-3 text-cream transition-colors hover:bg-wine"
          >
            Shop hampers
          </Link>
          <Link
            href="/build-your-own-hamper"
            className="border-2 border-navy px-6 py-3 text-navy transition-colors hover:bg-navy hover:text-cream"
          >
            Build your own
          </Link>
        </div>
      </div>
    )
  }

  // Offered until a card is in: one card carries the gift message.
  const hasCard = cart.lines.some((line) => cards.some((card) => card.handle === line.productHandle))

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8">
        <h1 className="font-display text-[length:var(--text-hero)] text-navy">Your cart</h1>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <CartView cart={cart} cardOffer={hasCard ? null : <CardUpsell cards={cards} />} />

          <aside className="space-y-8">
            <div className="border border-rule bg-beige p-6">
              <TrustpilotStars rating={trust.rating} reviewCount={trust.reviewCount} />
              <div className="mt-4">
                <DeliveryPromise compact />
              </div>
            </div>
          </aside>
        </div>

        {addons.items.length ? (
          <section className="mt-16 border-t border-rule pt-12">
            <h2 className="font-display text-[length:var(--text-display)] text-navy">
              Finish the gift
            </h2>
            <p className="mt-2 max-w-xl text-ink-muted">
              We pack these into the same box before we tie the ribbon. No extra delivery.
            </p>
            <div className="mt-8">
              <ProductGrid products={addons.items} />
            </div>
          </section>
        ) : null}
      </div>
    </>
  )
}
