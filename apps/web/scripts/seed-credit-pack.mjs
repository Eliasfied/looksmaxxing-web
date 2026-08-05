// Creates the Firestore credit_packs document the RevenueCat webhook needs
// to resolve a one-time purchase into credits.
//
//   node apps/web/scripts/seed-credit-pack.mjs

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

const PACK = {
  id: 'aura_starter_pack',
  credits: 5,
  price: 2.99,
  name: 'Starter Pack',
  revenuecat_product_id: 'aura_starter_pack',
}

initializeApp({ credential: cert(readServiceAccount()) })
const db = getFirestore()

const { id, ...data } = PACK
await db.collection('credit_packs').doc(id).set(data, { merge: true })

console.log(`✓ credit_packs/${id} written:`, data)
process.exit(0)
