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
      query={{ collection: 'fine-wines-1', sort: 'featured', first: 24 }}
      alcohol
      promo={{
        eyebrow: 'New',
        title: 'The Wine Vault Club',
        body: 'A case of wine, chosen by us from this list, as often as you want it. You set the size, the budget and the style.',
        href: '/wine-club',
        cta: 'See how it works',
      }}
      featuredPaths={[
        '/wine/fine-wines',
        '/wine/red',
        '/wine/white',
        '/wine/rose',
        '/wine/champagne-sparkling',
        '/wine/organic-biodynamic',
        '/wine/port-dessert',
        '/wine/gift-sets',
        '/wine/under-25',
        '/wine/25-50',
        '/wine/50-plus',
      ]}
    />
  )
}
