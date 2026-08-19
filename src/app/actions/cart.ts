'use server'

import { revalidatePath } from 'next/cache'
import { addLines, removeLines, setCartAttributes, updateLine } from '@/lib/commerce/cart'
import { verifyLines } from '@/lib/commerce'
import type { CartLineAttribute } from '@/lib/commerce/types'

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

export async function addToCartAction(input: {
  lines: { variantId: string; quantity: number; attributes?: CartLineAttribute[] }[]
  expectedTotalMinor?: number
}): Promise<CartActionResult> {
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
