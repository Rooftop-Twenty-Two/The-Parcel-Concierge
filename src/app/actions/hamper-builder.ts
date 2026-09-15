'use server'

import { revalidatePath } from 'next/cache'
import { verifyLines } from '@/lib/commerce'
import { addLines, bottleCount, getCart } from '@/lib/commerce/cart'
import { exceedsBottleLimit } from '@/lib/commerce/bottle-limit'
import { DELIVERY } from '@/lib/site-config'
import type { CartLineAttribute } from '@/lib/commerce/types'
import { BOW_LABEL, BOX_OPTIONS, BUNDLE_ATTRIBUTES } from '@/lib/hamper-builder'

/**
 * Adds a built hamper to the cart as a parent line plus component lines.
 *
 * The whole bundle is verified against live Shopify stock before anything
 * is added. A built hamper is the case where a stale page hurts most:
 * the shopper has spent five minutes choosing components, and finding out
 * at checkout that one is gone loses the order.
 *
 * If any component is unavailable we add nothing and say which one. A
 * partial hamper is not what they built.
 */

export type BuilderResult =
  | { ok: true; totalQuantity: number }
  | { ok: false; message: string }

let bundleCounter = 0

function nextBundleId(): string {
  bundleCounter += 1
  // Time plus a counter is enough: the id only has to be unique within one
  // cart, and it is never a security boundary.
  return `bundle-${Date.now().toString(36)}-${bundleCounter.toString(36)}`
}

export async function addBuiltHamperAction(input: {
  boxVariantId: string
  boxId: string
  components: { variantId: string; quantity: number }[]
  giftMessage: string
  /** Variant id of the gift-bow product, when the €1.50 bow was added. */
  bowVariantId?: string | null
  /**
   * How many of the chosen components are bottles. The wizard knows, from
   * the picker items; the cart does not until the lines are written. See
   * DELIVERY.maxBottlesPerOrder.
   */
  bottlesAdded?: number
}): Promise<BuilderResult> {
  const box = BOX_OPTIONS.find((b) => b.id === input.boxId)
  if (!box) return { ok: false, message: 'Pick a box before you add the hamper to your cart.' }

  if (!input.components.length) {
    return { ok: false, message: 'Put at least one thing in the box.' }
  }

  const max = DELIVERY.maxBottlesPerOrder
  if (max !== null && input.bottlesAdded) {
    const already = bottleCount(await getCart())
    if (exceedsBottleLimit(already, input.bottlesAdded, max)) {
      return {
        ok: false,
        message: `We can only deliver ${max} bottles in one order, and this hamper would take you to ${already + input.bottlesAdded}. Take a bottle out, or order in two goes.`,
      }
    }
  }

  const total = input.components.reduce((sum, c) => sum + c.quantity, 0)
  if (total > box.capacity) {
    return {
      ok: false,
      message: `${box.variantTitle} holds ${box.capacity} things. Take ${total - box.capacity} out, or move up a box size.`,
    }
  }

  const problems = await verifyLines([
    { variantId: input.boxVariantId, quantity: 1 },
    ...(input.bowVariantId ? [{ variantId: input.bowVariantId, quantity: 1 }] : []),
    ...input.components,
  ])

  const blocking = problems[0]
  if (blocking) {
    const name = blocking.productTitle ?? 'One of the things in your box'
    const message =
      blocking.reason === 'not-enough'
        ? `We only have ${blocking.quantityAvailable ?? 'a few'} of ${name} left. Lower the quantity and add the hamper again.`
        : blocking.reason === 'price-changed'
          ? `The price of ${name} changed while you were building. Refresh the page to see the current price.`
          : `${name} has just sold out. Swap it for something else and add the hamper again.`
    return { ok: false, message }
  }

  const bundleId = nextBundleId()

  const parentAttributes: CartLineAttribute[] = [
    { key: BUNDLE_ATTRIBUTES.id, value: bundleId },
    { key: BUNDLE_ATTRIBUTES.role, value: 'parent' },
    { key: BUNDLE_ATTRIBUTES.box, value: box.variantTitle },
  ]
  if (input.giftMessage.trim()) {
    parentAttributes.push({
      key: BUNDLE_ATTRIBUTES.giftMessage,
      value: input.giftMessage.trim().slice(0, 250),
    })
  }
  if (input.bowVariantId) {
    parentAttributes.push({ key: BUNDLE_ATTRIBUTES.bow, value: BOW_LABEL })
  }

  const componentAttributes: CartLineAttribute[] = [
    { key: BUNDLE_ATTRIBUTES.id, value: bundleId },
    { key: BUNDLE_ATTRIBUTES.role, value: 'component' },
    // Visible to the customer and on the packing slip, so a component line
    // never reads as a loose item somebody added by accident.
    { key: BUNDLE_ATTRIBUTES.componentOf, value: box.variantTitle },
  ]

  const cart = await addLines([
    { variantId: input.boxVariantId, quantity: 1, attributes: parentAttributes },
    ...(input.bowVariantId
      ? [{ variantId: input.bowVariantId, quantity: 1, attributes: componentAttributes }]
      : []),
    ...input.components.map((component) => ({
      variantId: component.variantId,
      quantity: component.quantity,
      attributes: componentAttributes,
    })),
  ])

  revalidatePath('/cart')
  return { ok: true, totalQuantity: cart.totalQuantity }
}
