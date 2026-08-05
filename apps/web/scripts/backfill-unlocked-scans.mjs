// One-off migration: marks every pre-existing face scan as unlocked so the new
// paywall does not retroactively lock results users already paid for.
//
//   node apps/web/scripts/backfill-unlocked-scans.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const here = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(here, '../.env.local')

function readServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  }

  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^FIREBASE_SERVICE_ACCOUNT_JSON=(.*)$/)
    if (!match) continue
    let value = match[1].trim()
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1)
    }
    return JSON.parse(value)
  }

  throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON not found in env or ${envPath}`)
}

initializeApp({ credential: cert(readServiceAccount()) })
const db = getFirestore()

const snap = await db.collection('face_scans').get()
const stale = snap.docs.filter(doc => doc.data().unlocked === undefined)

console.log(`${snap.size} scans total, ${stale.length} without an "unlocked" field.`)

for (let i = 0; i < stale.length; i += 400) {
  const batch = db.batch()
  for (const doc of stale.slice(i, i + 400)) {
    batch.update(doc.ref, { unlocked: true })
  }
  await batch.commit()
  console.log(`  committed ${Math.min(i + 400, stale.length)}/${stale.length}`)
}

console.log('✓ Backfill complete.')
process.exit(0)
