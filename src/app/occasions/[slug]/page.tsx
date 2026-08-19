import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ListingPage, listingMetadata, type ListingSearchParams } from '@/components/listing/ListingPage'
import { getCollection } from '@/lib/commerce/collections'

export const revalidate = 1800

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<ListingSearchParams>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const collection = getCollection('occasions', slug)
  if (!collection) return {}
  return listingMetadata(collection, await searchParams)
}

export default async function OccasionPage({ params, searchParams }: Props) {
  const { slug } = await params
  const collection = getCollection('occasions', slug)
  if (!collection) notFound()
  return <ListingPage collection={collection} searchParams={await searchParams} />
}
