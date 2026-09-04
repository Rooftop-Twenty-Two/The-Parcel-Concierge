import type { Metadata } from 'next'
import { HubPage } from '@/components/listing/HubPage'
import { HAMPERS_COLLECTION } from '@/lib/commerce/collections'
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
      query={{ collection: HAMPERS_COLLECTION, sort: 'featured', first: 24 }}
      alcohol
      // Seasonal: the hamper range is the Christmas collection only, so the
      // sub-listing cards are dropped (CHRISTMAS_HAMPERS_ONLY in
      // commerce/collections.ts). One grid of the Christmas hampers, then the
      // builder. Restore price-band / theme cards when the range reopens.
      featuredPaths={[]}
      // The builder is the answer to "none of these is quite right", which
      // is the commonest reason somebody leaves a hamper listing, so it
      // sits between the collection cards and the grid rather than only in
      // the nav.
      promo={{
        eyebrow: 'Made to order',
        title: 'Build your own hamper',
        body: 'Pick the box, pick what goes in it and write the card. The whole shop is in the builder, not just what is on this page, and we pack it by hand the same way.',
        href: '/build-your-own-hamper',
        cta: 'Start building',
      }}
    />
  )
}
