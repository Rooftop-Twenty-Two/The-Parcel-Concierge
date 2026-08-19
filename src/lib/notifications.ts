import 'server-only'

import type { CorporateEnquiry } from '@/app/actions/corporate'

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

export async function sendCorporateEnquiry(
  enquiry: CorporateEnquiry,
  context: { volumeThreshold: number },
): Promise<void> {
  const payload = {
    type: 'corporate-enquiry',
    receivedAt: new Date().toISOString(),
    aboveVolumeThreshold: enquiry.quantity >= context.volumeThreshold,
    notifyEmail: NOTIFY_EMAIL || null,
    enquiry,
  }

  if (!WEBHOOK) {
    console.warn(
      '[notifications] CORPORATE_ENQUIRY_WEBHOOK is not set. Enquiry logged only:',
      JSON.stringify(payload),
    )
    return
  }

  const response = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Corporate enquiry webhook responded ${response.status}`)
  }
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
