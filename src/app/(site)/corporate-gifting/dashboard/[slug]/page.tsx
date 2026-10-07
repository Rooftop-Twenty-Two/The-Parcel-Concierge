import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DashboardTools } from '@/components/corporate/DashboardTools'
import { formatMinor } from '@/lib/commerce/money'
import { campaignStore } from '@/lib/corporate/store'
import { campaignStats, campaignValueMinor, volumeTierFor } from '@/lib/corporate/types'
import { secretsMatch } from '@/lib/secure-compare'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Campaign dashboard',
  robots: { index: false, follow: false },
}

/**
 * The corporate buyer's dashboard, reached by the tokenised link from
 * campaign creation. The token IS the login: magic-link authentication
 * without an account system, which matches how these links are actually
 * shared inside a company.
 *
 * The table deliberately shows WHO has chosen and WHAT, never WHERE.
 * Recipients gave their address to us, not to their employer; keeping it
 * that way is the product's privacy promise and it is enforced here by
 * simply never rendering the data.
 */
export default async function CampaignDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { slug } = await params
  const { token } = await searchParams

  const store = await campaignStore()
  const campaign = await store.getBySlug(slug)
  // Wrong token behaves exactly like no campaign: the URL reveals nothing.
  if (!campaign || !secretsMatch(token, campaign.dashboardToken)) notFound()

  const stats = campaignStats(campaign)
  const giftByRecipient = new Map(
    campaign.redemptions.map((r) => [r.recipientId, r.giftTitle]),
  )
  const tier = volumeTierFor(campaign.recipientLimit)
  const progress = Math.round((stats.selected / Math.max(1, stats.purchased)) * 100)

  const statusLabel: Record<string, string> = {
    NOT_STARTED: 'Awaiting selection',
    STARTED: 'Started',
    SELECTED: 'Selected',
    ORDER_CREATED: 'Selected',
    FULFILLED: 'Dispatched',
    DELIVERED: 'Delivered',
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 lg:px-8">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">Corporate gifting dashboard</p>
      <h1 className="mt-2 font-display text-[length:var(--text-display)] text-navy">
        {campaign.branding.title ?? `${campaign.company.companyName} gifts`}
      </h1>
      <p className="mt-2 text-ink-muted">
        {campaign.status === 'AWAITING_PAYMENT'
          ? 'Awaiting confirmation: we are in touch about the invoice, and the gifting link opens the moment it is settled.'
          : campaign.status === 'ACTIVE'
            ? `Live until ${campaign.deadline}.`
            : `Status: ${campaign.status.toLowerCase()}.`}
      </p>

      <section aria-label="Campaign summary" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          [stats.purchased, 'Gifts purchased'],
          [stats.selected, 'Gifts selected'],
          [stats.awaiting, 'Awaiting selection'],
          [stats.dispatched, 'Dispatched'],
          [stats.delivered, 'Delivered'],
        ].map(([n, label]) => (
          <div key={label as string} className="border border-navy/15 bg-beige p-4 text-center">
            <p className="font-display text-4xl text-navy">{n}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-ink-muted">{label}</p>
          </div>
        ))}
      </section>

      <div className="mt-6">
        <div className="h-3 w-full bg-beige">
          <div className="h-3 bg-green" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          {stats.selected} / {stats.purchased} recipients have selected their gift
        </p>
      </div>

      <DashboardTools
        slug={campaign.slug}
        token={campaign.dashboardToken}
        companyName={campaign.company.companyName}
        deadline={campaign.deadline}
        awaiting={stats.awaiting}
      />

      <section className="mt-12">
        <h2 className="font-serif text-2xl text-navy">Recipients</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Delivery addresses go directly to us and are never shown here, so nobody in{' '}
          {campaign.company.companyName} handles a colleague&apos;s home address.
        </p>
        {campaign.recipients.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-navy/20 text-xs uppercase tracking-[0.12em] text-ink-muted">
                  <th className="py-2 pr-4">Recipient</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Gift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {campaign.recipients.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 text-navy">
                      {r.firstName} {r.lastName}
                    </td>
                    <td className="py-2 pr-4 text-ink-muted">{statusLabel[r.status] ?? r.status}</td>
                    <td className="py-2 text-ink-muted">{giftByRecipient.get(r.id) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 border border-rule bg-beige px-4 py-6 text-sm text-ink-muted">
            Nobody has opened the link yet. Recipients appear here the moment they start.
          </p>
        )}
      </section>

      <section className="mt-12 border-t border-rule pt-6 text-sm text-ink-muted">
        <h2 className="font-serif text-xl text-navy">The numbers</h2>
        <p className="mt-2">
          {campaign.recipientLimit} recipients × {formatMinor(campaign.allowanceMinor)} allowance ={' '}
          {formatMinor(campaignValueMinor(campaign.recipientLimit, campaign.allowanceMinor))}{' '}
          excluding delivery and VAT. {tier.discountPercent > 0 ? `${tier.label} applies to your invoice.` : ''}
        </p>
      </section>
    </div>
  )
}
