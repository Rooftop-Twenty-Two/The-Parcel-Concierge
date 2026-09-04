'use server'

import { revalidatePath } from 'next/cache'
import { addLines, bottleCount, getCart, removeLines, setCartAttributes, updateLine } from '@/lib/commerce/cart'
import { verifyLines } from '@/lib/commerce'
import { exceedsBottleLimit } from '@/lib/commerce/bottle-limit'
import type { CartLineAttribute } from '@/lib/commerce/types'
import { DELIVERY } from '@/lib/site-config'

/**
 * Cart server actions.
 *
 * Every write verifies stock and price against live Shopify state first.
 * A cached listing page must never be the thing that sells something that
 * is gone, and hampers make that a real risk because their components sell
 * out underneath them.
 *
 * Actions return a result object rather than throwing, so the UI can show
 * the shopper what is wrong instead of an error boundary.
 */

export type CartActionResult =
  | { ok: true; totalQuantity: number }
  | { ok: false; message: string }

const PROBLEM_MESSAGES = {
  'sold-out': (name: string | null) =>
    `${name ?? 'That item'} has just sold out. We have taken it off this order.`,
  'not-enough': (name: string | null, available?: number | null) =>
    `We only have ${available ?? 'a few'} of ${name ?? 'that item'} left. Lower the quantity and try again.`,
  'price-changed': (name: string | null) =>
    `The price of ${name ?? 'that item'} changed while you were on the page. Refresh to see the current price.`,
  missing: () => 'We could not find that product. Refresh the page and try again.',
} as const

/**
 * The per-order bottle limit, enforced server side.
 *
 * The cart page blocks checkout too, but a client-side check is decorative:
 * these actions are the gate, because they are what a cart write goes
 * through however it was triggered.
 */
function overBottleLimit(current: number, wanted: number): string | null {
  const max = DELIVERY.maxBottlesPerOrder
  if (!exceedsBottleLimit(current, wanted, max)) return null
  return `We can only deliver ${max} bottles in one order. There ${
    current === 1 ? 'is' : 'are'
  } already ${current} in your cart, so please split this across two orders or contact us and we will sort it out.`
}

export async function addToCartAction(input: {
  lines: { variantId: string; quantity: number; attributes?: CartLineAttribute[] }[]
  expectedTotalMinor?: number
  /**
   * How many of these lines are bottles. The caller knows the product kind
   * and the cart does not know it until the line is already written, so the
   * count is passed rather than discovered after the fact.
   */
  bottlesAdded?: number
}): Promise<CartActionResult> {
  if (input.bottlesAdded) {
    const blockedByLimit = overBottleLimit(bottleCount(await getCart()), input.bottlesAdded)
    if (blockedByLimit) return { ok: false, message: blockedByLimit }
  }

  const problems = await verifyLines(
    input.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
  )

  const blocking = problems[0]
  if (blocking) {
    const message =
      blocking.reason === 'not-enough'
        ? PROBLEM_MESSAGES['not-enough'](blocking.productTitle, blocking.quantityAvailable)
        : blocking.reason === 'missing'
          ? PROBLEM_MESSAGES.missing()
          : PROBLEM_MESSAGES[blocking.reason](blocking.productTitle)
    return { ok: false, message }
  }

  const cart = await addLines(input.lines)
  revalidatePath('/cart')
  return { ok: true, totalQuantity: cart.totalQuantity }
}

export async function updateLineAction(
  lineId: string,
  quantity: number,
): Promise<CartActionResult> {
  const before = await getCart()
  const line = before?.lines.find((l) => l.id === lineId)
  if (line?.isBottle) {
    // Everything except this line, so raising it is measured against the rest.
    const others = bottleCount(before) - line.quantity
    const blockedByLimit = overBottleLimit(others, quantity)
    if (blockedByLimit) return { ok: false, message: blockedByLimit }
  }

  const cart = await updateLine(lineId, quantity)
  revalidatePath('/cart')
  return { ok: true, totalQuantity: cart.totalQuantity }
}

export async function removeLineAction(lineId: string): Promise<CartActionResult> {
  const cart = await removeLines([lineId])
  revalidatePath('/cart')
  return { ok: true, totalQuantity: cart.totalQuantity }
}

export async function setGiftMessageAction(message: string): Promise<CartActionResult> {
  const trimmed = message.trim().slice(0, 250)
  const attributes: CartLineAttribute[] = trimmed ? [{ key: 'Gift message', value: trimmed }] : []
  const cart = await setCartAttributes(attributes)
  revalidatePath('/cart')
  return { ok: true, totalQuantity: cart.totalQuantity }
}
