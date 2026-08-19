import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ListingPage, listingMetadata, type ListingSearchParams } from '@/components/listing/ListingPage'
import { WineProductPage } from '@/components/product/WineProductPage'
import { queryProducts } from '@/lib/commerce'
import { resolveHubSlug } from '@/lib/resolve-route'
import { hubStaticParams } from '@/lib/static-params'
import { stripHtml } from '@/lib/seo/structured-data'
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
      description: stripHtml(product.descriptionHtml).slice(0, 155),
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

  const [trust, crossSell] = await Promise.all([
    getTrustSummary(),
    // Cross-sell into hampers rather than into more bottles: the point of
    // this site is that a bottle becomes a gift when it arrives in a box.
    queryProducts({
      kinds: ['hamper'],
      productTypes: product.kind === 'spirit' ? ['Whiskey hamper'] : ['Wine hamper'],
      first: 4,
    }),
  ])

  return <WineProductPage product={product} trust={trust} crossSell={crossSell.items} />
}
