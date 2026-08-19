import 'server-only'

import { fixtureProduct } from './fixtures'
import { addMoney, multiplyMoney } from './money'
import type { Cart, CartLine, CartLineAttribute } from './types'

/**
 * An in-memory cart, used only in fixture mode.
 *
 * It exists so the add-to-cart, personalisation, bundle and cart-page flows
 * can be reviewed and tested before Shopify access lands. It is deliberately
 * not durable: it lives in the server process and is lost on restart, which
 * is the right trade for a stand-in. In fixture mode `checkoutUrl` points at
 * an internal page that explains why there is no checkout, rather than at a
 * dead Shopify URL.
 */

type FixtureCartState = {
  id: string
  lines: { id: string; variantId: string; quantity: number; attributes: CartLineAttribute[] }[]
  attributes: CartLineAttribute[]
}

const carts = new Map<string, FixtureCartState>()
let counter = 0

function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${counter}`
}

function resolve(variantId: string) {
  const handle = variantId.replace('gid://fixture/ProductVariant/', '').replace(/-\d+$/, '')
  const product = fixtureProduct(handle)
  const variant = product?.variants.find((v) => v.id === variantId)
  if (!product || !variant) return null
  return { product, variant }
}

function build(state: FixtureCartState): Cart {
  const lines: CartLine[] = []
  let subtotal = { amountMinor: 0, currencyCode: 'EUR' }
  let containsAlcohol = false

  for (const line of state.lines) {
    const resolved = resolve(line.variantId)
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
    id: state.id,
    checkoutUrl: '/checkout-unavailable',
    totalQuantity: state.lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal,
    lines,
    containsAlcohol,
  }
}

function mustGet(id: string): FixtureCartState {
  const state = carts.get(id)
  if (!state) throw new Error('Cart not found')
  return state
}

export const fixtureCart = {
  get(id: string): Cart | null {
    const state = carts.get(id)
    return state ? build(state) : null
  },

  create(lines: { variantId: string; quantity: number; attributes?: CartLineAttribute[] }[]): Cart {
    const state: FixtureCartState = { id: nextId('gid://fixture/Cart'), lines: [], attributes: [] }
    carts.set(state.id, state)
    return this.addLines(state.id, lines)
  },

  addLines(
    id: string,
    lines: { variantId: string; quantity: number; attributes?: CartLineAttribute[] }[],
  ): Cart {
    const state = mustGet(id)
    for (const line of lines) {
      const attributes = line.attributes ?? []
      // Lines merge only when their attributes match. Two hampers with
      // different gift messages are two lines, not one with quantity two.
      const key = JSON.stringify(attributes)
      const existing = state.lines.find(
        (l) => l.variantId === line.variantId && JSON.stringify(l.attributes) === key,
      )
      if (existing) {
        existing.quantity += line.quantity
      } else {
        state.lines.push({
          id: nextId('gid://fixture/CartLine'),
          variantId: line.variantId,
          quantity: line.quantity,
          attributes,
        })
      }
    }
    return build(state)
  },

  updateLine(id: string, lineId: string, quantity: number): Cart {
    const state = mustGet(id)
    const line = state.lines.find((l) => l.id === lineId)
    if (line) line.quantity = quantity
    return build(state)
  },

  removeLines(id: string, lineIds: string[]): Cart {
    const state = mustGet(id)
    state.lines = state.lines.filter((l) => !lineIds.includes(l.id))
    return build(state)
  },

  setAttributes(id: string, attributes: CartLineAttribute[]): Cart {
    const state = mustGet(id)
    state.attributes = attributes
    return build(state)
  },
}
