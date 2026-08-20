'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setCampaignStatusAction } from '@/app/actions/corporate-campaign'
import type { CampaignStatus } from '@/lib/corporate/types'

/** One campaign in the admin table, with its status controls inline. */
export function AdminCampaignRow({
  adminKey,
  id,
  slug,
  company,
  contact,
  recipients,
  redeemed,
  deadline,
  value,
  status,
}: {
  adminKey: string
  id: string
  slug: string
  company: string
  contact: string
  recipients: number
  redeemed: number
  deadline: string
  value: string
  status: CampaignStatus
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function setStatus(next: CampaignStatus) {
    startTransition(async () => {
      const result = await setCampaignStatusAction(adminKey, id, next)
      if (result.ok) router.refresh()
      else setError(result.message)
    })
  }

  const nextActions: Partial<Record<CampaignStatus, { to: CampaignStatus; label: string }>> = {
    AWAITING_PAYMENT: { to: 'ACTIVE', label: 'Activate' },
    ACTIVE: { to: 'CLOSED', label: 'Close' },
    CLOSED: { to: 'FULFILLING', label: 'Fulfilling' },
    FULFILLING: { to: 'COMPLETE', label: 'Complete' },
  }
  const action = nextActions[status]

  return (
    <tr>
      <td className="py-2 pr-4">
        <span className="block text-navy">{company}</span>
        <span className="text-xs text-ink-muted">{contact}</span>
      </td>
      <td className="py-2 pr-4 text-navy">{recipients}</td>
      <td className="py-2 pr-4 text-navy">{redeemed}</td>
      <td className="py-2 pr-4 text-ink-muted">{deadline}</td>
      <td className="py-2 pr-4 text-navy">{value}</td>
      <td className="py-2 pr-4">
        <span className="border border-navy/25 px-2 py-0.5 text-xs uppercase tracking-[0.1em] text-navy">
          {status.replace('_', ' ').toLowerCase()}
        </span>
      </td>
      <td className="py-2">
        <span className="flex flex-wrap items-center gap-2">
          {action ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setStatus(action.to)}
              className="border border-navy px-2 py-1 text-xs text-navy hover:bg-navy hover:text-cream disabled:opacity-50"
            >
              {pending ? '…' : action.label}
            </button>
          ) : null}
          <a
            href={`/admin/corporate/export?key=${encodeURIComponent(adminKey)}&id=${id}`}
            className="text-xs text-navy underline underline-offset-2"
          >
            Picking CSV
          </a>
          <a href={`/gift/${slug}`} className="text-xs text-navy underline underline-offset-2">
            Gift page
          </a>
          {error ? <span className="text-xs text-red">{error}</span> : null}
        </span>
      </td>
    </tr>
  )
}
