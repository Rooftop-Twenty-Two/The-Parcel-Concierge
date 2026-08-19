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
        src: '/placeholder/wine-1.png',
        alt: 'A bottle of wine standing against a plain background',
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
