import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  adminKeyMatches,
  adminSessionValue,
} from '@/lib/corporate/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Signs the fulfilment admin in. The form on /admin/corporate posts the key
 * here; a match sets the session cookie and redirects back, so a refresh
 * does not repost the key.
 */
export async function POST(request: Request) {
  const form = await request.formData()
  const key = String(form.get('key') ?? '')
  const page = new URL('/admin/corporate', request.url)

  if (!adminKeyMatches(key)) {
    page.searchParams.set('wrong', '1')
    return NextResponse.redirect(page, { status: 303 })
  }

  const response = NextResponse.redirect(page, { status: 303 })
  response.cookies.set(ADMIN_COOKIE, adminSessionValue(key), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: ADMIN_SESSION_SECONDS,
  })
  return response
}
