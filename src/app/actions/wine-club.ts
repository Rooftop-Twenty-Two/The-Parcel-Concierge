'use server'

import { revalidatePath } from 'next/cache'
import { getProduct } from '@/lib/commerce'
import { addLines } from '@/lib/commerce/cart'
import type { CartLineAttribute } from '@/lib/commerce/types'
import { wineProfile } from '@/lib/wine-club/profiles'
import {
  BANDS,
  CADENCES,
  CLUB_ATTRIBUTES,
  CLUB_PRODUCT_HANDLE,
  SIZES,
  isClubBuyable,
} from '@/lib/wine-club'

/**
 * Joining the wine club with a personalised box.
 *
 * The recurrence is Shopify's. The subscription line is the club product's
 * variant for the chosen case size and band, with the selling plan for the
 * chosen cadence attached; billing, renewals, pausing and cancelling all
 * happen on Shopify's side, which is where they belong. We hold no cards
 * and run no schedule.
 *
 * The personalisation travels as line attributes: the chosen bottles, the
 * mix, the band and the cadence, so the packing bench builds exactly the
 * box the customer saw without looking anything up.
 *
 * Every bottle handle is re-verified server side against the profiled
 * catalogue. The client's list is a wish, not an instruction.
 */

export type ClubJoinInput = {
  cadenceId: string
  sizeId: string
  bandId: string
  mixLabel: string
  bottleHandles: string[]
}

export type ClubActionResult = { ok: true } | { ok: false; message: string }

export async function joinWineClubAction(input: ClubJoinInput): Promise<ClubActionResult> {
  if (!isClubBuyable()) {
    return {
      ok: false,
      message:
        'Subscriptions are not switched on for the shop yet. Nothing has been charged and nothing has been added.',
    }
  }

  const cadence = CADENCES.find((c) => c.id === input.cadenceId)
  const size = SIZES.find((s) => s.id === input.sizeId)
  const band = BANDS.find((b) => b.id === input.bandId)
  if (!cadence || !size || !band) {
    return { ok: false, message: 'That plan does not exist. Start again from the quiz.' }
  }

  // The chosen bottles, verified against the real list.
  const bottles = input.bottleHandles.slice(0, size.bottles).map((handle) => wineProfile(handle))
  if (bottles.some((b) => b === null)) {
    return {
      ok: false,
      message:
        'One of your wines is no longer on the list. Go back a step and we will offer an alternative.',
    }
  }

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
      message: 'That combination is not set up yet. Try a different case size, or contact us.',
    }
  }

  const attributes: CartLineAttribute[] = [
    { key: CLUB_ATTRIBUTES.role, value: 'true' },
    { key: CLUB_ATTRIBUTES.size, value: `${size.bottles} bottles` },
    { key: CLUB_ATTRIBUTES.band, value: band.label },
    { key: CLUB_ATTRIBUTES.style, value: input.mixLabel.slice(0, 60) },
    { key: CLUB_ATTRIBUTES.cadence, value: cadence.label },
  ]
  bottles.forEach((bottle, index) => {
    attributes.push({ key: `Bottle ${index + 1}`, value: bottle!.title.slice(0, 100) })
  })

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
    'every-two-months': process.env.WINE_CLUB_PLAN_TWO_MONTHLY,
    quarterly: process.env.WINE_CLUB_PLAN_QUARTERLY,
  }
  return map[cadenceId]
}
