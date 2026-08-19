import { NextResponse } from 'next/server'
import { getCart } from '@/lib/commerce/cart'

export const dynamic = 'force-dynamic'

/**
 * Cart summary for the header badge.
 *
 * This exists so the layout does not have to read the cart cookie. Reading
 * a cookie in the root layout opts every page on the site out of static
 * rendering, which costs far more than one small fetch after hydration.
 */
export async function GET() {
  const cart = await getCart()
  return NextResponse.json(
    { totalQuantity: cart?.totalQuantity ?? 0 },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
