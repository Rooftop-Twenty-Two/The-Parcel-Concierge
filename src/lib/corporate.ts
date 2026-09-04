/**
 * Corporate gifting configuration.
 *
 * Volume tiers and lead times are outstanding client item 5. Until they are
 * confirmed, `VOLUME_TIERS` is empty and the pages say plainly that pricing
 * is quoted on the enquiry rather than printing a discount the client has
 * not agreed to. Filling the array in turns the table on with no code
 * change.
 */

export type VolumeTier = {
  minUnits: number
  maxUnits: number | null
  /** Percentage off list, as a whole number. */
  discountPercent: number
  leadTimeWorkingDays: number
}

/**
 * Unused since the bulk orders page came off at the client's request in
 * September 2026. Kept because restoring that page should be restoring the
 * route, not rewriting its configuration.
 */
export const VOLUME_TIERS: readonly VolumeTier[] = []

/**
 * Branding options we can actually deliver. These are the ones already
 * described on the hamper product pages, so they are safe to publish.
 *
 * Unused since the branding and personalisation page came off at the
 * client's request in September 2026. Kept for the same reason as
 * VOLUME_TIERS above: bringing the page back should be a route, not a
 * rewrite.
 */
export const BRANDING_OPTIONS = [
  {
    title: 'Printed card inside the lid',
    body: 'Your logo and a message, printed on a card that sits inside the lid. This is what most companies choose, because it reads as a gift rather than as swag.',
    leadTime: 'Artwork needed five working days before dispatch.',
  },
  {
    title: 'Your own branded ribbon',
    body: 'We hand tie every box. Send us your own branded ribbon and we will tie the boxes with it rather than with ours.',
    leadTime: 'Ribbon needed with us five working days before dispatch.',
  },
  {
    title: 'Handwritten cards',
    body: 'For smaller lists we write each card by hand. Send us the names and the message and we will do the rest.',
    leadTime: 'Practical up to about fifty boxes.',
  },
  {
    title: 'Bespoke hamper contents',
    body: 'For larger orders we will build a box specifically for you, from producers you choose or from a brief. Useful when the gift needs to say something about where your company is from.',
    leadTime: 'Start this conversation at least six weeks out.',
  },
] as const

export const BULK_ORDER_MINIMUM = 10

export const DELIVERY_MODES = [
  { value: 'one-address', label: 'One address, we distribute internally' },
  { value: 'many-addresses', label: 'Individual addresses, you have the list' },
  { value: 'mixed', label: 'A mix of both' },
] as const
