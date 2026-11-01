import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { AdminCampaignRow } from '@/components/corporate/AdminCampaignRow'
import { formatMinor } from '@/lib/commerce/money'
import {
  ADMIN_COOKIE,
  MIN_ADMIN_KEY_LENGTH,
  adminSessionValid,
  configuredAdminKey,
} from '@/lib/corporate/admin-auth'
import { campaignStore } from '@/lib/corporate/store'
import { campaignStats, campaignValueMinor } from '@/lib/corporate/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Corporate campaigns admin',
  robots: { index: false, follow: false },
}

/**
 * The fulfilment team's view: every campaign, its progress, activation,
 * and the picking CSV with the delivery addresses the corporate dashboard
 * deliberately never shows.
 *
 * Gated by CORPORATE_ADMIN_KEY, typed into the sign-in form below and
 * exchanged for an httpOnly session cookie (see lib/corporate/admin-auth).
 * That is the right weight of lock for a team of two reading their own
 * orders; real staff accounts arrive with the database. Without the env
 * var the page refuses to exist at all rather than running open.
 */
export default async function AdminCorporatePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; wrong?: string }>
}) {
  const { status, wrong } = await searchParams

  if (!configuredAdminKey()) {
    return (
      <main id="main" className="mx-auto max-w-2xl px-4 py-20">
        <h1 className="font-display text-3xl text-navy">Admin is not configured</h1>
        <p className="mt-3 text-ink-muted">
          Set <code className="bg-beige px-1">CORPORATE_ADMIN_KEY</code> in the environment, at
          least {MIN_ADMIN_KEY_LENGTH} characters long, then sign in on this page. Until the key
          exists, this page stays shut.
        </p>
      </main>
    )
  }

  const jar = await cookies()
  if (!adminSessionValid(jar.get(ADMIN_COOKIE)?.value)) {
    return (
      <main id="main" className="mx-auto max-w-2xl px-4 py-20">
        <h1 className="font-display text-3xl text-navy">Sign in</h1>
        <p className="mt-3 text-ink-muted">Enter the admin key to open the fulfilment view.</p>
        <form method="post" action="/admin/corporate/login" className="mt-6 flex flex-wrap gap-2">
          <label htmlFor="admin-key" className="sr-only">
            Admin key
          </label>
          <input
            id="admin-key"
            name="key"
            type="password"
            required
            autoComplete="current-password"
            className="min-w-[260px] flex-1 border border-navy/25 px-3 py-2 text-navy"
          />
          <button type="submit" className="border border-navy bg-navy px-4 py-2 text-cream">
            Sign in
          </button>
        </form>
        {wrong ? (
          <p className="mt-3 text-sm text-red" role="alert">
            That key was not recognised.
          </p>
        ) : null}
      </main>
    )
  }

  const store = await campaignStore()
  const all = (await store.list()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const soon = new Date()
  soon.setDate(soon.getDate() + 7)
  const filtered = all.filter((c) => {
    switch (status) {
      case 'active':
        return c.status === 'ACTIVE'
      case 'pending':
        return c.status === 'AWAITING_PAYMENT' || c.status === 'DRAFT'
      case 'complete':
        return c.status === 'COMPLETE' || c.status === 'CLOSED'
      case 'deadline':
        return c.status === 'ACTIVE' && new Date(c.deadline) <= soon
      case 'unredeemed':
        return campaignStats(c).awaiting > 0 && c.status === 'ACTIVE'
      default:
        return true
    }
  })

  const filters = [
    ['', 'All'],
    ['active', 'Active'],
    ['pending', 'Pending'],
    ['complete', 'Complete'],
    ['deadline', 'Deadline approaching'],
    ['unredeemed', 'Unredeemed gifts'],
  ] as const

  return (
    <main id="main" className="mx-auto max-w-[1200px] px-4 py-12 lg:px-8">
      <h1 className="font-display text-[length:var(--text-display)] text-navy">
        Corporate campaigns
      </h1>

      <nav className="mt-6 flex flex-wrap gap-2 text-sm" aria-label="Filters">
        {filters.map(([value, label]) => (
          <a
            key={label}
            href={`/admin/corporate${value ? `?status=${value}` : ''}`}
            aria-current={(status ?? '') === value ? 'page' : undefined}
            className={`border px-3 py-1.5 ${
              (status ?? '') === value ? 'border-navy bg-navy text-cream' : 'border-navy/25 text-navy hover:border-navy'
            }`}
          >
            {label}
          </a>
        ))}
      </nav>

      {filtered.length ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy/20 text-xs uppercase tracking-[0.12em] text-ink-muted">
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Recipients</th>
                <th className="py-2 pr-4">Redeemed</th>
                <th className="py-2 pr-4">Deadline</th>
                <th className="py-2 pr-4">Value</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {filtered.map((campaign) => {
                const stats = campaignStats(campaign)
                return (
                  <AdminCampaignRow
                    key={campaign.id}
                    id={campaign.id}
                    slug={campaign.slug}
                    company={campaign.company.companyName}
                    contact={`${campaign.company.firstName} ${campaign.company.lastName}, ${campaign.company.email}`}
                    recipients={campaign.recipientLimit}
                    redeemed={stats.selected}
                    deadline={campaign.deadline}
                    value={formatMinor(campaignValueMinor(campaign.recipientLimit, campaign.allowanceMinor))}
                    status={campaign.status}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-8 border border-rule bg-beige px-4 py-8 text-ink-muted">
          No campaigns match this filter yet.
        </p>
      )}

      <p className="mt-8 text-xs text-ink-muted">
        The picking CSV carries recipient delivery addresses and exists for fulfilment only.
        Where Shopify is connected each redemption also creates a draft order automatically.
      </p>
    </main>
  )
}
