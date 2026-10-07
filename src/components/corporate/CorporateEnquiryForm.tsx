'use client'

import { useActionState, useEffect } from 'react'
import { submitCorporateEnquiry, type EnquiryResult } from '@/app/actions/corporate'
import { Button } from '@/components/ui/Button'
import { Field, FieldError } from '@/components/ui/Field'
import { trackCorporateEnquiry } from '@/lib/analytics/events'
import { BULK_ORDER_MINIMUM, DELIVERY_MODES } from '@/lib/corporate'

/**
 * The corporate enquiry form.
 *
 * Progressive enhancement: it is a real form posting to a server action, so
 * it works before hydration and it works with the keyboard. Errors are
 * rendered next to their field and announced, not collected into a summary
 * at the top that nobody reads.
 */
export function CorporateEnquiryForm() {
  const [state, formAction, pending] = useActionState<EnquiryResult | null, FormData>(
    submitCorporateEnquiry,
    null,
  )

  useEffect(() => {
    if (state?.ok) trackCorporateEnquiry({ value: 1 })
  }, [state])

  if (state?.ok) {
    return (
      <div className="mt-10 border border-green/30 bg-green/5 px-6 py-10">
        <h2 className="font-display text-3xl text-navy">That is with us</h2>
        <p className="mt-3 text-ink-muted">
          We read every one of these ourselves and you will hear back the same working day. If it is
          urgent, ring us rather than waiting on the email.
        </p>
      </div>
    )
  }

  const errors = state?.ok === false ? state.errors : {}
  const values = (state?.ok === false ? state.values : undefined) ?? {}

  return (
    <form action={formAction} className="mt-10 space-y-6">
      {state?.ok === false && state.message ? (
        <p role="alert" className="border border-red bg-red/5 px-4 py-3 text-sm text-red">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Company" name="company" error={errors.company} required autoComplete="organization" defaultValue={values.company} />
        <Field label="Your name" name="name" error={errors.name} required autoComplete="name" defaultValue={values.name} />
        <Field label="Email" name="email" type="email" error={errors.email} required autoComplete="email" defaultValue={values.email} />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" hint="Optional, but it speeds things up." defaultValue={values.phone} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="How many boxes"
          name="quantity"
          type="number"
          min={1}
          error={errors.quantity}
          required
          defaultValue={values.quantity}
          hint={`An estimate is fine. Volume pricing starts at ${BULK_ORDER_MINIMUM}.`}
        />
        <Field
          label="Budget per box"
          name="budgetPerUnit"
          type="number"
          min={1}
          step="1"
          error={errors.budgetPerUnitEuro}
          defaultValue={values.budgetPerUnit}
          hint="In euro, excluding delivery. Leave it blank if you would rather we suggested."
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-navy">Where are they going?</legend>
        <div className="mt-2 space-y-2">
          {DELIVERY_MODES.map((mode) => (
            <label key={mode.value} className="flex items-start gap-3 text-sm text-ink-muted">
              <input
                type="radio"
                name="deliveryMode"
                value={mode.value}
                defaultChecked={values.deliveryMode === mode.value}
                aria-describedby={errors.deliveryMode ? 'deliveryMode-error' : undefined}
                className="mt-1"
              />
              {mode.label}
            </label>
          ))}
        </div>
        {errors.deliveryMode ? <FieldError id="deliveryMode-error" message={errors.deliveryMode} /> : null}
      </fieldset>

      {/*
        A week, not a day. We used to ask for the exact date the boxes
        should be in recipients' hands, which reads as a date we are
        promising back: once a box is with An Post the day it lands is not
        ours to guarantee. Asking for the week keeps the useful part of the
        answer without the promise.
      */}
      <Field
        label="Which week does it need to land?"
        name="deadline"
        placeholder="Week of 15 December"
        error={errors.deadline}
        required
        defaultValue={values.deadline}
        hint="The week they should be with recipients, not the date you want to order. We work to the week because we cannot guarantee which day An Post deliver on."
      />

      <fieldset className="space-y-3">
        <legend className="block text-sm font-medium text-navy">Anything we should know?</legend>
        <label className="flex items-start gap-3 text-sm text-ink-muted">
          <input type="checkbox" name="branding" defaultChecked={values.branding === 'on'} className="mt-1" />
          We want our branding on the card inside the lid
        </label>
        <label className="flex items-start gap-3 text-sm text-ink-muted">
          <input type="checkbox" name="alcoholAllowed" defaultChecked={values.alcoholAllowed === 'on'} className="mt-1" />
          Alcohol is fine for this list
        </label>
      </fieldset>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-navy">
          Anything else
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={2000}
          defaultValue={values.notes}
          className="mt-2 w-full border border-rule bg-white px-3 py-2 text-base"
          placeholder="Allergies, a theme, a previous order you liked, a hard deadline we should know about."
        />
      </div>

      <Button type="submit" size="large" disabled={pending}>
        {pending ? 'Sending' : 'Send enquiry'}
      </Button>

      <p className="text-xs text-ink-muted">
        We use what you send here to quote your order and nothing else. We do not add you to the
        newsletter from this form.
      </p>
    </form>
  )
}

