import 'server-only'

import type { CorporateEnquiry } from '@/app/actions/corporate'
import type { ContactMessage } from '@/app/actions/contact'

/**
 * Outbound notifications.
 *
 * Corporate enquiries go to email, and to the CRM where one is configured.
 * Neither provider is chosen yet, so this module has one job: put the
 * integration point in one place with a shape that will not need rewriting.
 *
 * When no transport is configured the enquiry is logged server side and the
 * call still succeeds. That is a deliberate trade for the preview build: a
 * corporate enquiry that silently 500s is worse than one that reaches the
 * server log. Before launch, CORPORATE_ENQUIRY_WEBHOOK or an email
 * transport must be set, and docs/build-status.md lists it as a launch
 * blocker.
 */

const WEBHOOK = process.env.CORPORATE_ENQUIRY_WEBHOOK ?? ''
const NOTIFY_EMAIL = process.env.CORPORATE_ENQUIRY_EMAIL ?? ''

/**
 * Transactional email via Postmark. The From address is a verified sending
 * domain (hello@theparcelconcierge.com, DKIM + Return-Path in DNS). When
 * POSTMARK_SERVER_TOKEN is unset the message is logged and the call still
 * succeeds, so a preview build without the token does not 500 — the same
 * trade the webhook paths make.
 */
const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN ?? ''
const CONTACT_FROM = process.env.CONTACT_FORM_FROM ?? 'hello@theparcelconcierge.com'
const CONTACT_TO = process.env.CONTACT_FORM_TO ?? 'hello@theparcelconcierge.com'

async function sendEmail(params: {
  to: string
  subject: string
  text: string
  replyTo?: string
}): Promise<void> {
  if (!POSTMARK_TOKEN) {
    console.warn(
      '[notifications] POSTMARK_SERVER_TOKEN is not set. Email logged only:',
      JSON.stringify({ to: params.to, subject: params.subject, replyTo: params.replyTo }),
    )
    return
  }

  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': POSTMARK_TOKEN,
    },
    body: JSON.stringify({
      From: CONTACT_FROM,
      To: params.to,
      ReplyTo: params.replyTo,
      // Visitors type part of the subject. A line break in it would make
      // Postmark reject the message, so the enquiry would be lost.
      Subject: params.subject.replace(/[\r\n]+/g, ' ').slice(0, 250),
      TextBody: params.text,
      MessageStream: 'outbound',
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Postmark responded ${response.status}: ${detail.slice(0, 300)}`)
  }
}

/**
 * A contact-form message. Goes to the business inbox with the sender's address
 * as Reply-To, so a reply from the inbox goes straight back to them.
 */
export async function sendContactMessage(message: ContactMessage): Promise<void> {
  const body = [
    `From: ${message.name} <${message.email}>`,
    message.phone ? `Phone: ${message.phone}` : null,
    `Subject: ${message.subject || '(none given)'}`,
    '',
    message.message,
  ]
    .filter((line) => line !== null)
    .join('\n')

  await sendEmail({
    to: CONTACT_TO,
    replyTo: message.email,
    subject: `Website contact: ${message.subject || message.name}`,
    text: body,
  })
}

export async function sendCorporateEnquiry(
  enquiry: CorporateEnquiry,
  context: { volumeThreshold: number },
): Promise<void> {
  const aboveVolumeThreshold = enquiry.quantity >= context.volumeThreshold

  // Email the enquiry to the business inbox — the same inbox the contact form
  // uses. Reply-To is the buyer, so a reply from the inbox reaches them.
  await sendEmail({
    to: NOTIFY_EMAIL || CONTACT_TO,
    replyTo: enquiry.email,
    subject: `Corporate enquiry: ${enquiry.company} — ${enquiry.quantity} boxes${
      aboveVolumeThreshold ? ' (volume)' : ''
    }`,
    text: corporateEnquiryText(enquiry, aboveVolumeThreshold),
  })

  // Fan out to the CRM webhook as well, when one is configured.
  if (!WEBHOOK) return

  const response = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'corporate-enquiry',
      receivedAt: new Date().toISOString(),
      aboveVolumeThreshold,
      notifyEmail: NOTIFY_EMAIL || null,
      enquiry,
    }),
  })

  if (!response.ok) {
    throw new Error(`Corporate enquiry webhook responded ${response.status}`)
  }
}

function corporateEnquiryText(enquiry: CorporateEnquiry, aboveVolumeThreshold: boolean): string {
  return [
    `Company: ${enquiry.company}`,
    `Name: ${enquiry.name} <${enquiry.email}>`,
    enquiry.phone ? `Phone: ${enquiry.phone}` : null,
    `Quantity: ${enquiry.quantity} boxes${aboveVolumeThreshold ? ' (above volume threshold)' : ''}`,
    enquiry.budgetPerUnitEuro != null ? `Budget per box: €${enquiry.budgetPerUnitEuro}` : null,
    `Delivery: ${enquiry.deliveryMode}`,
    `Needed: ${enquiry.deadline}`,
    `Branding: ${enquiry.branding ? 'yes' : 'no'}`,
    `Alcohol allowed: ${enquiry.alcoholAllowed ? 'yes' : 'no'}`,
    enquiry.notes ? `\nNotes:\n${enquiry.notes}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

export async function subscribeToNewsletter(email: string): Promise<void> {
  const endpoint = process.env.NEWSLETTER_WEBHOOK ?? ''

  if (!endpoint) {
    console.warn('[notifications] NEWSLETTER_WEBHOOK is not set. Signup logged only:', email)
    return
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source: 'website', subscribedAt: new Date().toISOString() }),
  })

  if (!response.ok) {
    throw new Error(`Newsletter webhook responded ${response.status}`)
  }
}
