/**
 * Corporate Gifting Made Easy: the data model.
 *
 * The proposition in one line: the company chooses the budget and the
 * gifts, every recipient chooses their own hamper and tells US where it
 * goes, and no spreadsheet of home addresses ever exists. The model is
 * shaped by that privacy promise: a recipient's address lives on the
 * redemption, which the corporate dashboard never renders. The company
 * sees who has chosen, never where anything is going.
 *
 * One campaign is one self-contained document, recipients and redemptions
 * inside it. At corporate-gifting scale (hundreds of campaigns, hundreds
 * of recipients each) a document per campaign is simpler and safer than
 * six tables without a real database behind them, and the store interface
 * (./store.ts) is the seam where PostgreSQL slots in later without
 * touching a page.
 */

export const CAMPAIGN_STATUSES = [
  'DRAFT',
  'AWAITING_PAYMENT',
  'ACTIVE',
  'CLOSED',
  'FULFILLING',
  'COMPLETE',
  'CANCELLED',
] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const RECIPIENT_STATUSES = [
  'NOT_STARTED',
  'STARTED',
  'SELECTED',
  'ORDER_CREATED',
  'FULFILLED',
  'DELIVERED',
] as const
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number]

export type CampaignCompany = {
  companyName: string
  firstName: string
  lastName: string
  /** Work email: where the dashboard link and confirmations go. */
  email: string
  phone: string
  website?: string
  billingAddress?: string
  vatNumber?: string
  purchaseOrder?: string
  /** They ticked "I would like to speak to someone about a bespoke package". */
  wantsBespoke: boolean
}

export type CampaignBranding = {
  /** e.g. "Acme Christmas Gift 2026". Falls back to "A gift from {company}". */
  title?: string
  /** The welcome note recipients read. */
  message?: string
  /** One of BRAND_COLOUR_CHOICES ids, never a free hex from a form. */
  colourId?: string
  /**
   * A small logo as a data URI (capped at ~150KB before encoding). Stored
   * inline so the campaign document stays self-contained; real asset
   * storage is a later upgrade behind the same field.
   */
  logoDataUri?: string
}

export type CampaignGift = {
  handle: string
  title: string
  priceMinor: number
  image: { url: string; alt: string } | null
  containsAlcohol: boolean
}

export type RecipientRecord = {
  id: string
  /** Lowercased; campaign + email is the redemption key. */
  email: string
  firstName: string
  lastName: string
  status: RecipientStatus
  startedAt?: string
  selectedAt?: string
}

export type RedemptionAddress = {
  firstName: string
  lastName: string
  line1: string
  line2?: string
  town: string
  county: string
  eircode: string
  phone: string
  email: string
  isBusinessAddress: boolean
}

export type RedemptionRecord = {
  id: string
  /** CORP-{CAMPAIGN}-{NNNN}, the order reference fulfilment sees. */
  orderReference: string
  recipientId: string
  giftHandle: string
  giftTitle: string
  giftMessage?: string
  /**
   * PRIVATE. Rendered only on the fulfilment side, never on the corporate
   * dashboard. That asymmetry is the product.
   */
  address: RedemptionAddress
  /** Set once the Shopify draft order exists. Null until the store is connected. */
  shopifyOrderId: string | null
  redeemedAt: string
}

export type Campaign = {
  id: string
  /** URL segment under /gift/. Unique, unguessable enough with the token. */
  slug: string
  /** Secret for the corporate dashboard link. Knowing the slug is not enough. */
  dashboardToken: string
  status: CampaignStatus
  company: CampaignCompany
  branding: CampaignBranding
  recipientLimit: number
  recipientType: string
  /** Cents. What the company pays per head. */
  allowanceMinor: number
  /** Recipients may pay the difference for a dearer hamper. Off in V1 checkout terms. */
  upgradeAllowed: boolean
  /** Recipients may write their own gift message. */
  giftMessagesAllowed: boolean
  /** ISO date. After this the gifting page closes itself. */
  deadline: string
  deliveryWindow?: string
  gifts: CampaignGift[]
  recipients: RecipientRecord[]
  redemptions: RedemptionRecord[]
  /** How they want to settle: larger orders want paper, not card. */
  paymentPreference: 'invoice' | 'quote'
  createdAt: string
  activatedAt?: string
}

/** What a campaign costs before delivery and any volume discount. */
export function campaignValueMinor(recipientLimit: number, allowanceMinor: number): number {
  return recipientLimit * allowanceMinor
}

/**
 * Volume tiers. Configuration, not code: the numbers live here so the
 * admin change is one edit, and nothing in a component repeats them. The
 * discount applies to the invoice we raise, never silently to a price a
 * recipient sees.
 *
 * UNPUBLISHED until the client formally confirms the numbers (August 2026
 * brief). The tiers discussed were 25+ at 5%, 50+ at 7.5%, 100+ at 10%
 * and 250+ custom quoted; when they are signed off, restore them here and
 * every page, the wizard and the dashboard pick them up in one edit.
 * Until then everything renders as quoted-on-enquiry.
 */
export const VOLUME_TIERS: readonly {
  minRecipients: number
  discountPercent: number
  label: string
}[] = [
  { minRecipients: 1, discountPercent: 0, label: 'Volume pricing quoted with your campaign' },
]

export function volumeTierFor(recipients: number) {
  return VOLUME_TIERS.find((t) => recipients >= t.minRecipients) ?? VOLUME_TIERS.at(-1)!
}

/** Brand palette choices for campaign accents. Ours, so the page stays ours. */
export const BRAND_COLOUR_CHOICES = [
  { id: 'green', label: 'Vault green', hex: '#2c4349' },
  { id: 'navy', label: 'Postmark navy', hex: '#22333b' },
  { id: 'gold', label: 'Foil gold', hex: '#b28e4c' },
  { id: 'red', label: 'Seal red', hex: '#c8472e' },
] as const

export function brandColour(colourId: string | undefined): string {
  return BRAND_COLOUR_CHOICES.find((c) => c.id === colourId)?.hex ?? '#2c4349'
}

/** Is the campaign still accepting selections right now? */
export function campaignOpen(campaign: Campaign, now = new Date()): boolean {
  if (campaign.status !== 'ACTIVE') return false
  // The deadline day itself still counts: "choose by Friday" includes Friday.
  const deadline = new Date(`${campaign.deadline}T23:59:59`)
  return now <= deadline
}

export function redemptionFor(campaign: Campaign, email: string): RedemptionRecord | null {
  const recipient = campaign.recipients.find((r) => r.email === email.trim().toLowerCase())
  if (!recipient) return null
  return campaign.redemptions.find((r) => r.recipientId === recipient.id) ?? null
}

/** Dashboard numbers, derived rather than stored so they cannot drift. */
export function campaignStats(campaign: Campaign) {
  const selected = campaign.recipients.filter((r) =>
    ['SELECTED', 'ORDER_CREATED', 'FULFILLED', 'DELIVERED'].includes(r.status),
  ).length
  const dispatched = campaign.recipients.filter((r) =>
    ['FULFILLED', 'DELIVERED'].includes(r.status),
  ).length
  const delivered = campaign.recipients.filter((r) => r.status === 'DELIVERED').length
  return {
    purchased: campaign.recipientLimit,
    selected,
    awaiting: Math.max(0, campaign.recipientLimit - selected),
    dispatched,
    delivered,
  }
}
