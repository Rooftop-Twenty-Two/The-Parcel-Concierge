import { createHmac, timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import {
  TAG_ALL_PRODUCTS,
  TAG_CATALOGUE,
  collectionTag,
  productTag,
} from '@/lib/shopify/cache-tags'
import { COLLECTIONS } from '@/lib/commerce/collections'
import { SHOPIFY_WEBHOOK_SECRET } from '@/lib/shopify/env'

export const runtime = 'nodejs'

/**
 * Shopify webhook receiver, for on-demand revalidation.
 *
 * Subscribe in Shopify to: products/create, products/update, products/delete,
 * inventory_levels/update, collections/update.
 *
 * Tags are per product handle and per collection path, so one product
 * change rebuilds that product and the listings it can appear on, not the
 * whole site.
 *
 * Every request is HMAC verified. An unverified webhook endpoint that
 * triggers rebuilds is a free denial-of-service for anyone who finds the
 * URL.
 */
export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-shopify-hmac-sha256') ?? ''
  const topic = request.headers.get('x-shopify-topic') ?? ''

  if (!SHOPIFY_WEBHOOK_SECRET) {
    console.error('[webhook] SHOPIFY_WEBHOOK_SECRET is not set. Rejecting.')
    return NextResponse.json({ error: 'Webhooks are not configured' }, { status: 503 })
  }

  if (!verify(body, signature)) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
  }

  const revalidated: string[] = []

  function bump(tag: string) {
    revalidateTag(tag)
    revalidated.push(tag)
  }

  switch (topic) {
    case 'products/create':
    case 'products/update':
    case 'products/delete': {
      const handle = typeof payload.handle === 'string' ? payload.handle : null
      if (handle) bump(productTag(handle))
      bump(TAG_ALL_PRODUCTS)
      // A product's tags decide which listings it belongs to, and an update
      // can change them, so every listing it could now appear in or could
      // have just left is revalidated.
      for (const collection of COLLECTIONS) bump(collectionTag(collection.path))
      break
    }

    case 'inventory_levels/update': {
      // The inventory payload carries an inventory_item_id rather than a
      // handle, so there is nothing narrower to invalidate. Listings exclude
      // out-of-stock products, so they all need to know.
      bump(TAG_ALL_PRODUCTS)
      for (const collection of COLLECTIONS) bump(collectionTag(collection.path))
      break
    }

    case 'collections/update': {
      bump(TAG_CATALOGUE)
      for (const collection of COLLECTIONS) bump(collectionTag(collection.path))
      break
    }

    default:
      // Shopify retries anything that is not a 2xx, so an unhandled topic
      // is acknowledged rather than retried forever.
      return NextResponse.json({ ok: true, ignored: topic })
  }

  return NextResponse.json({ ok: true, topic, revalidated: revalidated.length })
}

function verify(body: string, signature: string): boolean {
  const digest = createHmac('sha256', SHOPIFY_WEBHOOK_SECRET).update(body, 'utf8').digest('base64')
  const a = Buffer.from(digest)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
