/**
 * Facts about the business that the front end renders.
 *
 * Rule for this file: every value is either verified or explicitly null.
 * Nothing here is a plausible guess. Where the client has not yet confirmed
 * a fact (brief section 13), the value is null and the components degrade to
 * an honest alternative rather than inventing a number. See
 * docs/build-status.md for the open list.
 */

export const SITE = {
  name: 'The Parcel Concierge',
  legalName: 'The Parcel Concierge',
  owners: 'Karen and Ciaran McBride',
  town: 'Dunshaughlin',
  county: 'Co. Meath',
  country: 'IE',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://theparcelconcierge.com',
  locale: 'en-IE',
  currency: 'EUR',
  /** Guaranteed Irish membership is stated on the current site and in the design. */
  memberships: ['Guaranteed Irish'],
} as const

export const DELIVERY = {
  /**
   * €8.95 confirmed by the client, August 2026. The June 2026 review
   * verified the previous €7.95 rate.
   */
  national: {
    priceMinor: 895,
    label: '€8.95 delivery anywhere in Ireland',
  },
  localHandDelivery: {
    priceMinor: 0,
    label: 'Free hand delivery in our local area',
    /**
     * Outstanding client item 4: the free hand-delivery zone stated by
     * county or eircode. Until this is supplied the delivery page invites
     * the shopper to check their address rather than naming a zone we have
     * not confirmed.
     */
    eircodeRoutingKeys: null as readonly string[] | null,
    counties: null as readonly string[] | null,
  },
  /**
   * Confirmed by the client, August 2026: THERE IS NO UK DELIVERY. The
   * site deliberately says "Republic of Ireland only" rather than staying
   * silent, so a UK buyer finds out before the checkout does.
   */
  shipsOutsideIreland: false,
  /**
   * Free delivery on orders of €100 or more. Confirmed by the client,
   * August 2026; the cart progress nudge renders now that this is set.
   */
  freeDeliveryThresholdMinor: 10000 as number | null,
  cutOff: {
    /** Daily order cut-off for next-working-day dispatch. Not confirmed. */
    dailyOrderCutOff: null as string | null,
    /** Christmas cut-off dates. Managed in the CMS, seasonally. */
    christmas: null as string | null,
  },
} as const

export const TRUSTPILOT = {
  /**
   * Verified in the June 2026 review: 5 stars across 81 reviews. These are
   * the fallback values used for server-rendered stars and structured data
   * before the live widget hydrates. The API refreshes them: see
   * src/lib/trustpilot.
   */
  businessUnitDomain: 'theparcelconcierge.com',
  fallbackRating: 5,
  fallbackReviewCount: 81,
  /** Set NEXT_PUBLIC_TRUSTPILOT_BUSINESS_UNIT_ID to enable the live widget. */
  businessUnitId: process.env.NEXT_PUBLIC_TRUSTPILOT_BUSINESS_UNIT_ID ?? null,
} as const

export const NEWSLETTER = {
  /** Brief section 8: rivals offer this and TPC currently offers nothing. */
  incentive: '10% off your first order',
} as const

/** Age verification. Applied to alcohol routes and alcohol in the cart. */
export const AGE_GATE = {
  minimumAge: 18,
  /** How long a confirmed age check is remembered, in seconds. */
  cookieMaxAge: 60 * 60 * 24 * 30,
  cookieName: 'tpc_age_ok',
} as const
