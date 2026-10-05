'use server'

import { randomBytes, randomUUID } from 'node:crypto'
import { queryProducts } from '@/lib/commerce'
import { createRecipientOrder } from '@/lib/corporate/orders'
import { campaignStore, type CampaignStore } from '@/lib/corporate/store'
import {
  campaignOpen,
  redemptionFor,
  type Campaign,
  type CampaignGift,
  type RedemptionAddress,
} from '@/lib/corporate/types'

/**
 * The corporate gifting actions: one file, three audiences.
 *
 * The corporate buyer creates a campaign; the recipient identifies and
 * redeems; the admin activates and progresses. Everything returns plain
 * result objects because every failure here is something a person needs
 * to read, not a stack trace.
 *
 * The privacy rule is enforced at this layer: nothing that leaves through
 * a corporate-facing action ever contains a recipient address.
 */

type Ok<T> = { ok: true } & T
type Err = { ok: false; message: string }

// ---------------------------------------------------------------------------
// Creating a campaign.
// ---------------------------------------------------------------------------

export type CreateCampaignInput = {
  company: {
    companyName: string
    firstName: string
    lastName: string
    email: string
    phone: string
    website?: string
    billingAddress?: string
    vatNumber?: string
    purchaseOrder?: string
    wantsBespoke: boolean
  }
  recipientLimit: number
  recipientType: string
  allowanceMinor: number
  giftHandles: string[]
  upgradeAllowed: boolean
  giftMessagesAllowed: boolean
  deadline: string
  deliveryWindow?: string
  branding: { title?: string; message?: string; colourId?: string; logoDataUri?: string }
  paymentPreference: 'invoice' | 'quote'
}

export async function createCampaignAction(
  input: CreateCampaignInput,
): Promise<Ok<{ slug: string; dashboardToken: string }> | Err> {
  const c = input.company
  if (!c.companyName?.trim()) return { ok: false, message: 'Tell us the company name.' }
  if (!c.firstName?.trim() || !c.lastName?.trim()) return { ok: false, message: 'Tell us your name.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email ?? '')) {
    return { ok: false, message: 'That work email does not look right.' }
  }
  if (!c.phone?.trim()) return { ok: false, message: 'We need a phone number for the campaign.' }

  const recipients = Math.floor(input.recipientLimit)
  if (!Number.isFinite(recipients) || recipients < 1 || recipients > 10000) {
    return { ok: false, message: 'Recipients must be between 1 and 10,000.' }
  }
  if (!Number.isFinite(input.allowanceMinor) || input.allowanceMinor < 1000) {
    return { ok: false, message: 'The gift allowance starts at €10 per person.' }
  }
  if (!input.deadline || Number.isNaN(Date.parse(input.deadline))) {
    return { ok: false, message: 'Pick a deadline for selections.' }
  }
  if (new Date(`${input.deadline}T23:59:59`) < new Date()) {
    return { ok: false, message: 'The deadline has to be in the future.' }
  }
  if (!input.giftHandles.length) {
    return { ok: false, message: 'Pick at least one hamper for your recipients to choose from.' }
  }
  if (input.giftHandles.length > 8) {
    return { ok: false, message: 'Eight choices is the most a recipient can face. Trim the list.' }
  }
  if ((input.branding.logoDataUri?.length ?? 0) > 220_000) {
    return { ok: false, message: 'That logo is too large. 150KB is plenty for a page header.' }
  }

  // The gift list is re-read server side: the client sends handles, the
  // catalogue is the authority on titles, prices and images.
  const { items } = await queryProducts({ handles: input.giftHandles, first: input.giftHandles.length })
  const gifts: CampaignGift[] = items
    .filter((p) => p.kind === 'hamper' || p.handle === 'build-your-own-hamper')
    .map((p) => ({
      handle: p.handle,
      title: p.title,
      priceMinor: p.defaultVariantPriceMinor ?? p.priceRange.min.amountMinor,
      image: p.image ? { url: p.image.url, alt: p.image.alt } : null,
      containsAlcohol: p.tags.includes('contains:alcohol') || p.tags.includes('type:wine'),
    }))
  if (!gifts.length) {
    return { ok: false, message: 'None of those gifts exist any more. Refresh and choose again.' }
  }

  const store = await campaignStore()
  const slug = await uniqueSlug(store.getBySlug.bind(store), c.companyName, input.branding.title)

  const campaign: Campaign = {
    id: randomUUID(),
    slug,
    dashboardToken: randomBytes(16).toString('hex'),
    // Nothing goes live until the invoice or quote conversation has
    // happened: an admin activates it. Honest for a business that wants
    // paper for large orders anyway.
    status: 'AWAITING_PAYMENT',
    company: {
      companyName: c.companyName.trim(),
      firstName: c.firstName.trim(),
      lastName: c.lastName.trim(),
      email: c.email.trim().toLowerCase(),
      phone: c.phone.trim(),
      website: c.website?.trim() || undefined,
      billingAddress: c.billingAddress?.trim() || undefined,
      vatNumber: c.vatNumber?.trim() || undefined,
      purchaseOrder: c.purchaseOrder?.trim() || undefined,
      wantsBespoke: Boolean(c.wantsBespoke),
    },
    branding: {
      title: input.branding.title?.trim().slice(0, 80) || undefined,
      message: input.branding.message?.trim().slice(0, 500) || undefined,
      colourId: input.branding.colourId,
      logoDataUri: input.branding.logoDataUri,
    },
    recipientLimit: recipients,
    recipientType: input.recipientType || 'Employees',
    allowanceMinor: Math.round(input.allowanceMinor),
    upgradeAllowed: Boolean(input.upgradeAllowed),
    giftMessagesAllowed: Boolean(input.giftMessagesAllowed),
    deadline: input.deadline,
    deliveryWindow: input.deliveryWindow?.trim() || undefined,
    gifts,
    recipients: [],
    redemptions: [],
    paymentPreference: input.paymentPreference,
    createdAt: new Date().toISOString(),
  }

  if (!(await saved(store, campaign))) return { ok: false, message: SAVE_FAILED }
  return { ok: true, slug, dashboardToken: campaign.dashboardToken }
}

const SAVE_FAILED =
  'We could not save that just now. Please try again in a minute, or email us and we will sort it out.'

/**
 * A save the shopper is waiting on. A storage failure (see store.ts) is
 * logged and reported as a message, not thrown into an error page.
 */
async function saved(store: CampaignStore, campaign: Campaign): Promise<boolean> {
  try {
    await store.save(campaign)
    return true
  } catch (error) {
    console.error('[corporate] campaign save failed', error)
    return false
  }
}

async function uniqueSlug(
  getBySlug: (slug: string) => Promise<Campaign | null>,
  companyName: string,
  title: string | undefined,
): Promise<string> {
  const base = `${companyName} ${title ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'gift'
  // A short random suffix keeps the link unguessable without an index scan.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = `${base}-${randomBytes(3).toString('hex')}`
    if (!(await getBySlug(slug))) return slug
  }
  return `${base}-${randomBytes(6).toString('hex')}`
}

// ---------------------------------------------------------------------------
// The recipient journey.
// ---------------------------------------------------------------------------

export type IdentifyResult =
  | Ok<{ state: 'choose' }>
  | Ok<{ state: 'already-chosen'; giftTitle: string }>
  | Err

/** Step one for a recipient: who are we sending your gift to? */
export async function identifyRecipientAction(
  slug: string,
  input: { firstName: string; lastName: string; email: string },
): Promise<IdentifyResult> {
  const store = await campaignStore()
  const campaign = await store.getBySlug(slug)
  if (!campaign) return { ok: false, message: 'This gifting link does not exist.' }
  if (!campaignOpen(campaign)) {
    return { ok: false, message: 'This gifting page has closed. Contact whoever sent you the link.' }
  }

  const email = input.email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: 'That email does not look right.' }
  }
  if (!input.firstName.trim() || !input.lastName.trim()) {
    return { ok: false, message: 'We need your name for the parcel.' }
  }

  const existingRedemption = redemptionFor(campaign, email)
  if (existingRedemption) {
    return { ok: true, state: 'already-chosen', giftTitle: existingRedemption.giftTitle }
  }

  let recipient = campaign.recipients.find((r) => r.email === email)
  if (!recipient) {
    if (campaign.recipients.length >= campaign.recipientLimit) {
      return {
        ok: false,
        message:
          'All the gifts on this link have been claimed. Contact whoever sent it to you and they can add more.',
      }
    }
    recipient = {
      id: randomUUID(),
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      status: 'STARTED',
      startedAt: new Date().toISOString(),
    }
    campaign.recipients.push(recipient)
  } else if (recipient.status === 'NOT_STARTED') {
    recipient.status = 'STARTED'
    recipient.startedAt = new Date().toISOString()
  }

  await store.save(campaign)
  return { ok: true, state: 'choose' }
}

export type RedeemInput = {
  email: string
  giftHandle: string
  giftMessage?: string
  address: RedemptionAddress
}

export async function redeemGiftAction(
  slug: string,
  input: RedeemInput,
): Promise<Ok<{ orderReference: string; firstName: string }> | Err> {
  const store = await campaignStore()
  const campaign = await store.getBySlug(slug)
  if (!campaign) return { ok: false, message: 'This gifting link does not exist.' }
  if (!campaignOpen(campaign)) {
    return { ok: false, message: 'This gifting page has closed. Contact whoever sent you the link.' }
  }

  const email = input.email.trim().toLowerCase()
  const recipient = campaign.recipients.find((r) => r.email === email)
  if (!recipient) return { ok: false, message: 'Start again from the beginning of the page.' }

  // The one-gift promise, checked at write time as well as on entry.
  if (redemptionFor(campaign, email)) {
    return { ok: false, message: 'A gift has already been chosen with this email.' }
  }

  const gift = campaign.gifts.find((g) => g.handle === input.giftHandle)
  if (!gift) return { ok: false, message: 'Pick one of the gifts on the page.' }

  const a = input.address
  for (const [field, label] of [
    [a.firstName, 'first name'],
    [a.lastName, 'last name'],
    [a.line1, 'address'],
    [a.town, 'town'],
    [a.county, 'county'],
    [a.eircode, 'eircode'],
    [a.phone, 'phone number'],
  ] as const) {
    if (!field?.trim()) return { ok: false, message: `We need the ${label} for delivery.` }
  }

  const sequence = campaign.redemptions.length + 1
  const orderReference = `CORP-${campaign.slug.split('-')[0]!.toUpperCase().slice(0, 8)}-${String(sequence).padStart(4, '0')}`

  const redemption = {
    id: randomUUID(),
    orderReference,
    recipientId: recipient.id,
    giftHandle: gift.handle,
    giftTitle: gift.title,
    giftMessage: campaign.giftMessagesAllowed
      ? input.giftMessage?.trim().slice(0, 250) || undefined
      : undefined,
    address: {
      firstName: a.firstName.trim(),
      lastName: a.lastName.trim(),
      line1: a.line1.trim(),
      line2: a.line2?.trim() || undefined,
      town: a.town.trim(),
      county: a.county.trim(),
      eircode: a.eircode.trim(),
      phone: a.phone.trim(),
      email,
      isBusinessAddress: Boolean(a.isBusinessAddress),
    },
    shopifyOrderId: null as string | null,
    redeemedAt: new Date().toISOString(),
  }

  // Into the normal fulfilment workflow where the store is connected;
  // durable here with its own reference either way.
  redemption.shopifyOrderId = await createRecipientOrder(campaign, redemption)

  campaign.redemptions.push(redemption)
  recipient.status = redemption.shopifyOrderId ? 'ORDER_CREATED' : 'SELECTED'
  recipient.selectedAt = redemption.redeemedAt

  if (!(await saved(store, campaign))) return { ok: false, message: SAVE_FAILED }
  return { ok: true, orderReference, firstName: recipient.firstName }
}

// ---------------------------------------------------------------------------
// The corporate dashboard.
// ---------------------------------------------------------------------------

/** Everything the company may see. No addresses, by design. */
export async function addAllocationAction(
  slug: string,
  token: string,
  additional: number,
): Promise<Ok<{ newLimit: number }> | Err> {
  const store = await campaignStore()
  const campaign = await store.getBySlug(slug)
  if (!campaign || campaign.dashboardToken !== token) {
    return { ok: false, message: 'That dashboard link is not valid.' }
  }
  const add = Math.floor(additional)
  if (!Number.isFinite(add) || add < 1 || add > 5000) {
    return { ok: false, message: 'Add between 1 and 5,000 recipients.' }
  }
  campaign.recipientLimit += add
  await store.save(campaign)
  return { ok: true, newLimit: campaign.recipientLimit }
}

// ---------------------------------------------------------------------------
// Admin.
// ---------------------------------------------------------------------------

function adminAuthorised(key: string): boolean {
  const expected = process.env.CORPORATE_ADMIN_KEY
  return Boolean(expected) && key === expected
}

export async function setCampaignStatusAction(
  key: string,
  id: string,
  status: Campaign['status'],
): Promise<{ ok: true } | Err> {
  if (!adminAuthorised(key)) return { ok: false, message: 'Not authorised.' }
  const store = await campaignStore()
  const campaign = await store.get(id)
  if (!campaign) return { ok: false, message: 'No such campaign.' }
  campaign.status = status
  if (status === 'ACTIVE' && !campaign.activatedAt) campaign.activatedAt = new Date().toISOString()
  await store.save(campaign)
  return { ok: true }
}
