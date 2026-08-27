'use client'

import { useEffect, useState } from 'react'
import { AgeGateDialog } from './AgeGateDialog'
import { AGE_GATE } from '@/lib/site-config'

/**
 * Age verification for alcohol routes.
 *
 * Rendered on wine and any listing or product that can contain
 * alcohol, and again at the checkout handoff.
 *
 * The check runs after hydration rather than on the server. The cookie is
 * httpOnly, so reading it server side would mean calling cookies() in the
 * page, and that opts the whole route out of static rendering. Hampers and
 * wine listings are the pages the performance budget is tightest on, so the
 * check happens here instead: the page ships static, and the gate appears
 * as soon as the client knows the answer.
 *
 * The gate is a courtesy check, not the enforcement point. Enforcement is
 * the delivery: the courier hands alcohol to somebody over 18 or brings it
 * back. Nothing here is load bearing for compliance on its own, and the
 * whole approach NEEDS LEGAL SIGN-OFF before launch (docs/build-status.md).
 */
export function AgeGate({ context }: { context: 'listing' | 'product' | 'cart' }) {
  const [state, setState] = useState<'checking' | 'confirmed' | 'blocked'>('checking')

  useEffect(() => {
    let cancelled = false

    fetch('/api/age-check')
      .then((response) => (response.ok ? response.json() : { confirmed: false }))
      .then((body: { confirmed?: boolean }) => {
        if (cancelled) return
        setState(body.confirmed ? 'confirmed' : 'blocked')
      })
      .catch(() => {
        // If the check cannot run we show the gate. Failing open on an age
        // check is the wrong direction to fail.
        if (!cancelled) setState('blocked')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (state !== 'blocked') return null

  return (
    <AgeGateDialog
      minimumAge={AGE_GATE.minimumAge}
      context={context}
      // The dialog reports success back up rather than refreshing the
      // route: a refresh re-renders the server tree but leaves this
      // component's state as it was, which kept the dialog on screen
      // saying "One moment" forever after the cookie was already set.
      onConfirmed={() => setState('confirmed')}
    />
  )
}
