import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ListingPage, listingMetadata, type ListingSearchParams } from '@/components/listing/ListingPage'
import { WineProductPage } from '@/components/product/WineProductPage'
import { queryProducts } from '@/lib/commerce'
import { similarProducts } from '@/lib/commerce/similar'
import { resolveHubSlug } from '@/lib/resolve-route'
import { hubStaticParams } from '@/lib/static-params'
import { productMetaDescription } from '@/lib/seo/meta-description'
import { PRODUCT_DELIVERY_LINE } from '@/lib/seo/product-delivery-line'
import { getTrustSummary } from '@/lib/trustpilot'

export const revalidate = 3600

export async function generateStaticParams() {
  return hubStaticParams('wine')
}

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<ListingSearchParams>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolveHubSlug('wine', slug)

  if (resolved.kind === 'collection') {
    return listingMetadata(resolved.collection, await searchParams)
  }

  if (resolved.kind === 'product') {
    const { product } = resolved
    return {
      title: product.title,
      description: productMetaDescription(product, PRODUCT_DELIVERY_LINE),
      alternates: { canonical: `/wine/${product.handle}` },
      openGraph: {
        title: product.title,
        images: product.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt })),
      },
      robots: product.availableForSale ? undefined : { index: false, follow: true },
    }
  }

  return {}
}

export default async function WineSlugPage({ params, searchParams }: Props) {
  const { slug } = await params
  const resolved = await resolveHubSlug('wine', slug)

  if (resolved.kind === 'collection') {
    return <ListingPage collection={resolved.collection} searchParams={await searchParams} />
  }

  if (resolved.kind === 'none') notFound()

  const { product } = resolved

  const [trust, crossSell, similar] = await Promise.all([
    getTrustSummary(),
    // Cross-sell into hampers rather than into more bottles: the point of
    // this site is that a bottle becomes a gift when it arrives in a box.
    // The current range types every hamper as plain "Hamper", so the
    // nearest thing to a wine hamper is one that carries a bottle.
    queryProducts({
      kinds: ['hamper'],
      tags: ['contains:alcohol'],
      first: 4,
    }),
    similarProducts(product),
  ])

  return (
    <WineProductPage
      product={product}
      trust={trust}
      crossSell={crossSell.items}
      similar={similar}
    />
  )
}
