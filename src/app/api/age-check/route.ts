import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AGE_GATE } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

/**
 * Age verification state and confirmation.
 *
 * GET reports whether the visitor has confirmed. It exists so alcohol pages
 * do not have to read the cookie on the server, which would opt them out of
 * static rendering.
 *
 * POST records a confirmation. The cookie is httpOnly so it cannot be set
 * from client script, which is the minimum bar for something that gates a
 * restricted product.
 *
 * This is a self-declared check, which is the common pattern for online
 * alcohol retail in Ireland and the UK, and it NEEDS LEGAL SIGN-OFF before
 * launch. See docs/build-status.md.
 */
export async function GET() {
  const store = await cookies()
  const confirmed = store.get(AGE_GATE.cookieName)?.value === 'true'
  return NextResponse.json(
    { confirmed },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}

export async function POST() {
  const store = await cookies()
  store.set(AGE_GATE.cookieName, 'true', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AGE_GATE.cookieMaxAge,
  })
  return NextResponse.json({ ok: true })
}
