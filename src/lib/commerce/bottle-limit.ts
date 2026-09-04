import type { CartLine } from './types'

/**
 * The per-order bottle limit.
 *
 * Kept as pure functions in their own module, with no server-only import,
 * for two reasons: the cart actions and the cart view both need it and must
 * agree, and a rule that decides whether an order can be placed is worth a
 * test rather than being spread across a server action and a component.
 *
 * The limit itself lives in site-config as DELIVERY.maxBottlesPerOrder.
 */

/**
 * Bottles across a set of cart lines.
 *
 * Counts wine and spirit lines, which includes the bottles in a hamper the
 * shopper built, because the builder writes every component as its own cart
 * line. It does NOT count bottles inside a ready made hamper: that is one
 * line of one product and nothing in the cart can see inside it.
 */
export function countBottles(lines: readonly Pick<CartLine, 'isBottle' | 'quantity'>[]): number {
  return lines.reduce((sum, line) => sum + (line.isBottle ? line.quantity : 0), 0)
}

/**
 * Whether adding `wanted` bottles to a cart that already holds `current`
 * would break the limit. A null limit means no limit.
 */
export function exceedsBottleLimit(current: number, wanted: number, max: number | null): boolean {
  if (max === null) return false
  return current + wanted > max
}
