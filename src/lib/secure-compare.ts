import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Compares a supplied secret (admin key, dashboard token, preview password)
 * with the expected one in constant time, so the response time says nothing
 * about how much of a guess was right. Both sides are hashed first because
 * timingSafeEqual needs equal lengths, and comparing lengths would leak too.
 *
 * An empty or missing expected value never matches: an unset secret must be
 * a locked door, not an open one.
 */
export function secretsMatch(supplied: string | null | undefined, expected: string | null | undefined): supplied is string {
  if (!expected || !supplied) return false
  const a = createHash('sha256').update(supplied).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}
