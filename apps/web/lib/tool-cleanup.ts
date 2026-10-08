import { Timestamp, type Firestore } from 'firebase-admin/firestore'

// The API enforces expiry immediately. This daily job removes expired data
// without requiring Firestore's paid TTL feature.
export async function cleanupExpiredTools(db: Firestore, now = Date.now()) {
  const deleted: Record<string, number> = {}
  for (const name of ['private_tool_reports', 'private_tool_limits']) {
    deleted[name] = 0
    for (let page = 0; page < 10; page++) {
      const candidates = await db.collection(name)
        .where('expiresAt', '<=', Timestamp.fromMillis(now)).limit(100).get()
      if (candidates.empty) break
      const count = await db.runTransaction(async tx => {
        const current = await tx.getAll(...candidates.docs.map(doc => doc.ref))
        let removed = 0
        for (const doc of current) {
          const data = doc.data()
          // Re-read in the transaction: a concurrent claim or purchase may
          // have extended or removed expiry since the query was executed.
          if (data && data.expiresAt?.toMillis() <= now && !data.unlockProof) {
            tx.delete(doc.ref)
            removed++
          }
        }
        return removed
      })
      deleted[name] += count
      if (candidates.size < 100 || count === 0) break
    }
  }
  return deleted
}
