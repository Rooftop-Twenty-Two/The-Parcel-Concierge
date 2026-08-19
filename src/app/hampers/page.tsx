import type { Metadata } from 'next'
import { HubPage } from '@/components/listing/HubPage'
import { getListingCopy } from '@/lib/cms'

export const revalidate = 1800

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getListingCopy('/hampers')
  return {
    title: copy?.metaTitle ?? 'Hampers',
    description: copy?.metaDescription,
    alternates: { canonical: '/hampers' },
  }
}

export default function HampersHub() {
  return (
    <HubPage
      hub="hampers"
      path="/hampers"
      h1="Hampers, packed by hand"
      heroImage={{
        src: '/photography/tpc-09-full.jpg',
        alt: 'An Irish food hamper packed with crisps, tea, preserves and coffee in a green gift box',
      }}
      query={{ kinds: ['hamper'], sort: 'featured', first: 24 }}
      alcohol
      featuredPaths={[
        '/hampers/under-75',
        '/hampers/75-125',
        '/hampers/125-200',
        '/hampers/luxury-200-plus',
        '/hampers/food',
        '/hampers/wine',
        '/hampers/whiskey',
        '/hampers/pamper',
      ]}
    />
  )
}
