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
  // The host the site is actually served from. Vercel redirects the apex to
  // www (308), so canonicals, the sitemap and structured data must name www:
  // pointing them at the apex sent every one of them through a redirect.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.theparcelconcierge.com',
  locale: 'en-IE',
  currency: 'EUR',
  /** Guaranteed Irish membership is stated on the current site and in the design. */
  memberships: ['Guaranteed Irish'],
} as const

/**
 * Trader identity and contact details.
 *
 * Source: the client's own email signature, September 2026. Consumer law
 * requires a trading name, a geographic address and a contact route to be
 * given before a distance contract is concluded, so the legal pages render
 * these rather than pointing at a form.
 *
 * `companyNumber` and `vatNumber` are null because we have not been given
 * them. The legal pages omit the line rather than inventing a number, and
 * both are on the client list in docs/build-status.md. If the business is a
 * registered company, the CRO number has to appear before launch.
 */
export const CONTACT = {
  email: 'hello@theparcelconcierge.com',
  phone: '(01) 801 9810',
  address: {
    line1: 'No 1, Supple House',
    town: 'Dunshaughlin',
    county: 'Co. Meath',
    eircode: 'A85 R684',
    country: 'Ireland',
  },
  companyNumber: null as string | null,
  vatNumber: null as string | null,
} as const

/** One line, for prose. */
export function postalAddress(): string {
  const { line1, town, county, eircode, country } = CONTACT.address
  return `${line1}, ${town}, ${county}, ${eircode}, ${country}`
}

/**
 * Force noindex site-wide (robots.txt disallow + meta noindex) even when the
 * store is connected. Set SITE_NOINDEX=true on an environment that is live but
 * not yet launched — e.g. the production Vercel domain before the real domain,
 * legal pages and launch sign-off are in place. Remove it to go indexable.
 */
export const SITE_NOINDEX = process.env.SITE_NOINDEX === 'true'

/**
 * Serve a holding page instead of the site.
 *
 * Set SITE_COMING_SOON=true on an environment that is public but not ready
 * to be walked around: middleware rewrites every page request to
 * /coming-soon, so there is no way to click into a half finished shop, and
 * the whole site goes noindex with it.
 *
 * It is an environment variable rather than a code change so it can be
 * turned off in the Vercel dashboard the moment the site is ready, with no
 * deploy and nothing to revert.
 */
export const SITE_COMING_SOON = process.env.SITE_COMING_SOON === 'true'

/**
 * Google Search Console site verification.
 *
 * The token from the "HTML tag" verification method in Search Console —
 * the `content` value only, not the whole meta tag. Set it as an
 * environment variable rather than committing it, so the same code can
 * verify a staging property and a production property with different
 * tokens, and so rotating it is a dashboard change rather than a deploy.
 *
 * It renders even while the site is noindex or behind the holding page.
 * That is deliberate: verification has to happen before launch, because
 * you cannot submit a sitemap for a property you do not own yet, and the
 * tag proves ownership without inviting a crawl. robots.txt and the
 * per-page noindex are what hold indexing back, not this.
 */
export const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION || null

export const DELIVERY = {
  /**
   * €8.95 confirmed by the client, August 2026. The June 2026 review
   * verified the previous €7.95 rate.
   */
  national: {
    priceMinor: 895,
    label: '€8.95 delivery anywhere in Ireland',
  },
  /**
   * Everything outside the hand-delivery area goes with An Post.
   * Confirmed by the client, September 2026: we do not use a courier, so
   * the site names the carrier rather than saying "courier".
   */
  carrier: 'An Post',
  localHandDelivery: {
    priceMinor: 0,
    label: 'Free hand delivery in our local area',
    /**
     * Confirmed by the client, September 2026: free hand delivery covers
     * the A85 eircode area and nothing beyond it. Stated as the routing
     * key rather than as a county, because A85 is the actual boundary and
     * "Co. Meath" would be a promise we could not keep.
     */
    eircodeRoutingKeys: ['A85'] as readonly string[] | null,
    counties: null as readonly string[] | null,
  },
  /**
   * REVERSED by the client, September 2026. August's answer was that there
   * was no UK delivery and the site said "Republic of Ireland only"
   * everywhere. The client now offers the UK at €40, so that claim had to
   * come off every page that carried it, not just the delivery page.
   *
   * Set `uk` to null to switch UK delivery back off: the rate card, the
   * delivery promise and the FAQ all read this rather than restating it.
   */
  shipsOutsideIreland: true,
  uk: {
    priceMinor: 4000,
    /**
     * €40 is a starting price, not a flat rate. Corrected by the client,
     * September 2026: the bar at the top of every page was reading
     * "UK €40", which quotes a fixed price we cannot hold to.
     *
     * Everywhere the UK rate appears goes through ukDeliveryPrice() below,
     * so this reads "from €40" in all of them or in none of them. Set it
     * to false if a flat UK rate is ever agreed.
     */
    priceIsFrom: true,
    /** Customs is the client's own caveat, and it belongs next to the price. */
    note: 'Delivery times may vary and additional customs requirements may apply.',
  } as { priceMinor: number; priceIsFrom: boolean; note: string } | null,
  /**
   * The most bottles we will send in one order.
   *
   * Confirmed by the client, September 2026: "delivery for up to 6 bottles
   * only". This is a packing and carriage limit, not a club rule, so it is
   * enforced on the whole cart rather than only on a Wine Vault Club case.
   *
   * Counted across wine and spirit lines, which includes the bottles inside
   * a hamper you build yourself, because the builder puts each component on
   * the cart as its own line. It does NOT count bottles inside a ready made
   * hamper: those are one line of one product and the cart cannot see
   * inside them. Set to null to lift the cap entirely.
   */
  maxBottlesPerOrder: 6 as number | null,
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

/**
 * How the free hand-delivery area is described in copy.
 *
 * Counties where the client has confirmed them, otherwise the eircode
 * routing keys, otherwise null so the pages invite the shopper to check
 * rather than naming an area we cannot stand over.
 */
export function handDeliveryZone(): string | null {
  const { counties, eircodeRoutingKeys } = DELIVERY.localHandDelivery
  if (counties && counties.length) return counties.join(', ')
  if (eircodeRoutingKeys && eircodeRoutingKeys.length) {
    return `the ${eircodeRoutingKeys.join(' and ')} eircode area`
  }
  return null
}

/**
 * The UK delivery price as it should be written, "from" included.
 *
 * Takes the formatter as an argument so this module keeps no import of the
 * commerce layer. Returns null when UK delivery is switched off, which is
 * the signal every caller already handles.
 */
export function ukDeliveryPrice(format: (amountMinor: number) => string): string | null {
  if (!DELIVERY.uk) return null
  const price = format(DELIVERY.uk.priceMinor)
  return DELIVERY.uk.priceIsFrom ? `from ${price}` : price
}

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

/**
 * Age verification. A tick box beside the checkout button, shown only when
 * the cart holds alcohol. There is no site-wide age popup.
 */
export const AGE_GATE = {
  minimumAge: 18,
} as const
