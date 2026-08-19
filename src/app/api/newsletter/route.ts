import { NextResponse } from 'next/server'
import { subscribeToNewsletter } from '@/lib/notifications'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let email: unknown
  try {
    const body = (await request.json()) as { email?: unknown }
    email = body.email
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  if (typeof email !== 'string' || !EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'That email address does not look right' }, { status: 400 })
  }

  try {
    await subscribeToNewsletter(email)
  } catch (error) {
    console.error('[newsletter] signup failed:', error)
    return NextResponse.json({ error: 'Could not sign you up' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
