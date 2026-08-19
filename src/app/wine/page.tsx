import type { Metadata } from 'next'
import { HubPage } from '@/components/listing/HubPage'
import { getListingCopy } from '@/lib/cms'

export const revalidate = 1800

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getListingCopy('/wine')
  return {
    title: copy?.metaTitle ?? 'The Wine Vault',
    description: copy?.metaDescription,
    alternates: { canonical: '/wine' },
  }
}

export default function WineHub() {
  return (
    <HubPage
      hub="wine"
      path="/wine"
      h1="The Wine Vault"
      heroImage={{
        src: '/photography/tpc-may-13.jpg',
        alt: 'The wine room in the shop in Dunshaughlin, shelved floor to ceiling on both sides',
      }}
      query={{ kinds: ['wine', 'spirit'], sort: 'featured', first: 24 }}
      alcohol
      featuredPaths={[
        '/wine/exclusive-to-us',
        '/wine/value-edit',
        '/wine/red',
        '/wine/white',
        '/wine/champagne-sparkling',
        '/wine/irish-whiskey',
        '/wine/under-25',
        '/wine/50-plus',
      ]}
    />
  )
}
