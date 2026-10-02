import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ListingPage, listingMetadata, type ListingSearchParams } from '@/components/listing/ListingPage'
import { HamperProductPage } from '@/components/product/HamperProductPage'
import { greetingCards } from '@/lib/commerce'
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

  // The "Finish the gift" add-on query was here, and came off with the
  // band it fed (see HamperProductPage). Sorting the shop's add-ons by
  // price ascending surfaced the unphotographed, unpriced stock lines
  // first, which is the opposite of a cross-sell.
  const [trust, similar, cards] = await Promise.all([
    getTrustSummary(),
    similarProducts(product),
    greetingCards(),
  ])

  return <HamperProductPage product={product} trust={trust} similar={similar} cards={cards} />
}
