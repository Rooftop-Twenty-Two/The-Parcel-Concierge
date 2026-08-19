import 'server-only'

import { TRUSTPILOT } from './site-config'

/**
 * Trustpilot.
 *
 * The rating is fetched server side and cached, so the stars are in the HTML
 * for the crawler and for the AggregateRating structured data. Where no API
 * key is configured (outstanding item 7) we fall back to the figures
 * verified in the June review rather than rendering nothing.
 *
 * The fallback is a real, verified number, not a placeholder. If it ever
 * stops being verifiable it should be removed rather than left to drift.
 */

export type TrustSummary = {
  rating: number
  reviewCount: number
  /** True when the numbers came from the API rather than the fallback. */
  live: boolean
}

const API_KEY = process.env.TRUSTPILOT_API_KEY ?? ''
const BUSINESS_UNIT_ID = process.env.TRUSTPILOT_BUSINESS_UNIT_ID ?? ''

export async function getTrustSummary(): Promise<TrustSummary> {
  const fallback: TrustSummary = {
    rating: TRUSTPILOT.fallbackRating,
    reviewCount: TRUSTPILOT.fallbackReviewCount,
    live: false,
  }

  if (!API_KEY || !BUSINESS_UNIT_ID) return fallback

  try {
    const response = await fetch(
      `https://api.trustpilot.com/v1/business-units/${BUSINESS_UNIT_ID}`,
      {
        headers: { apikey: API_KEY },
        next: { revalidate: 60 * 60 * 6, tags: ['trustpilot'] },
      },
    )
    if (!response.ok) return fallback

    const body = (await response.json()) as {
      score?: { trustScore?: number; stars?: number }
      numberOfReviews?: { total?: number }
    }

    const rating = body.score?.trustScore ?? body.score?.stars
    const reviewCount = body.numberOfReviews?.total

    if (typeof rating !== 'number' || typeof reviewCount !== 'number') return fallback
    return { rating, reviewCount, live: true }
  } catch (error) {
    console.warn('[trustpilot] falling back to the verified June 2026 figures:', error)
    return fallback
  }
}
