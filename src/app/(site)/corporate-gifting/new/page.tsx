import type { Metadata } from 'next'
import { CampaignWizard, type WizardGift } from '@/components/corporate/CampaignWizard'
import { queryProducts } from '@/lib/commerce'

export const revalidate = 900

export const metadata: Metadata = {
  title: 'Create your corporate gift campaign',
  description:
    'Choose your budget and your gifts, add your branding, and get a private gifting link for your company.',
  alternates: { canonical: '/corporate-gifting/new' },
  robots: { index: false, follow: true },
}

/**
 * The campaign builder.
 *
 * The gift list is every real hamper plus the build-your-own option; the
 * wizard filters it live against the allowance the buyer picks, so the
 * choices on screen are always affordable ones.
 */
export default async function NewCampaignPage() {
  const { items } = await queryProducts({ kinds: ['hamper'], first: 100, sort: 'price-asc' })

  const gifts: WizardGift[] = items.map((p) => ({
    handle: p.handle,
    title: p.title,
    priceMinor: p.defaultVariantPriceMinor ?? p.priceRange.min.amountMinor,
    image: p.image ? { url: p.image.url, alt: p.image.alt } : null,
    containsAlcohol: p.tags.includes('contains:alcohol'),
  }))

  return <CampaignWizard gifts={gifts} />
}
