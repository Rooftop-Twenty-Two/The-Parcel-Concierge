#!/usr/bin/env node
/**
 * Generates src/generated/redirects.json from data/redirects/redirects.csv.
 *
 * next.config.ts reads the generated file. Redirects are never hand-written
 * in the config: the CSV is the reviewable, diffable source of truth, and
 * generating from it means the config and the client's review copy can
 * never drift apart.
 *
 * Runs as part of `npm run build`, and validates first, so a broken map
 * cannot reach a deploy.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseRedirects } from './parse.ts'

const CSV = join(process.cwd(), 'data/redirects/redirects.csv')
const OUT = join(process.cwd(), 'src/generated/redirects.json')

const { rows, errors } = parseRedirects(CSV)

if (errors.length) {
  console.error(`${errors.length} problem${errors.length === 1 ? '' : 's'} in ${CSV}:`)
  for (const error of errors) console.error(`  ! line ${error.line}: ${error.message}`)
  process.exit(1)
}

const redirects = rows.map((row) => ({
  source: row.source,
  destination: row.destination,
  permanent: row.permanent,
}))

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(redirects, null, 2)}\n`, 'utf8')

console.log(`Wrote ${redirects.length} redirects to ${OUT}`)
console.log(`  ${redirects.filter((r) => r.permanent).length} permanent, ${redirects.filter((r) => !r.permanent).length} temporary`)
