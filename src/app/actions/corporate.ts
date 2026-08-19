'use server'

import { BULK_ORDER_MINIMUM, DELIVERY_MODES } from '@/lib/corporate'
import { sendCorporateEnquiry } from '@/lib/notifications'

/**
 * Corporate enquiry submission.
 *
 * Validated server side, then routed to email and, where one is configured,
 * to the CRM. Validation lives here rather than only in the browser because
 * a form that can be bypassed with a curl is not validated.
 */

export type CorporateEnquiry = {
  company: string
  name: string
  email: string
  phone: string
  quantity: number
  budgetPerUnitEuro: number | null
  deliveryMode: string
  deadline: string
  branding: boolean
  alcoholAllowed: boolean
  notes: string
}

export type EnquiryResult =
  | { ok: true }
  | { ok: false; errors: Partial<Record<keyof CorporateEnquiry, string>>; message?: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function str(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function submitCorporateEnquiry(
  _previous: EnquiryResult | null,
  form: FormData,
): Promise<EnquiryResult> {
  const errors: Partial<Record<keyof CorporateEnquiry, string>> = {}

  const company = str(form, 'company')
  const name = str(form, 'name')
  const email = str(form, 'email')
  const phone = str(form, 'phone')
  const quantityRaw = str(form, 'quantity')
  const budgetRaw = str(form, 'budgetPerUnit')
  const deliveryMode = str(form, 'deliveryMode')
  const deadline = str(form, 'deadline')
  const notes = str(form, 'notes')

  if (!company) errors.company = 'We need the company name.'
  if (!name) errors.name = 'We need a name so we know who we are talking to.'
  if (!EMAIL.test(email)) errors.email = 'That email address does not look right.'

  const quantity = Number(quantityRaw)
  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.quantity = 'Give us a rough number of boxes. An estimate is fine.'
  }

  const budgetPerUnitEuro = budgetRaw ? Number(budgetRaw) : null
  if (budgetRaw && (!Number.isFinite(budgetPerUnitEuro) || (budgetPerUnitEuro ?? 0) <= 0)) {
    errors.budgetPerUnitEuro = 'Budget per box should be a number, or leave it blank.'
  }

  if (!DELIVERY_MODES.some((mode) => mode.value === deliveryMode)) {
    errors.deliveryMode = 'Tell us where the boxes are going.'
  }

  if (!deadline) {
    errors.deadline = 'When does this need to land?'
  } else if (Number.isNaN(Date.parse(deadline))) {
    errors.deadline = 'That date does not look right.'
  }

  if (Object.keys(errors).length) return { ok: false, errors }

  const enquiry: CorporateEnquiry = {
    company,
    name,
    email,
    phone,
    quantity,
    budgetPerUnitEuro,
    deliveryMode,
    deadline,
    branding: form.get('branding') === 'on',
    alcoholAllowed: form.get('alcoholAllowed') === 'on',
    notes: notes.slice(0, 2000),
  }

  try {
    await sendCorporateEnquiry(enquiry, { volumeThreshold: BULK_ORDER_MINIMUM })
    return { ok: true }
  } catch (error) {
    console.error('[corporate] enquiry failed to send:', error)
    return {
      ok: false,
      errors: {},
      message:
        'That did not send. Email us directly and we will pick it up, or try again in a minute.',
    }
  }
}
