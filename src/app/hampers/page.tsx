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
        src: '/placeholder/hamper-1.png',
        alt: 'A hamper styled on a linen cloth with the lid open',
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
