'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { NEWSLETTER } from '@/lib/site-config'

/**
 * Newsletter signup with the first-order incentive.
 *
 * Rivals offer this and the site currently offers nothing, which is the
 * cheapest list-building fix available. The incentive text comes from
 * config so changing the offer is one edit, not a search across components.
 */
export function NewsletterSignup({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const dark = variant === 'dark'

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const email = new FormData(form).get('email')
    if (typeof email !== 'string' || !email.includes('@')) {
      setState('error')
      setMessage('That email address does not look right. Check it and try again.')
      return
    }

    setState('sending')
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) throw new Error(String(response.status))
      setState('done')
      setMessage(`You are on the list. Your ${NEWSLETTER.incentive.toLowerCase()} code is on its way.`)
      form.reset()
    } catch {
      setState('error')
      setMessage('That did not go through. Try again, or email us and we will add you.')
    }
  }

  return (
    <div className={dark ? 'text-cream' : 'text-navy'}>
      <h2 className="font-display text-3xl">Get {NEWSLETTER.incentive.toLowerCase()}</h2>
      <p className={`mt-2 max-w-xl text-sm ${dark ? 'text-cream/80' : 'text-ink-muted'}`}>
        One email a month at most, with what is new in the shop and when the Christmas cut-offs are.
        Unsubscribe in one click.
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row">
        <label htmlFor={`newsletter-email-${variant}`} className="sr-only">
          Email address
        </label>
        <input
          id={`newsletter-email-${variant}`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={`w-full flex-1 border px-4 py-3 text-base ${
            dark
              ? 'border-cream/30 bg-transparent text-cream placeholder:text-cream/50'
              : 'border-rule bg-white text-navy placeholder:text-ink-muted/70'
          }`}
        />
        <Button type="submit" disabled={state === 'sending'} variant={dark ? 'primary' : 'secondary'}>
          {state === 'sending' ? 'Signing you up' : 'Sign up'}
        </Button>
      </form>

      {message ? (
        <p
          role="status"
          className={`mt-3 text-sm ${state === 'error' ? 'text-red' : dark ? 'text-gold' : 'text-green'}`}
        >
          {message}
        </p>
      ) : null}

      <p className={`mt-3 text-xs ${dark ? 'text-cream/60' : 'text-ink-muted'}`}>
        By signing up you agree to us storing your email address so we can send you the newsletter.
      </p>
    </div>
  )
}
