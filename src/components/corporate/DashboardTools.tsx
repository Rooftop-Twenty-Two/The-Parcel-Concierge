'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addAllocationAction } from '@/app/actions/corporate-campaign'
import { Button } from '@/components/ui/Button'

/**
 * The dashboard's working tools: the link itself, the reminder for the
 * people who have not chosen, and adding more recipients.
 *
 * Reminders are copy-to-send rather than sent by us: the reminder lands
 * better from the HR manager's own address, and it means we hold no
 * recipient email list beyond those who have already chosen to give us
 * one. Automated reminder emails arrive with the email infrastructure.
 */
export function DashboardTools({
  slug,
  token,
  companyName,
  deadline,
  awaiting,
}: {
  slug: string
  token: string
  companyName: string
  deadline: string
  awaiting: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [addCount, setAddCount] = useState(25)
  const [message, setMessage] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const giftUrl = `${origin}/gift/${slug}`

  const reminder = `A quick reminder from ${companyName}: your gift is waiting.

Choose your hamper and tell us where to send it before ${deadline}:

${giftUrl}

It takes about a minute.`

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  function addAllocation() {
    startTransition(async () => {
      const result = await addAllocationAction(slug, token, addCount)
      if (result.ok) {
        setMessage(
          `Done: your allocation is now ${result.newLimit}. The addition goes on your next invoice, and we will confirm it by email.`,
        )
        setAdding(false)
        router.refresh()
      } else {
        setMessage(result.message)
      }
    })
  }

  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-3">
      <div className="border border-navy/15 bg-cream p-5">
        <h2 className="font-serif text-lg text-navy">Your gifting link</h2>
        <code className="mt-2 block truncate bg-beige px-3 py-2 text-xs text-navy">{giftUrl}</code>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => copy('link', giftUrl)}>
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </Button>
      </div>

      <div className="border border-navy/15 bg-cream p-5">
        <h2 className="font-serif text-lg text-navy">Remind people who haven&apos;t selected</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {awaiting} {awaiting === 1 ? 'person has' : 'people have'} not yet selected their gift.
          Copy a ready-made nudge and send it from your own address; it lands better coming from
          you.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          disabled={awaiting === 0}
          onClick={() => copy('reminder', reminder)}
        >
          {copied === 'reminder' ? 'Copied' : 'Copy reminder message'}
        </Button>
      </div>

      <div className="border border-navy/15 bg-cream p-5">
        <h2 className="font-serif text-lg text-navy">Add more recipients</h2>
        {adding ? (
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {[10, 25, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAddCount(n)}
                  aria-pressed={addCount === n}
                  className={`border px-3 py-1 text-sm ${addCount === n ? 'border-navy bg-navy text-cream' : 'border-navy/25 text-navy'}`}
                >
                  +{n}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={5000}
                value={addCount}
                onChange={(e) => setAddCount(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 border border-navy/25 bg-cream px-2 py-1 text-sm text-navy"
                aria-label="Custom number of recipients to add"
              />
            </div>
            <Button type="button" className="mt-3" disabled={pending} onClick={addAllocation}>
              {pending ? 'One moment' : `Add ${addCount}`}
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-muted">
              Increase your allocation at the same allowance. The addition is invoiced with the
              campaign.
            </p>
            <Button type="button" variant="secondary" className="mt-3" onClick={() => setAdding(true)}>
              Add recipients
            </Button>
          </>
        )}
      </div>

      {message ? (
        <p role="status" className="text-sm text-navy lg:col-span-3">
          {message}
        </p>
      ) : null}
    </section>
  )
}
