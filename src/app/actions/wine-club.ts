'use server'

import { revalidatePath } from 'next/cache'
import { getProduct } from '@/lib/commerce'
import { addLines } from '@/lib/commerce/cart'
import type { CartLineAttribute } from '@/lib/commerce/types'
import {
  CLUB_ATTRIBUTES,
  CLUB_PRODUCT_HANDLE,
  isClubBuyable,
  resolve,
  type ClubSelection,
} from '@/lib/wine-club'

/**
 * Joining the wine club.
 *
 * The recurrence is Shopify's. This picks the variant that matches the case
 * size and price band, attaches the selling plan for the chosen cadence,
 * and puts it in the cart. Billing, renewals, pausing and cancelling all
 * happen on Shopify's side, which is where they belong: we hold no cards
 * and run no schedule.
 *
 * The choices also travel as line attributes, so the packing bench knows
 * what to put in the case without looking anything up.
 */

export type ClubActionResult = { ok: true } | { ok: false; message: string }

export async function joinWineClubAction(selection: ClubSelection): Promise<ClubActionResult> {
  if (!isClubBuyable()) {
    return {
      ok: false,
      message:
        'Subscriptions are not switched on for the shop yet. Nothing has been charged and nothing has been added.',
    }
  }

  const { cadence, size, band, style } = resolve(selection)

  const product = await getProduct(CLUB_PRODUCT_HANDLE)
  if (!product) {
    return {
      ok: false,
      message: 'We could not find the club in the shop. Contact us and we will set it up by hand.',
    }
  }

  // One variant per size and band. The variant title is the contract
  // between this code and the Shopify product, so it is matched exactly
  // rather than guessed at.
  const wanted = `${size.bottles} bottles, ${band.label}`
  const variant = product.variants.find((v) => v.title === wanted)
  if (!variant) {
    return {
      ok: false,
      message: `That combination is not set up yet. Try a different case size, or contact us.`,
    }
  }

  const attributes: CartLineAttribute[] = [
    { key: CLUB_ATTRIBUTES.role, value: 'true' },
    { key: CLUB_ATTRIBUTES.size, value: `${size.bottles} bottles` },
    { key: CLUB_ATTRIBUTES.band, value: band.label },
    { key: CLUB_ATTRIBUTES.style, value: style.label },
    { key: CLUB_ATTRIBUTES.cadence, value: cadence.label },
  ]

  try {
    await addLines([
      {
        variantId: variant.id,
        quantity: 1,
        attributes,
        // Shopify bills the recurrence from this.
        sellingPlanId: sellingPlanFor(cadence.id),
      },
    ])
  } catch (error) {
    console.error('[wine-club] could not add the subscription:', error)
    return { ok: false, message: 'That did not go through. Try again, or contact us.' }
  }

  revalidatePath('/cart')
  return { ok: true }
}

/**
 * Selling plan per cadence.
 *
 * The ids come from the store, so they are configuration rather than
 * anything we can derive. Missing ids are a setup problem and are reported
 * as one: see docs/wine-club.md.
 */
function sellingPlanFor(cadenceId: string): string | undefined {
  const map: Record<string, string | undefined> = {
    monthly: process.env.WINE_CLUB_PLAN_MONTHLY,
    quarterly: process.env.WINE_CLUB_PLAN_QUARTERLY,
    'twice-yearly': process.env.WINE_CLUB_PLAN_TWICE_YEARLY,
  }
  return map[cadenceId]
}
