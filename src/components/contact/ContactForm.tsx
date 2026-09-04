'use client'

import { useActionState } from 'react'
import { submitContactMessage, type ContactResult } from '@/app/actions/contact'
import { Button } from '@/components/ui/Button'
import { Field, FieldError } from '@/components/ui/Field'

/**
 * The contact form.
 *
 * Progressive enhancement: a real form posting to a server action, so it
 * works before hydration and with the keyboard. Errors render next to their
 * field and are announced. A hidden honeypot catches the simplest bots.
 */
export function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactResult | null, FormData>(
    submitContactMessage,
    null,
  )

  if (state?.ok) {
    return (
      <div className="border border-green/30 bg-green/5 px-6 py-10">
        <h2 className="font-display text-3xl text-navy">That is with us</h2>
        <p className="mt-3 text-ink-muted">
          We read every one of these ourselves and you will hear back the same working day. If it is
          urgent, ring us rather than waiting on the email.
        </p>
      </div>
    )
  }

  const errors = state?.ok === false ? state.errors : {}

  return (
    <form action={formAction} className="space-y-6">
      {state?.ok === false && state.message ? (
        <p role="alert" className="border border-red bg-red/5 px-4 py-3 text-sm text-red">
          {state.message}
        </p>
      ) : null}

      {/* Honeypot: hidden from people, tempting to bots. A filled one is dropped. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your name" name="name" error={errors.name} required autoComplete="name" />
        <Field
          label="Email"
          name="email"
          type="email"
          error={errors.email}
          required
          autoComplete="email"
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          hint="Optional, but it speeds things up."
        />
        <Field label="Subject" name="subject" hint="Optional." />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-navy">
          Message<span className="text-red"> *</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? 'message-error' : undefined}
          className={`mt-2 w-full border bg-white px-3 py-2 text-base ${
            errors.message ? 'border-red' : 'border-rule'
          }`}
        />
        {errors.message ? <FieldError id="message-error" message={errors.message} /> : null}
      </div>

      <Button type="submit" size="large" disabled={pending}>
        {pending ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  )
}
