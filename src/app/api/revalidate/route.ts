import { timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { TAG_ALL_PRODUCTS, TAG_CATALOGUE, collectionTag } from '@/lib/shopify/cache-tags'
import { COLLECTIONS, MAPPED_COLLECTION_HANDLES } from '@/lib/commerce/collections'

export const runtime = 'nodejs'

/**
 * Manual resync: drop every cached Storefront read so the next request
 * re-reads the live store.
 *
 * The Shopify webhooks are the normal path and keep the site current on
 * their own. This exists for the times they cannot: the webhooks are not
 * subscribed yet, a merchant edit happened while the site was mid-deploy,
 * or the client just wants to see a change now rather than trust it landed.
 *
 *   curl -X POST https://<site>/api/revalidate \
 *     -H "Authorization: Bearer $REVALIDATE_SECRET"
 *
 * Fails closed like the webhook: with no secret configured every request is
 * refused, because an open endpoint that drops the cache is a free
 * denial-of-service for anyone who finds the URL.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? ''
  if (!secret) {
    console.error('[revalidate] REVALIDATE_SECRET is not set. Rejecting.')
    return NextResponse.json({ error: 'Manual revalidation is not configured' }, { status: 503 })
  }

  const presented = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!equal(presented, secret)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const tags = new Set<string>([TAG_ALL_PRODUCTS, TAG_CATALOGUE])
  for (const collection of COLLECTIONS) tags.add(collectionTag(collection.path))
  for (const handle of MAPPED_COLLECTION_HANDLES) tags.add(collectionTag(handle))
  for (const tag of tags) revalidateTag(tag)

  return NextResponse.json({ ok: true, revalidated: tags.size })
}

function equal(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  if (x.length !== y.length) return false
  return timingSafeEqual(x, y)
}
