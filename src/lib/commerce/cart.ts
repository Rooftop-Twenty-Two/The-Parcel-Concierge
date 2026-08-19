import 'server-only'

import { cookies } from 'next/headers'
import { storefront } from '../shopify/client'
import { normaliseCart } from '../shopify/normalise'
import {
  CART_ATTRIBUTES_UPDATE,
  CART_CREATE,
  CART_LINES_ADD,
  CART_LINES_REMOVE,
  CART_LINES_UPDATE,
  CART_QUERY,
} from '../shopify/queries'
import { fixtureCart } from './fixture-cart'
import { isFixtureMode } from './index'
import type { Cart, CartLineAttribute } from './types'

/**
 * Cart handling.
 *
 * The cart lives in Shopify. We hold only its id in a cookie, and we hand
 * off to Shopify hosted checkout with `checkoutUrl`. We do not build a
 * checkout: PCI scope, fraud, Shop Pay, discounts, tax and alcohol delivery
 * restrictions all come free there and none of them are worth rebuilding.
 *
 * Personalisation (gift message, ribbon colour, branded card) travels as
 * cart line attributes so it survives into the Shopify order and the client
 * can actually action it on the packing bench.
 */

const CART_COOKIE = 'tpc_cart'
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export type CartLineInput = {
  variantId: string
  quantity: number
  attributes?: CartLineAttribute[]
}

export async function getCartId(): Promise<string | null> {
  const store = await cookies()
  return store.get(CART_COOKIE)?.value ?? null
}

async function setCartId(id: string): Promise<void> {
  const store = await cookies()
  store.set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE,
  })
}

export async function clearCartId(): Promise<void> {
  const store = await cookies()
  store.delete(CART_COOKIE)
}

type CartMutationResult = { cart: Parameters<typeof normaliseCart>[0] | null; userErrors: { message: string }[] }

function unwrap(result: CartMutationResult, action: string): Cart {
  if (result.userErrors.length) {
    throw new Error(`${action} failed: ${result.userErrors.map((e) => e.message).join('; ')}`)
  }
  if (!result.cart) throw new Error(`${action} returned no cart`)
  return normaliseCart(result.cart)
}

export async function getCart(): Promise<Cart | null> {
  const id = await getCartId()
  if (!id) return null

  if (isFixtureMode()) return fixtureCart.get(id)

  const data = await storefront<{ cart: Parameters<typeof normaliseCart>[0] | null }>({
    query: CART_QUERY,
    variables: { id },
    // Never cache a cart.
    revalidate: false,
  })
  if (!data.cart) {
    // The cart expired or was completed. Drop the cookie so the shopper
    // gets a fresh one rather than a permanently broken cart page.
    await clearCartId()
    return null
  }
  return normaliseCart(data.cart)
}

export async function addLines(lines: CartLineInput[]): Promise<Cart> {
  const id = await getCartId()

  if (isFixtureMode()) {
    const cart = id ? fixtureCart.addLines(id, lines) : fixtureCart.create(lines)
    if (cart.id !== id) await setCartId(cart.id)
    return cart
  }

  const shopifyLines = lines.map((l) => ({
    merchandiseId: l.variantId,
    quantity: l.quantity,
    attributes: l.attributes ?? [],
  }))

  if (!id) {
    const data = await storefront<{ cartCreate: CartMutationResult }>({
      query: CART_CREATE,
      variables: { lines: shopifyLines, attributes: [] },
      revalidate: false,
    })
    const cart = unwrap(data.cartCreate, 'Create cart')
    await setCartId(cart.id)
    return cart
  }

  const data = await storefront<{ cartLinesAdd: CartMutationResult }>({
    query: CART_LINES_ADD,
    variables: { cartId: id, lines: shopifyLines },
    revalidate: false,
  })
  return unwrap(data.cartLinesAdd, 'Add to cart')
}

export async function updateLine(lineId: string, quantity: number): Promise<Cart> {
  const id = await getCartId()
  if (!id) throw new Error('No cart')

  if (quantity <= 0) return removeLines([lineId])

  if (isFixtureMode()) return fixtureCart.updateLine(id, lineId, quantity)

  const data = await storefront<{ cartLinesUpdate: CartMutationResult }>({
    query: CART_LINES_UPDATE,
    variables: { cartId: id, lines: [{ id: lineId, quantity }] },
    revalidate: false,
  })
  return unwrap(data.cartLinesUpdate, 'Update cart')
}

export async function removeLines(lineIds: string[]): Promise<Cart> {
  const id = await getCartId()
  if (!id) throw new Error('No cart')

  if (isFixtureMode()) return fixtureCart.removeLines(id, lineIds)

  const data = await storefront<{ cartLinesRemove: CartMutationResult }>({
    query: CART_LINES_REMOVE,
    variables: { cartId: id, lineIds },
    revalidate: false,
  })
  return unwrap(data.cartLinesRemove, 'Remove from cart')
}

/**
 * Cart-level attributes. Used for the order-wide gift message and for the
 * delivery date the shopper picks, both of which belong to the order rather
 * than to one line.
 */
export async function setCartAttributes(attributes: CartLineAttribute[]): Promise<Cart> {
  const id = await getCartId()
  if (!id) throw new Error('No cart')

  if (isFixtureMode()) return fixtureCart.setAttributes(id, attributes)

  const data = await storefront<{ cartAttributesUpdate: CartMutationResult }>({
    query: CART_ATTRIBUTES_UPDATE,
    variables: { cartId: id, attributes },
    revalidate: false,
  })
  return unwrap(data.cartAttributesUpdate, 'Update cart attributes')
}
