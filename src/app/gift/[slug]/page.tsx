import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RecipientFlow, type RecipientCampaign } from '@/components/corporate/RecipientFlow'
import { campaignStore } from '@/lib/corporate/store'
import { brandColour, campaignOpen } from '@/lib/corporate/types'

/**
 * A company's private gifting page.
 *
 * This is a gift, not a shop: no site navigation, no prices, no cart. The
 * page renders on demand (campaigns change by the minute) and never enters
 * a search index.
 *
 * What crosses to the client is a deliberate subset: branding, the gift
 * list and the rules. Never the dashboard token, never other recipients,
 * never a redemption.
 */

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const store = await campaignStore()
  const campaign = await store.getBySlug(slug)
  return {
    title: campaign
      ? campaign.branding.title ?? `A gift from ${campaign.company.companyName}`
      : 'Gift link',
    robots: { index: false, follow: false },
  }
}

export default async function GiftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const store = await campaignStore()
  const campaign = await store.getBySlug(slug)
  if (!campaign) notFound()

  // AWAITING_PAYMENT reads as "not open yet" rather than 404: the buyer
  // may share the link a few hours early, and a dead link burns trust.
  const open = campaignOpen(campaign)
  const pendingActivation = campaign.status === 'AWAITING_PAYMENT'

  const safe: RecipientCampaign = {
    slug: campaign.slug,
    companyName: campaign.company.companyName,
    title: campaign.branding.title ?? `A gift from ${campaign.company.companyName}`,
    message: campaign.branding.message ?? null,
    colour: brandColour(campaign.branding.colourId),
    logoDataUri: campaign.branding.logoDataUri ?? null,
    deadline: campaign.deadline,
    giftMessagesAllowed: campaign.giftMessagesAllowed,
    gifts: campaign.gifts.map((g) => ({
      handle: g.handle,
      title: g.title,
      image: g.image,
      containsAlcohol: g.containsAlcohol,
    })),
  }

  return <RecipientFlow campaign={safe} open={open} pendingActivation={pendingActivation} />
}
