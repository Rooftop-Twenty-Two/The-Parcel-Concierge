import assert from 'node:assert/strict'
import { test } from 'node:test'
import { redisConfig, redisStore } from '../src/lib/corporate/redis-store.ts'
import type { Campaign } from '../src/lib/corporate/types.ts'

/**
 * The Redis campaign store, against a stand-in for Upstash's REST API that
 * implements just the commands the store sends. Campaigns created on the
 * live site must be readable by id, by slug and in the admin list.
 */

function fakeUpstash() {
  const strings = new Map<string, string>()
  const sets = new Map<string, Set<string>>()
  const calls: string[] = []

  function run(cmd: string[]): unknown {
    const [op, ...args] = cmd
    calls.push(op!)
    switch (op) {
      case 'GET':
        return strings.get(args[0]!) ?? null
      case 'SET':
        strings.set(args[0]!, args[1]!)
        return 'OK'
      case 'MGET':
        return args.map((k) => strings.get(k) ?? null)
      case 'SADD': {
        const set = sets.get(args[0]!) ?? new Set()
        args.slice(1).forEach((m) => set.add(m))
        sets.set(args[0]!, set)
        return args.length - 1
      }
      case 'SMEMBERS':
        return [...(sets.get(args[0]!) ?? [])]
      default:
        throw new Error(`unexpected command ${op}`)
    }
  }

  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer secret')
    const body = JSON.parse(String(init?.body))
    const path = new URL(String(url)).pathname
    const json =
      path === '/multi-exec' ? (body as string[][]).map((c) => ({ result: run(c) })) : { result: run(body) }
    return new Response(JSON.stringify(json), { status: 200 })
  }) as typeof fetch

  return { fetchImpl, calls }
}

function campaign(id: string, slug: string): Campaign {
  return { id, slug, company: { name: `Company ${id}` } } as unknown as Campaign
}

test('redis config reads the Vercel and the Upstash variable names', () => {
  assert.deepEqual(redisConfig({ KV_REST_API_URL: 'https://a.upstash.io/', KV_REST_API_TOKEN: 't' }), {
    url: 'https://a.upstash.io',
    token: 't',
  })
  assert.deepEqual(redisConfig({ UPSTASH_REDIS_REST_URL: 'https://b.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'u' }), {
    url: 'https://b.upstash.io',
    token: 'u',
  })
  assert.equal(redisConfig({ KV_REST_API_URL: 'https://a.upstash.io' }), null)
})

test('a saved campaign reads back by id, by slug and in the list', async () => {
  const { fetchImpl, calls } = fakeUpstash()
  const store = redisStore({ url: 'https://x.upstash.io', token: 'secret' }, fetchImpl)

  assert.equal(await store.get('c1'), null)
  assert.deepEqual(await store.list(), [])

  await store.save(campaign('c1', 'acme-xmas'))
  await store.save(campaign('c2', 'globex'))
  // Saving again updates in place rather than duplicating.
  await store.save({ ...campaign('c1', 'acme-xmas'), status: 'ACTIVE' })

  assert.equal((await store.get('c1'))?.status, 'ACTIVE')
  assert.equal((await store.getBySlug('globex'))?.id, 'c2')
  assert.equal(await store.getBySlug('nope'), null)
  assert.deepEqual((await store.list()).map((c) => c.id).sort(), ['c1', 'c2'])
  assert.ok(calls.includes('SADD'), 'saves go through the transaction endpoint')
})

test('a Redis error is raised, never swallowed', async () => {
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ error: 'WRONGPASS' }), { status: 401 })) as unknown as typeof fetch
  const store = redisStore({ url: 'https://x.upstash.io', token: 'bad' }, fetchImpl)
  await assert.rejects(store.get('c1'), /401/)
})
