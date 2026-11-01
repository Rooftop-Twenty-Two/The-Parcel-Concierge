import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/**
 * The fulfilment admin's sign-in.
 *
 * The key is typed into a form once, posted to a route handler, and
 * exchanged for an httpOnly cookie scoped to /admin. The cookie carries an
 * HMAC derived from the key rather than the key itself, so changing
 * CORPORATE_ADMIN_KEY signs everybody out.
 *
 * Fails closed: with the variable unset, or shorter than MIN_ADMIN_KEY_LENGTH,
 * nothing matches and the admin stays shut.
 */

export const ADMIN_COOKIE = 'tpc_admin'
export const MIN_ADMIN_KEY_LENGTH = 16
/** Twelve hours: a working day at the bench, then sign in again. */
export const ADMIN_SESSION_SECONDS = 60 * 60 * 12

/** The configured key, or null when it is missing or too short to use. */
export function configuredAdminKey(): string | null {
  const key = process.env.CORPORATE_ADMIN_KEY ?? ''
  return key.length >= MIN_ADMIN_KEY_LENGTH ? key : null
}

/** Constant-time string comparison. Hashing first gives equal lengths. */
function safeEqual(a: string, b: string): boolean {
  const da = createHash('sha256').update(a).digest()
  const db = createHash('sha256').update(b).digest()
  return timingSafeEqual(da, db)
}

/** Whether a submitted key is the configured one. */
export function adminKeyMatches(candidate: string | null | undefined): boolean {
  const expected = configuredAdminKey()
  if (!expected || !candidate) return false
  return safeEqual(candidate, expected)
}

/** The cookie value a signed-in browser carries for the given key. */
export function adminSessionValue(key: string): string {
  return createHmac('sha256', key).update('tpc-admin-session').digest('hex')
}

/** Whether a cookie value is a current admin session. */
export function adminSessionValid(cookieValue: string | null | undefined): boolean {
  const expected = configuredAdminKey()
  if (!expected || !cookieValue) return false
  return safeEqual(cookieValue, adminSessionValue(expected))
}
