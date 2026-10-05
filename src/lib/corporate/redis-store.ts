/**
 * The Redis backend for corporate campaigns, over Upstash's REST API. See
 * store.ts for how a backend is chosen. Kept apart from store.ts, which is
 * server-only, so it can be tested under plain Node.
 */
import type { Campaign } from './types'

export type CampaignStore = {
  get(id: string): Promise<Campaign | null>
  getBySlug(slug: string): Promise<Campaign | null>
  list(): Promise<Campaign[]>
  save(campaign: Campaign): Promise<void>
}

type RedisConfig = { url: string; token: string }

export function redisConfig(env: Record<string, string | undefined> = process.env): RedisConfig | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null
}

const KEY = {
  campaign: (id: string) => `corporate:campaign:${id}`,
  slug: (slug: string) => `corporate:slug:${slug}`,
  index: 'corporate:campaigns',
}

/**
 * Each campaign is one JSON value keyed by id, plus a slug → id key and a
 * set of every id for the admin list. A save writes all three in one
 * MULTI/EXEC transaction, so the index never points at a half-written
 * campaign.
 */
export function redisStore(config: RedisConfig, fetchImpl: typeof fetch = fetch): CampaignStore {
  async function call<T>(path: string, body: unknown): Promise<T> {
    const res = await fetchImpl(`${config.url}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const json = (await res.json().catch(() => null)) as unknown
    if (!res.ok) throw new Error(`[corporate store] Redis ${res.status}: ${JSON.stringify(json)}`)
    return json as T
  }

  async function command<T>(...args: string[]): Promise<T> {
    const { result, error } = await call<{ result: T; error?: string }>('', args)
    if (error) throw new Error(`[corporate store] Redis: ${error}`)
    return result
  }

  function parse(raw: string | null): Campaign | null {
    return raw ? (JSON.parse(raw) as Campaign) : null
  }

  async function get(id: string): Promise<Campaign | null> {
    return parse(await command<string | null>('GET', KEY.campaign(id)))
  }

  return {
    get,
    async getBySlug(slug) {
      const id = await command<string | null>('GET', KEY.slug(slug))
      return id ? get(id) : null
    },
    async list() {
      const ids = await command<string[]>('SMEMBERS', KEY.index)
      if (!ids.length) return []
      const raws = await command<(string | null)[]>('MGET', ...ids.map(KEY.campaign))
      return raws.map(parse).filter((c): c is Campaign => c !== null)
    },
    async save(campaign) {
      const results = await call<{ result?: unknown; error?: string }[]>('/multi-exec', [
        ['SET', KEY.campaign(campaign.id), JSON.stringify(campaign)],
        ['SET', KEY.slug(campaign.slug), campaign.id],
        ['SADD', KEY.index, campaign.id],
      ])
      const failed = results.find((r) => r.error)
      if (failed) throw new Error(`[corporate store] Redis: ${failed.error}`)
    },
  }
}
