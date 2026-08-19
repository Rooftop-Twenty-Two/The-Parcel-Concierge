import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HamperBuilder } from '@/components/builder/HamperBuilder'
import { JsonLd } from '@/components/seo/JsonLd'
import { getProduct, queryProducts } from '@/lib/commerce'
import type { ProductCard } from '@/lib/commerce/types'
import { BUILDER_CATEGORIES, BUILDER_PARENT_HANDLE } from '@/lib/hamper-builder'
import { breadcrumbJsonLd } from '@/lib/seo/structured-data'

export const revalidate = 900

export const metadata: Metadata = {
  title: 'Build your own hamper',
  description:
    'Pick the box, pick what goes in it, write the card. We pack it by hand in Co. Meath and send it out the same day we send everything else.',
  alternates: { canonical: '/build-your-own-hamper' },
}

/**
 * The custom hamper builder, on our own domain.
 *
 * It used to live on parcel-concierge.vercel.app, which leaked SEO
 * authority and broke trust at the highest-intent moment on the site. This
 * route is the fix, and the whole flow from first click to Shopify checkout
 * stays on theparcelconcierge.com.
 */
export default async function BuildYourOwnHamperPage() {
  const parent = await getProduct(BUILDER_PARENT_HANDLE)
  if (!parent) {
    // Without the parent product there is no box to sell, and half a
    // builder is worse than none. This is a data problem, not a routing
    // one: the ingest tool guarantees the product exists.
    notFound()
  }

  const categories = await Promise.all(
    BUILDER_CATEGORIES.map(async (category) => {
      const { items } = await queryProducts({
        productTypes: [...category.productTypes],
        first: 24,
        sort: 'price-asc',
      })
      return { id: category.id, label: category.label, alcohol: category.alcohol, items }
    }),
  )

  const populated = categories.filter(
    (category): category is typeof category & { items: ProductCard[] } => category.items.length > 0,
  )

  return (
    <>
      <HamperBuilder parent={parent} categories={populated} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Build your own hamper', path: '/build-your-own-hamper' },
        ])}
      />
    </>
  )
}
