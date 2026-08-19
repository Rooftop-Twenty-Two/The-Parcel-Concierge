import 'server-only'

import { fixtureProduct } from './fixtures'
import { addMoney, multiplyMoney } from './money'
import type { Cart, CartLine, CartLineAttribute } from './types'

/**
 * The fixture cart, held entirely in a cookie.
 *
 * Used only in fixture mode. It exists so the add-to-cart, personalisation,
 * bundle and cart-page flows can be reviewed and tested before Shopify
 * access lands.
 *
 * It lives in a cookie rather than in server memory, and that is the whole
 * point. A module-level Map does not work here for two separate reasons:
 *
 *   1. Next.js compiles server actions, route handlers and pages into
 *      separate bundles, each with its own copy of a module, so the action
 *      and /api/cart would not share a store.
 *   2. On a serverless host every request can land on a different instance,
 *      so anything held in memory is gone by the next click. A preview
 *      deploy whose cart empties at random is worse than no preview.
 *
 * The cookie holds only what cannot be derived: variant ids, quantities and
 * the personalisation the shopper typed. Prices, titles and images are
 * resolved from the catalogue on read, so a cookie can never disagree with
 * the product data.
 *
 * On a real store none of this runs: the cart lives in Shopify and we hold
 * only its id.
 */

export const FIXTURE_CART_COOKIE = 'tpc_cart_fixture'

/**
 * Cookies are capped around 4KB by every browser. Personalisation is capped
 * well below that per line, but a long enough basket could still overflow,
 * and a silently truncated cookie is a corrupted cart. We refuse the write
 * instead and tell the shopper.
 */
export const MAX_COOKIE_BYTES = 3500

type FixtureLine = {
  /** Stable within a cart, so update and remove can address a line. */
  id: string
  variantId: string
  quantity: number
  attributes: CartLineAttribute[]
}

export type FixtureCartState = {
  lines: FixtureLine[]
  attributes: CartLineAttribute[]
  /** Monotonic, so a removed line's id is never reused within one cart. */
  seq: number
}

export function emptyState(): FixtureCartState {
  return { lines: [], attributes: [], seq: 0 }
}

export function decodeState(raw: string | undefined): FixtureCartState {
  if (!raw) return emptyState()
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown
    if (!parsed || typeof parsed !== 'object') return emptyState()
    const candidate = parsed as Partial<FixtureCartState>
    if (!Array.isArray(candidate.lines)) return emptyState()
    return {
      lines: candidate.lines.filter(isLine),
      attributes: Array.isArray(candidate.attributes) ? candidate.attributes.filter(isAttribute) : [],
      seq: typeof candidate.seq === 'number' ? candidate.seq : candidate.lines.length,
    }
  } catch {
    // A corrupt or tampered cookie starts an empty cart rather than throwing.
    // The shopper loses a basket; they do not get a 500 on every page.
    return emptyState()
  }
}

export function encodeState(state: FixtureCartState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url')
}

function isLine(value: unknown): value is FixtureLine {
  if (!value || typeof value !== 'object') return false
  const line = value as Partial<FixtureLine>
  return (
    typeof line.id === 'string' &&
    typeof line.variantId === 'string' &&
    typeof line.quantity === 'number' &&
    line.quantity > 0 &&
    Array.isArray(line.attributes) &&
    line.attributes.every(isAttribute)
  )
}

function isAttribute(value: unknown): value is CartLineAttribute {
  if (!value || typeof value !== 'object') return false
  const attribute = value as Partial<CartLineAttribute>
  return typeof attribute.key === 'string' && typeof attribute.value === 'string'
}

function resolve(variantId: string) {
  const handle = variantId.replace('gid://fixture/ProductVariant/', '').replace(/-\d+$/, '')
  const product = fixtureProduct(handle)
  const variant = product?.variants.find((v) => v.id === variantId)
  if (!product || !variant) return null
  return { product, variant }
}

/** Turns stored state into the Cart shape the components render. */
export function buildCart(state: FixtureCartState): Cart {
  const lines: CartLine[] = []
  let subtotal = { amountMinor: 0, currencyCode: 'EUR' }
  let containsAlcohol = false

  for (const line of state.lines) {
    const resolved = resolve(line.variantId)
    // A line whose product left the catalogue is dropped rather than
    // rendered as a blank row.
    if (!resolved) continue
    const { product, variant } = resolved
    const lineTotal = multiplyMoney(variant.price, line.quantity)
    subtotal = addMoney(subtotal, lineTotal)
    if (product.tags.includes('type:wine') || product.tags.includes('type:spirit')) {
      containsAlcohol = true
    }
    if (product.hamper?.containsAlcohol) containsAlcohol = true

    lines.push({
      id: line.id,
      quantity: line.quantity,
      merchandiseId: variant.id,
      productHandle: product.handle,
      productTitle: product.title,
      variantTitle: variant.title === 'Default Title' ? null : variant.title,
      image: product.images[0] ?? null,
      unitPrice: variant.price,
      lineTotal,
      attributes: line.attributes,
    })
  }

  return {
    id: 'fixture-cart',
    // In fixture mode there is no Shopify checkout to hand off to, so this
    // points at a page that explains why rather than at a dead URL.
    checkoutUrl: '/checkout-unavailable',
    totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal,
    lines,
    containsAlcohol,
  }
}

// ---------------------------------------------------------------------------
// State transitions. All pure: they take state and return new state, and the
// caller owns the cookie.
// ---------------------------------------------------------------------------

export function addLinesTo(
  state: FixtureCartState,
  lines: { variantId: string; quantity: number; attributes?: CartLineAttribute[] }[],
): FixtureCartState {
  const next: FixtureCartState = {
    lines: state.lines.map((l) => ({ ...l })),
    attributes: state.attributes,
    seq: state.seq,
  }

  for (const line of lines) {
    const attributes = line.attributes ?? []
    // Lines merge only when their attributes match. Two hampers with
    // different gift messages are two lines, not one with quantity two.
    const key = JSON.stringify(attributes)
    const existing = next.lines.find(
      (l) => l.variantId === line.variantId && JSON.stringify(l.attributes) === key,
    )
    if (existing) {
      existing.quantity += line.quantity
    } else {
      next.seq += 1
      next.lines.push({
        id: `line-${next.seq}`,
        variantId: line.variantId,
        quantity: line.quantity,
        attributes,
      })
    }
  }

  return next
}

export function updateLineIn(
  state: FixtureCartState,
  lineId: string,
  quantity: number,
): FixtureCartState {
  return {
    ...state,
    lines: state.lines.flatMap((line) =>
      line.id === lineId ? (quantity > 0 ? [{ ...line, quantity }] : []) : [line],
    ),
  }
}

export function removeLinesFrom(state: FixtureCartState, lineIds: string[]): FixtureCartState {
  return { ...state, lines: state.lines.filter((line) => !lineIds.includes(line.id)) }
}

export function setAttributesOn(
  state: FixtureCartState,
  attributes: CartLineAttribute[],
): FixtureCartState {
  return { ...state, attributes }
}
