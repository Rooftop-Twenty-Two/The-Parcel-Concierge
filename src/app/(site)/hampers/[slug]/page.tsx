import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ListingPage, listingMetadata, type ListingSearchParams } from '@/components/listing/ListingPage'
import { HamperProductPage } from '@/components/product/HamperProductPage'
import { queryProducts } from '@/lib/commerce'
import { similarProducts } from '@/lib/commerce/similar'
import { resolveHubSlug } from '@/lib/resolve-route'
import { hubStaticParams } from '@/lib/static-params'
import { productMetaDescription } from '@/lib/seo/meta-description'
import { PRODUCT_DELIVERY_LINE } from '@/lib/seo/product-delivery-line'
import { getTrustSummary } from '@/lib/trustpilot'

export const revalidate = 3600

export async function generateStaticParams() {
  return hubStaticParams('hampers')
}

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<ListingSearchParams>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolveHubSlug('hampers', slug)

  if (resolved.kind === 'collection') {
    return listingMetadata(resolved.collection, await searchParams)
  }

  if (resolved.kind === 'product') {
    const { product } = resolved
    return {
      title: product.title,
      description: productMetaDescription(product, PRODUCT_DELIVERY_LINE),
      alternates: { canonical: `/hampers/${product.handle}` },
      openGraph: {
        title: product.title,
        images: product.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt })),
      },
      // Success criterion 7: an out-of-stock product is never an indexable,
      // buyable-looking page.
      robots: product.availableForSale ? undefined : { index: false, follow: true },
    }
  }

  return {}
}

export default async function HamperSlugPage({ params, searchParams }: Props) {
  const { slug } = await params
  const resolved = await resolveHubSlug('hampers', slug)

  if (resolved.kind === 'collection') {
    return <ListingPage collection={resolved.collection} searchParams={await searchParams} />
  }

  if (resolved.kind === 'none') notFound()

  const { product } = resolved

  const [trust, crossSell, similar] = await Promise.all([
    getTrustSummary(),
    // "Finish the gift": the add-on band exists to be added to a hamper.
    queryProducts({ kinds: ['addon'], first: 4, sort: 'price-asc' }),
    similarProducts(product),
  ])

  return (
    <HamperProductPage
      product={product}
      trust={trust}
      crossSell={crossSell.items}
      similar={similar}
    />
  )
}
