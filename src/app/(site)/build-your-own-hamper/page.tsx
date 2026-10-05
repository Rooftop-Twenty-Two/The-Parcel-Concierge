import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BuilderWizard } from '@/components/builder/BuilderWizard'
import { JsonLd } from '@/components/seo/JsonLd'
import { getProduct } from '@/lib/commerce'
import { BUILDER_BOW_HANDLE } from '@/lib/commerce/collections'
import { visibleBuilderTabs } from '@/lib/builder-picker'
import { BOX_OPTIONS, BUILDER_PARENT_HANDLE, type ResolvedBox } from '@/lib/hamper-builder'
import { breadcrumbJsonLd } from '@/lib/seo/structured-data'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Build your own hamper',
  description:
    'Pick a box or wicker basket, fill it from everything in the shop, write the card. Packed by hand in Co. Meath and sent out the same day.',
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
 * fetches the catalogue a tab at a time from /api/builder-items, so the
 * page itself ships only the box options and the tab list. The tabs are
 * configured in src/lib/build-a-hamper-tabs.ts; an empty one is not offered.
 */
export default async function BuildYourOwnHamperPage() {
  const basketHandles = [
    ...new Set(BOX_OPTIONS.filter((b) => b.kind === 'basket').map((b) => b.productHandle)),
  ]
  // Started first so it runs alongside the product reads.
  const tabsRead = visibleBuilderTabs()
  const [parent, bowProduct, ...basketProducts] = await Promise.all([
    getProduct(BUILDER_PARENT_HANDLE),
    getProduct(BUILDER_BOW_HANDLE),
    ...basketHandles.map((handle) => getProduct(handle)),
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

  // Each container resolved to its live variant and price. A box is a
  // variant of the parent product; a basket is a product of its own. A
  // container whose product or variant is missing, or a basket that is sold
  // out, is simply not offered. (The boxes are not stock-tracked the same
  // way, and the add-to-cart action verifies stock for both anyway.)
  const products = new Map(
    [parent, ...basketProducts].filter((p) => p !== null).map((p) => [p.handle, p]),
  )
  const boxes: ResolvedBox[] = BOX_OPTIONS.flatMap((option) => {
    const product = products.get(option.productHandle)
    const variant = option.variantTitle
      ? product?.variants.find((v) => v.title === option.variantTitle)
      : product?.variants[0]
    if (!variant || (option.kind === 'basket' && variant.availableForSale === false)) return []
    return [{ ...option, variantId: variant.id, priceMinor: variant.price.amountMinor }]
  })
  if (!boxes.length) notFound()
  const tabs = await tabsRead

  return (
    <>
      <BuilderWizard boxes={boxes} bow={bow} tabs={tabs} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Build your own hamper', path: '/build-your-own-hamper' },
        ])}
      />
    </>
  )
}
