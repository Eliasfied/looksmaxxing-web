const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/load-ts.cjs')
const { cleanupExpiredTools } = loadTs('apps/web/lib/tool-cleanup.ts')

test('cleanup rechecks expiry and preserves reports claimed or unlocked after its query', async () => {
  const deleted = []
  const records = [
    { expiresAt: { toMillis: () => 1 } },
    { expiresAt: { toMillis: () => 5000 } },
    { unlockProof: 'paid' },
    { expiresAt: { toMillis: () => 1 }, unlockProof: 'paid' }
  ]
  const db = {
    collection: name => ({ where: () => ({ limit: () => ({ get: async () => ({
      empty: name !== 'private_tool_reports', size: 4,
      docs: records.map((_, id) => ({ ref: { id } }))
    }) }) }) }),
    runTransaction: async fn => fn({
      getAll: async (...refs) => refs.map(ref => ({ ref, data: () => records[ref.id] })),
      delete: ref => deleted.push(ref.id)
    })
  }
  const result = await cleanupExpiredTools(db, 1000)
  assert.deepEqual(deleted, [0])
  assert.equal(result.private_tool_reports, 1)
})

test('cleanup rejects requests without the cron bearer secret', async () => {
  let called = false
  const { GET } = loadTs('apps/web/app/api/cron/tool-cleanup/route.ts', {
    '@/lib/firebase/admin': { adminDb: {} },
    '@/lib/tool-cleanup': { cleanupExpiredTools: async () => { called = true; return {} } }
  })
  const previous = process.env.CRON_SECRET
  try {
    delete process.env.CRON_SECRET
    assert.equal((await GET(new Request('https://example.com'))).status, 401)
    process.env.CRON_SECRET = 'test-secret'
    assert.equal((await GET(new Request('https://example.com', { headers: { authorization: 'Bearer wrong' } }))).status, 401)
    assert.equal(called, false)
    assert.equal((await GET(new Request('https://example.com', { headers: { authorization: 'Bearer test-secret' } }))).status, 200)
    assert.equal(called, true)
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  }
})
