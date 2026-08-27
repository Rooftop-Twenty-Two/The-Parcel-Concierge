import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BuilderWizard } from '@/components/builder/BuilderWizard'
import { JsonLd } from '@/components/seo/JsonLd'
import { getProduct } from '@/lib/commerce'
import { BUILDER_BOW_HANDLE } from '@/lib/commerce/collections'
import { BUILDER_PARENT_HANDLE } from '@/lib/hamper-builder'
import { breadcrumbJsonLd } from '@/lib/seo/structured-data'

export const revalidate = 900

export const metadata: Metadata = {
  title: 'Build your own hamper',
  description:
    'Pick the box, fill it from everything in the shop, write the card. We pack it by hand in Co. Meath and send it out the same day we send everything else.',
  alternates: { canonical: '/build-your-own-hamper' },
}

/**
 * The custom hamper builder, on our own domain.
 *
 * It used to live on parcel-concierge.vercel.app, which leaked SEO
 * authority and broke trust at the highest-intent moment on the site. This
 * route is the fix, and the whole flow from first click to Shopify checkout
 * stays on theparcelconcierge.com.
 *
 * The full shop is behind it. The main site sells hampers and wine; every
 * other product the client publishes is a quarantined builder item, and
 * this wizard is the only place it can be seen or bought. The picker
 * fetches the catalogue a shelf at a time from /api/builder-items, so the
 * page itself ships only the box options.
 */
export default async function BuildYourOwnHamperPage() {
  const [parent, bowProduct] = await Promise.all([
    getProduct(BUILDER_PARENT_HANDLE),
    getProduct(BUILDER_BOW_HANDLE),
  ])
  if (!parent) {
    // Without the parent product there is no box to sell, and half a
    // builder is worse than none. This is a data problem, not a routing
    // one: the ingest tool guarantees the product exists.
    notFound()
  }

  // The bow is optional twice over: an optional extra for the shopper, and
  // an optional product for the store. If it is missing the builder simply
  // does not offer it.
  const bowVariant = bowProduct?.variants[0] ?? null
  const bow = bowVariant ? { variantId: bowVariant.id, priceMinor: bowVariant.price.amountMinor } : null

  return (
    <>
      <BuilderWizard parent={parent} bow={bow} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Build your own hamper', path: '/build-your-own-hamper' },
        ])}
      />
    </>
  )
}
