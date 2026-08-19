'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PostmarkRoundel } from '@/components/ui/Stamp'

/**
 * The age gate dialog.
 *
 * A real modal dialog: focus is trapped, Escape does not dismiss it (there
 * is no "no thanks" path past an age check), and the page behind it is inert
 * to assistive technology. Declining sends the visitor to the non-alcohol
 * part of the site rather than to a dead end.
 */
export function AgeGateDialog({
  minimumAge,
  context,
}: {
  minimumAge: number
  context: 'listing' | 'product' | 'cart'
}) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const [pending, setPending] = useState(false)
  const [declined, setDeclined] = useState(false)

  useEffect(() => {
    confirmRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function trap(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  async function confirm() {
    setPending(true)
    await fetch('/api/age-check', { method: 'POST' })
    router.refresh()
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-navy/85 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      aria-describedby="age-gate-body"
    >
      <div ref={dialogRef} className="w-full max-w-lg bg-cream px-6 py-10 text-center sm:px-12">
        <PostmarkRoundel className="mx-auto h-20 w-20 text-green" />

        <h2 id="age-gate-title" className="mt-6 font-display text-4xl text-navy">
          Are you over {minimumAge}?
        </h2>

        <p id="age-gate-body" className="mt-3 text-ink-muted">
          {declined
            ? `We can only sell alcohol to people over ${minimumAge}. Everything else on the site is still open to you.`
            : `This ${context === 'cart' ? 'order' : 'page'} contains alcohol. We can only sell it to somebody over ${minimumAge}, and we may ask for proof on delivery.`}
        </p>

        {declined ? (
          <div className="mt-8 flex flex-col gap-3">
            <Button onClick={() => router.push('/hampers/food')} variant="secondary">
              Show me hampers without alcohol
            </Button>
            <Button onClick={() => setDeclined(false)} variant="ghost">
              Go back
            </Button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            <Button ref={confirmRef} onClick={confirm} disabled={pending} size="large">
              {pending ? 'One moment' : `Yes, I am over ${minimumAge}`}
            </Button>
            <Button onClick={() => setDeclined(true)} variant="ghost">
              No, I am not
            </Button>
          </div>
        )}

        <p className="mt-6 text-xs text-ink-muted">
          It is an offence to buy or attempt to buy alcohol for anyone under {minimumAge}.
        </p>
      </div>
    </div>
  )
}
