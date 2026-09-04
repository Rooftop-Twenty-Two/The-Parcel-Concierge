'use server'

import { sendContactMessage } from '@/lib/notifications'

/**
 * Contact-form submission.
 *
 * Validated server side, then emailed to the business inbox. Validation lives
 * here rather than only in the browser because a form that can be bypassed
 * with a curl is not validated.
 */

export type ContactMessage = {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

export type ContactResult =
  | { ok: true }
  | { ok: false; errors: Partial<Record<keyof ContactMessage, string>>; message?: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function str(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function submitContactMessage(
  _previous: ContactResult | null,
  form: FormData,
): Promise<ContactResult> {
  // Honeypot: a hidden field real people leave blank. A filled one is a bot,
  // and we drop it silently so the bot cannot tell it was caught.
  if (str(form, 'company')) return { ok: true }

  const errors: Partial<Record<keyof ContactMessage, string>> = {}

  const name = str(form, 'name')
  const email = str(form, 'email')
  const phone = str(form, 'phone')
  const subject = str(form, 'subject')
  const message = str(form, 'message')

  if (!name) errors.name = 'We need a name so we know who we are talking to.'
  if (!EMAIL.test(email)) errors.email = 'That email address does not look right.'
  if (message.length < 10) errors.message = 'Tell us a little more so we can help.'

  if (Object.keys(errors).length) return { ok: false, errors }

  const contact: ContactMessage = {
    name: name.slice(0, 120),
    email,
    phone: phone.slice(0, 40),
    subject: subject.slice(0, 160),
    message: message.slice(0, 4000),
  }

  try {
    await sendContactMessage(contact)
    return { ok: true }
  } catch (error) {
    console.error('[contact] message failed to send:', error)
    return {
      ok: false,
      errors: {},
      message:
        'That did not send. Email us directly and we will pick it up, or try again in a minute.',
    }
  }
}
