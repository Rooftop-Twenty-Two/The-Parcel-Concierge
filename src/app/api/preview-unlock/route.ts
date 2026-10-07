import { NextResponse } from 'next/server'
import { PREVIEW_COOKIE, previewToken } from '@/lib/preview-unlock'
import { secretsMatch } from '@/lib/secure-compare'

export const runtime = 'nodejs'

/**
 * Unlocks the holding page.
 *
 * A route handler rather than a server action so the form works without
 * JavaScript: the holding page is the one page that has to render for
 * everybody, whatever their browser is doing.
 *
 * The response is a redirect, so a refresh after unlocking does not repost
 * the password.
 */
export async function POST(request: Request) {
  const expected = process.env.PREVIEW_PASSWORD
  const form = await request.formData()
  const password = String(form.get('password') ?? '')
  const home = new URL('/', request.url)

  // No password configured means no way in. A missing variable must never
  // be the same thing as an open door.
  if (!expected || !secretsMatch(password, expected)) {
    const back = new URL('/coming-soon', request.url)
    back.searchParams.set('wrong', '1')
    return NextResponse.redirect(back, { status: 303 })
  }

  const response = NextResponse.redirect(home, { status: 303 })
  response.cookies.set(PREVIEW_COOKIE, await previewToken(expected), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Session length. The curtain goes back up when the browser closes.
  })
  return response
}

/** Locks it again, for testing the holding page without a private window. */
export async function DELETE(request: Request) {
  const response = NextResponse.redirect(new URL('/coming-soon', request.url), { status: 303 })
  response.cookies.delete(PREVIEW_COOKIE)
  return response
}
