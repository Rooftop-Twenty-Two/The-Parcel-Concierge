/**
 * Tells the header cart badge that the cart just changed.
 *
 * The badge (components/layout/CartCount) lives in the layout, which stays
 * mounted on the same page, so router.refresh() after an add does not
 * re-read it. Anything that changes the cart calls this once the change has
 * landed, and the badge fetches the new count.
 */
export const CART_CHANGED_EVENT = 'tpc:cart-changed'

export function announceCartChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CART_CHANGED_EVENT))
}
