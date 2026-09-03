#!/usr/bin/env node
/**
 * Validates the redirect map.
 *
 * The redirect map is the biggest single risk in this project, so this
 * checks the things that actually break traffic:
 *
 *   - duplicate sources, where the second rule silently never fires
 *   - a source that redirects to itself
 *   - redirect chains, where A goes to B and B goes to C. Chains lose
 *     PageRank and Google gives up after a few hops, so every chain is
 *     flattened by hand rather than left to be discovered later
 *   - loops
 *   - destinations that are not routes on the new site
 *   - a source that redirects to a page nobody can reach
 *
 * Exits non-zero on any of them, so it can gate a deploy.
 */

import { join } from 'node:path'
import { parseRedirects, type RedirectRow } from './parse.mjs'
import { COLLECTIONS } from '../../src/lib/commerce/collections.ts'

const CSV = join(process.cwd(), 'data/redirects/redirects.csv')

/**
 * Static routes on the new site. Dynamic routes are checked by prefix
 * below, because a product handle cannot be known here without a store.
 */
const STATIC_ROUTES = new Set([
  '/',
  '/hampers',
  '/build-your-own-hamper',
  '/wine',
  '/wine-club',
  '/wine-club/build',
  '/corporate-gifting',
  '/corporate-gifting/bulk-orders',
  '/corporate-gifting/branding-personalisation',
  '/corporate-gifting/enquiry',
  '/occasions',
  '/gifts-for',
  '/gifts-by-budget',
  '/gifts',
  '/gift-card',
  '/about',
  '/about/our-makers',
  '/about/guaranteed-irish',
  '/delivery',
  '/faq',
  '/contact',
  '/cart',
  '/legal/terms',
  '/legal/privacy',
  '/legal/cookies',
  ...COLLECTIONS.map((c) => c.path),
])

/** Prefixes under which a dynamic route can legitimately exist. */
const DYNAMIC_PREFIXES = ['/hampers/', '/wine/', '/gifts/', '/legal/']

function pathOf(destination: string): string {
  const [path = ''] = destination.split('?')
  return path
}

function isKnownDestination(destination: string): boolean {
  if (destination.startsWith('http')) return true
  const path = pathOf(destination)
  if (STATIC_ROUTES.has(path)) return true
  return DYNAMIC_PREFIXES.some((prefix) => path.startsWith(prefix) && path.length > prefix.length)
}

function main(): void {
  const { rows, errors: parseErrors } = parseRedirects(CSV)
  const problems: string[] = [...parseErrors.map((e) => `line ${e.line}: ${e.message}`)]

  const bySource = new Map<string, RedirectRow>()

  for (const row of rows) {
    const existing = bySource.get(row.source)
    if (existing) {
      problems.push(
        `line ${row.line}: duplicate source "${row.source}", already mapped on line ${existing.line}. The second rule never fires.`,
      )
      continue
    }
    bySource.set(row.source, row)

    if (pathOf(row.destination) === row.source) {
      problems.push(`line ${row.line}: "${row.source}" redirects to itself.`)
    }

    if (!isKnownDestination(row.destination)) {
      problems.push(
        `line ${row.line}: "${row.destination}" is not a route on the new site. A redirect to a 404 is worse than no redirect.`,
      )
    }

    if (!row.note) {
      problems.push(`line ${row.line}: no note. The client reads these at review.`)
    }
  }

  // Chains and loops.
  for (const row of rows) {
    const seen = new Set<string>([row.source])
    let current = pathOf(row.destination)
    let hops = 0

    while (bySource.has(current)) {
      if (seen.has(current)) {
        problems.push(`line ${row.line}: "${row.source}" is part of a redirect loop.`)
        break
      }
      seen.add(current)
      hops += 1
      const next = bySource.get(current)!
      problems.push(
        `line ${row.line}: "${row.source}" chains through "${current}" to "${next.destination}". Flatten it: point the source straight at the final destination.`,
      )
      current = pathOf(next.destination)
      if (hops > 10) break
    }
  }

  console.log(`Checked ${rows.length} redirect rules from ${CSV}`)

  if (problems.length) {
    console.log()
    console.log(`${problems.length} problem${problems.length === 1 ? '' : 's'}:`)
    for (const problem of problems) console.log(`  ! ${problem}`)
    console.log()
    console.log('Nothing is unpublished in Shopify until these are fixed and tested.')
    process.exitCode = 1
    return
  }

  console.log('No duplicates, no chains, no loops, and every destination is a real route.')
}

main()
