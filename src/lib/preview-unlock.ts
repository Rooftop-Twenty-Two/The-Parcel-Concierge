/**
 * The holding page bypass.
 *
 * Lets the team walk the real site while SITE_COMING_SOON is on, without
 * taking the holding page down for everybody.
 *
 * Two rules this exists to keep:
 *
 * 1. THE PASSWORD IS NEVER IN THE REPOSITORY. It comes from
 *    PREVIEW_PASSWORD. With that unset there is no way in at all, which is
 *    the safe default: a missing variable must not mean an open door.
 * 2. THE CHECK IS NEVER IN THE BROWSER. The form posts to a route handler,
 *    the answer comes back as an httpOnly cookie, and middleware is what
 *    reads it. Nothing a visitor can read or edit decides whether the site
 *    is visible.
 *
 * The cookie holds a digest rather than the password, so a stolen cookie
 * does not hand over a password that may be used somewhere else. No
 * expiry beyond the session and no rotation: this is a curtain over an
 * unlaunched marketing site, not an authentication system, and it should
 * be deleted along with SITE_COMING_SOON at launch.
 */

export const PREVIEW_COOKIE = 'tpc_preview'

/**
 * The value the cookie has to carry. Salted so the digest is specific to
 * this site rather than a lookup of a common password.
 */
export async function previewToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`tpc-preview:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Length-independent comparison, so timing does not leak the token. */
export function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
