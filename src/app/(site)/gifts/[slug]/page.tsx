import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ListingPage, listingMetadata, type ListingSearchParams } from '@/components/listing/ListingPage'
import { AddonProductPage } from '@/components/product/AddonProductPage'
import { queryProducts } from '@/lib/commerce'
import { similarProducts } from '@/lib/commerce/similar'
import { resolveHubSlug } from '@/lib/resolve-route'
import { hubStaticParams } from '@/lib/static-params'
import { productMetaDescription } from '@/lib/seo/meta-description'
import { PRODUCT_DELIVERY_LINE } from '@/lib/seo/product-delivery-line'
import { getTrustSummary } from '@/lib/trustpilot'

export const revalidate = 3600

export async function generateStaticParams() {
  return hubStaticParams('gifts')
}

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<ListingSearchParams>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolveHubSlug('gifts', slug)

  if (resolved.kind === 'collection') {
    return listingMetadata(resolved.collection, await searchParams)
  }

  if (resolved.kind === 'product') {
    const { product } = resolved
    return {
      title: product.title,
      description: productMetaDescription(product, PRODUCT_DELIVERY_LINE),
      alternates: { canonical: `/gifts/${product.handle}` },
      // The hamper and wine templates already did this; this one did not,
      // so an add-on shared anywhere fell back to the site-wide image and
      // showed a hamper instead of the product.
      openGraph: {
        title: product.title,
        images: product.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt })),
      },
      robots: product.availableForSale ? undefined : { index: false, follow: true },
    }
  }

  return {}
}

export default async function GiftSlugPage({ params, searchParams }: Props) {
  const { slug } = await params
  const resolved = await resolveHubSlug('gifts', slug)

  if (resolved.kind === 'collection') {
    return <ListingPage collection={resolved.collection} searchParams={await searchParams} />
  }

  if (resolved.kind === 'none') notFound()

  const [trust, hampers, similar] = await Promise.all([
    getTrustSummary(),
    // An add-on's job is to be added to a hamper, so the page pushes back
    // towards hampers rather than towards more add-ons.
    queryProducts({ kinds: ['hamper'], first: 4, sort: 'price-asc' }),
    similarProducts(resolved.product),
  ])

  return (
    <AddonProductPage
      product={resolved.product}
      trust={trust}
      hampers={hampers.items}
      similar={similar}
    />
  )
}
