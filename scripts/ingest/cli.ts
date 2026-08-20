#!/usr/bin/env node
/**
 * The Shopify ingest tool.
 *
 * Usage:
 *   npm run ingest -- --input data/catalogue/hampers.json
 *       Dry run. Validates, plans, prints the diff. Writes nothing.
 *
 *   npm run ingest -- --input <file> --write
 *       Same, then applies. Requires the explicit flag.
 *
 *   npm run ingest -- definitions [--write]
 *       Creates the metafield definitions. Run this first against a new
 *       store: a metafield written without a definition is untyped,
 *       invisible in the admin and unreadable by the Storefront API.
 *
 * Rules this tool enforces and cannot be talked out of:
 *   - Dry run is the default. Writing needs --write.
 *   - Idempotent on SKU. Re-running never creates a duplicate.
 *   - Validation blocks: no product with empty allergens, contents or
 *     images is ever written.
 *   - Tags must be in the locked taxonomy. No free tagging.
 *   - Definitions first, then products.
 *   - Every write goes into a run-report CSV so a run can be audited and
 *     rolled back.
 *   - Products are created as DRAFT. Going live is a deliberate step.
 *
 * Environment:
 *   SHOPIFY_STORE_DOMAIN     e.g. the-parcel-concierge.myshopify.com
 *   SHOPIFY_ADMIN_TOKEN      custom app token, server side only
 *   SHOPIFY_API_VERSION      optional, defaults to 2025-07
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { AdminClient } from './admin-client.ts'
import { applyPlan, type WriteRecord } from './apply.ts'
import { applyDefinitions, planDefinitions } from './metafield-definitions.ts'
import { buildPlan, type IngestPlan } from './plan.ts'
import { summarise, validateCatalogue, type Issue } from './validate.ts'
import type { Catalogue } from '../../src/lib/catalogue/schema.ts'

type Args = {
  command: 'ingest' | 'definitions'
  input: string
  write: boolean
  reportDir: string
  /** Plan offline, without contacting Shopify. Useful for validating a file. */
  offline: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    command: argv[0] === 'definitions' ? 'definitions' : 'ingest',
    input: 'data/catalogue/hampers.json',
    write: false,
    reportDir: 'data/ingest-reports',
    offline: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--input' || arg === '-i') args.input = argv[++i] ?? args.input
    else if (arg === '--write') args.write = true
    else if (arg === '--offline') args.offline = true
    else if (arg === '--report-dir') args.reportDir = argv[++i] ?? args.reportDir
  }

  return args
}

function log(message = ''): void {
  console.log(message)
}

function makeClient(): AdminClient {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN ?? ''
  const accessToken = process.env.SHOPIFY_ADMIN_TOKEN ?? ''

  if (!storeDomain || !accessToken) {
    throw new Error(
      'SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN must be set. Run with --offline to validate a file without contacting Shopify.',
    )
  }

  return new AdminClient({
    storeDomain,
    accessToken,
    apiVersion: process.env.SHOPIFY_API_VERSION ?? '2025-07',
    onNotice: (message) => log(`  [throttle] ${message}`),
  })
}

function printIssues(issues: Issue[]): void {
  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')

  if (warnings.length) {
    log()
    log(`Warnings (${warnings.length}). These do not block a write.`)
    for (const issue of warnings.slice(0, 40)) {
      log(`  ~ ${issue.handle} [${issue.field}] ${issue.message}`)
    }
    if (warnings.length > 40) log(`  ... and ${warnings.length - 40} more`)
  }

  if (errors.length) {
    log()
    log(`Errors (${errors.length}). Nothing will be written until these are fixed.`)
    for (const issue of errors) {
      log(`  ! ${issue.handle} [${issue.field}] ${issue.message}`)
    }
  }
}

function printPlan(plan: IngestPlan): void {
  log()
  log('Plan')
  log('----')
  for (const item of plan.products) {
    if (item.action === 'skip') continue
    const fields = item.changes.map((c) => c.field).join(', ')
    log(`  ${item.action.padEnd(6)} ${item.handle.padEnd(42)} ${fields}`)
  }
  const skipped = plan.products.filter((p) => p.action === 'skip')
  if (skipped.length) log(`  skip   ${skipped.length} products already match the store`)

  log()
  log(`  create ${plan.counts.create}   update ${plan.counts.update}   skip ${plan.counts.skip}`)
}

function writeReport(dir: string, records: WriteRecord[]): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const path = join(dir, `ingest-${stamp}.csv`)
  mkdirSync(dirname(path), { recursive: true })

  const header = 'handle,sku,action,status,productId,message,rollbackHint'
  const rows = records.map((record) =>
    [
      record.handle,
      record.sku,
      record.action,
      record.status,
      record.productId ?? '',
      record.message,
      record.rollbackHint,
    ]
      .map(csvCell)
      .join(','),
  )

  writeFileSync(path, [header, ...rows].join('\n') + '\n', 'utf8')
  return path
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

async function runDefinitions(args: Args): Promise<number> {
  const client = makeClient()
  log('Metafield definitions')
  log('---------------------')

  const plans = await planDefinitions(client)
  const toCreate = plans.filter((p) => p.action === 'create')

  for (const plan of plans) {
    log(`  ${plan.action.padEnd(7)} ${plan.definition.namespace}.${plan.definition.key}`)
  }

  log()
  log(`  ${toCreate.length} to create, ${plans.length - toCreate.length} already present.`)

  if (!args.write) {
    log()
    log('Dry run. Nothing was written. Add --write to create them.')
    return 0
  }

  log()
  log('Writing definitions.')
  await applyDefinitions(client, plans, log)
  log('Done.')
  return 0
}

async function runIngest(args: Args): Promise<number> {
  log(`Reading ${args.input}`)
  const catalogue = JSON.parse(readFileSync(args.input, 'utf8')) as Catalogue
  log(`  ${catalogue.products.length} products. Source: ${catalogue.source}`)

  log()
  log('Validating')
  log('----------')
  const issues = validateCatalogue(catalogue)
  const { errors, warnings } = summarise(issues)
  printIssues(issues)

  if (!issues.length) log('  Everything passes.')

  if (errors > 0) {
    log()
    log(`Refusing to continue: ${errors} error${errors === 1 ? '' : 's'}.`)
    log('Fix the input file. There is no flag that skips validation.')
    return 1
  }

  const client = args.offline ? null : makeClient()
  if (!client) {
    log()
    log('Offline. Planning without contacting Shopify, so everything reads as a create.')
  }

  const plan = await buildPlan(client, catalogue)
  printPlan(plan)

  if (!args.write) {
    log()
    log('Dry run. Nothing was written.')
    log('Add --write to apply this plan. The plan is rebuilt at that point, so')
    log('anything that changed in the store in the meantime is picked up.')
    return warnings > 0 ? 0 : 0
  }

  if (!client) {
    log()
    log('Cannot write in offline mode.')
    return 1
  }

  log()
  log('Checking metafield definitions first.')
  const definitionPlans = await planDefinitions(client)
  const missing = definitionPlans.filter((p) => p.action === 'create')
  if (missing.length) {
    log(`  ${missing.length} definitions are missing. Creating them before any product is written.`)
    await applyDefinitions(client, definitionPlans, log)
  } else {
    log('  All present.')
  }

  log()
  log('Writing products.')
  const records = await applyPlan(client, plan, catalogue, log)

  const failed = records.filter((r) => r.status === 'failed')
  const reportPath = writeReport(args.reportDir, records)

  log()
  log(`Run report: ${reportPath}`)
  log(
    `  ${records.filter((r) => r.status === 'ok' && r.action !== 'skip').length} written, ${failed.length} failed, ${records.filter((r) => r.action === 'skip').length} skipped.`,
  )

  if (failed.length) {
    log()
    log('Failures:')
    for (const record of failed) log(`  ! ${record.handle}: ${record.message}`)
    return 1
  }

  log()
  log('Products were created as DRAFT. Publishing is a deliberate step in the Shopify admin,')
  log('and nothing should go live before its redirect row exists and has been tested.')
  return 0
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const code = args.command === 'definitions' ? await runDefinitions(args) : await runIngest(args)
  process.exitCode = code
}

main().catch((error: unknown) => {
  console.error()
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
