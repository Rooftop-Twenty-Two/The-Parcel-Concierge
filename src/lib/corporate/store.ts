import 'server-only'

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Campaign } from './types'
import { redisConfig, redisStore, type CampaignStore } from './redis-store'

export type { CampaignStore }

/**
 * Where campaigns live.
 *
 * Three backends behind one interface, picked by environment:
 *
 *   - Redis over Upstash's REST API, when its credentials are set. This is
 *     production: the site is hosted on Vercel, whose functions have no
 *     writable disk, and Upstash is the Redis Vercel offers under Storage.
 *     Connecting it to the project sets KV_REST_API_URL and
 *     KV_REST_API_TOKEN (UPSTASH_REDIS_REST_URL / _TOKEN also work). Plain
 *     fetch, so no client library. Reads are strongly consistent.
 *   - On Netlify, Netlify Blobs: durable and zero configuration there.
 *   - Everywhere else (local dev, tests), a JSON file under .data/. The
 *     file is gitignored; in-memory alone was proven wrong by the fixture
 *     cart, which lost state across serverless instances. On Vercel with
 *     no Redis configured it is not used: its writes would fail or vanish
 *     with the function instance. Saves fail loudly there instead.
 *
 * The interface is the seam for the real database later (the brief
 * suggests Postgres): swap the implementation, keep every caller.
 *
 * Concurrency: writes are read-modify-write on one document. Two
 * recipients confirming in the same instant could race; the redemption
 * check runs again inside the write path to keep the one-gift-per-email
 * promise, and true row-level safety arrives with the database. Documented
 * in docs/corporate-gifting.md.
 */

// ---------------------------------------------------------------------------
// Netlify Blobs backend.
// ---------------------------------------------------------------------------

function blobsAvailable(): boolean {
  // Netlify's runtime injects these for functions; their presence is the
  // signal that getStore() will actually work.
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT)
}

async function blobsStore(): Promise<CampaignStore> {
  const { getStore } = await import('@netlify/blobs')
  const store = getStore({ name: 'corporate-campaigns', consistency: 'strong' })

  async function get(id: string): Promise<Campaign | null> {
    const raw = await store.get(`campaign/${id}`, { type: 'json' })
    return (raw as Campaign | null) ?? null
  }

  return {
    get,
    async getBySlug(slug) {
      const id = (await store.get(`slug/${slug}`, { type: 'text' })) as string | null
      if (!id) return null
      return get(id)
    },
    async list() {
      const { blobs } = await store.list({ prefix: 'campaign/' })
      const campaigns = await Promise.all(
        blobs.map(async (b) => (await store.get(b.key, { type: 'json' })) as Campaign | null),
      )
      return campaigns.filter((c): c is Campaign => c !== null)
    },
    async save(campaign) {
      await store.setJSON(`campaign/${campaign.id}`, campaign)
      await store.set(`slug/${campaign.slug}`, campaign.id)
    },
  }
}

// ---------------------------------------------------------------------------
// Local file backend.
// ---------------------------------------------------------------------------

const FILE_PATH = join(process.cwd(), '.data', 'corporate-campaigns.json')

function readFile(): Record<string, Campaign> {
  try {
    return JSON.parse(readFileSync(FILE_PATH, 'utf8')) as Record<string, Campaign>
  } catch {
    return {}
  }
}

function fileStore(): CampaignStore {
  return {
    async get(id) {
      return readFile()[id] ?? null
    },
    async getBySlug(slug) {
      return Object.values(readFile()).find((c) => c.slug === slug) ?? null
    },
    async list() {
      return Object.values(readFile())
    },
    async save(campaign) {
      const all = readFile()
      all[campaign.id] = campaign
      mkdirSync(dirname(FILE_PATH), { recursive: true })
      writeFileSync(FILE_PATH, JSON.stringify(all, null, 2))
    },
  }
}

// ---------------------------------------------------------------------------
// Vercel with no Redis connected.
// ---------------------------------------------------------------------------

const NOT_CONFIGURED =
  '[corporate store] No campaign storage on Vercel. Connect Upstash Redis under the ' +
  "project's Storage tab (it sets KV_REST_API_URL and KV_REST_API_TOKEN) and redeploy."

/**
 * Reads find nothing, so a gift link shows its not-found page rather than
 * a server error, and a save fails loudly with what to do about it. The
 * file backend would accept the save and lose it with the instance.
 */
function unconfiguredStore(): CampaignStore {
  return {
    async get() {
      console.error(NOT_CONFIGURED)
      return null
    },
    async getBySlug() {
      console.error(NOT_CONFIGURED)
      return null
    },
    async list() {
      console.error(NOT_CONFIGURED)
      return []
    },
    async save() {
      throw new Error(NOT_CONFIGURED)
    },
  }
}

// ---------------------------------------------------------------------------

let cached: CampaignStore | null = null

export async function campaignStore(): Promise<CampaignStore> {
  if (cached) return cached
  const redis = redisConfig()
  if (redis) cached = redisStore(redis)
  else if (blobsAvailable()) cached = await blobsStore()
  else if (process.env.VERCEL) cached = unconfiguredStore()
  else cached = fileStore()
  return cached
}
