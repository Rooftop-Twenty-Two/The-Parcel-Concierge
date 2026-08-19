import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Checkout is not connected',
  robots: { index: false, follow: false },
}

/**
 * Where the fixture cart's checkoutUrl points.
 *
 * On a connected store this page is unreachable: checkoutUrl comes from
 * Shopify and goes to Shopify hosted checkout. It exists so that in a
 * preview build the checkout button leads somewhere honest rather than to
 * a dead URL.
 */
export default function CheckoutUnavailablePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center lg:px-8">
      <h1 className="font-display text-[length:var(--text-hero)] text-navy">
        This is a preview build
      </h1>
      <p className="mt-4 text-lg text-ink-muted">
        No Shopify store is connected, so there is no checkout to send you to. Everything up to
        this point works exactly as it will on the live site: the cart, the personalisation and the
        stock check are all real.
      </p>
      <p className="mt-4 text-ink-muted">
        On the live site this button goes straight to Shopify hosted checkout, which is where card
        details, Shop Pay, discounts and tax are handled.
      </p>
      <Link
        href="/cart"
        className="mt-8 inline-block border-2 border-navy px-6 py-3 text-navy transition-colors hover:bg-navy hover:text-cream"
      >
        Back to your cart
      </Link>
    </div>
  )
}
