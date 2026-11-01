import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  adminKeyMatches,
  adminSessionValid,
  adminSessionValue,
  configuredAdminKey,
} from '../src/lib/corporate/admin-auth.ts'

function withKey(value: string | undefined, run: () => void) {
  const before = process.env.CORPORATE_ADMIN_KEY
  if (value === undefined) delete process.env.CORPORATE_ADMIN_KEY
  else process.env.CORPORATE_ADMIN_KEY = value
  try {
    run()
  } finally {
    if (before === undefined) delete process.env.CORPORATE_ADMIN_KEY
    else process.env.CORPORATE_ADMIN_KEY = before
  }
}

const KEY = 'a-long-enough-test-key'

test('stays shut when the key is unset or too short', () => {
  withKey(undefined, () => {
    assert.equal(configuredAdminKey(), null)
    assert.equal(adminKeyMatches(''), false)
    assert.equal(adminSessionValid(adminSessionValue('')), false)
  })
  withKey('short', () => {
    assert.equal(configuredAdminKey(), null)
    assert.equal(adminKeyMatches('short'), false)
  })
})

test('accepts only the configured key', () => {
  withKey(KEY, () => {
    assert.equal(adminKeyMatches(KEY), true)
    assert.equal(adminKeyMatches(`${KEY}x`), false)
    assert.equal(adminKeyMatches(''), false)
    assert.equal(adminKeyMatches(null), false)
  })
})

test('a session cookie is valid only for the current key', () => {
  const cookie = adminSessionValue(KEY)
  withKey(KEY, () => assert.equal(adminSessionValid(cookie), true))
  withKey(`${KEY}-rotated`, () => assert.equal(adminSessionValid(cookie), false))
  withKey(KEY, () => assert.equal(adminSessionValid('not-a-session'), false))
})
