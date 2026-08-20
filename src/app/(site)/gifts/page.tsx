import type { Metadata } from 'next'
import { HubPage } from '@/components/listing/HubPage'
import { getListingCopy } from '@/lib/cms'

export const revalidate = 1800

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getListingCopy('/gifts')
  return {
    title: copy?.metaTitle ?? 'Add to a hamper',
    description: copy?.metaDescription,
    alternates: { canonical: '/gifts' },
  }
}

/**
 * The add-on band.
 *
 * Deliberately small. These are basket builders at the cart, not standalone
 * categories, which is why this hub carries three sub-collections rather
 * than the twenty the old site had.
 */
export default function GiftsHub() {
  return (
    <HubPage
      hub="gifts"
      path="/gifts"
      h1="Add to a hamper"
      heroImage={{
        src: '/photography/tpc-may-9.jpg',
        alt: 'The gift shop floor in Dunshaughlin, with candles, cards and small gifts on display',
      }}
      query={{ kinds: ['addon'], sort: 'price-asc', first: 24 }}
      alcohol={false}
    />
  )
}
