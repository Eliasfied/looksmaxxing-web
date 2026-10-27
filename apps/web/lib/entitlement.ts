import { adminDb } from './firebase/admin'
import { appConfig } from './config'

export interface Plan {
  pro: boolean
  planId: string | null
  status: string | null
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
}

// A cancelled subscription keeps Pro until the paid period ends; the
// RevenueCat EXPIRATION event then flips the status to expired.
export function planFromSubscription(sub: Record<string, unknown> | undefined, now = Date.now()): Plan {
  const status = typeof sub?.status === 'string' ? sub.status : null
  const periodEnd = typeof sub?.current_period_end === 'string' ? sub.current_period_end : null
  const end = periodEnd ? Date.parse(periodEnd) : NaN
  const pro =
    (status === 'active' || status === 'cancelled') && (Number.isFinite(end) ? end > now : status === 'active')
  return {
    pro,
    planId: typeof sub?.plan_id === 'string' ? sub.plan_id : null,
    status,
    periodEnd,
    cancelAtPeriodEnd: sub?.cancel_at_period_end === true
  }
}

export async function getPlan(userId: string): Promise<Plan> {
  const doc = await adminDb.collection('subscriptions').doc(userId).get()
  return planFromSubscription(doc.data())
}

export class QuotaExceededError extends Error {
  constructor() {
    super('Daily analysis limit reached. It resets at midnight UTC.')
  }
}

/**
 * Fair-use cap for AI analyses (face scans and tool reports share it).
 * Reserve before calling the model so parallel requests cannot overrun it.
 */
export async function reserveAnalysis(userId: string, now = new Date()) {
  const day = now.toISOString().slice(0, 10)
  const ref = adminDb.collection('usage_daily').doc(`${userId}_${day}`)
  await adminDb.runTransaction(async (tx) => {
    const used = Number((await tx.get(ref)).data()?.analyses) || 0
    if (used >= appConfig.pro.dailyAnalyses) throw new QuotaExceededError()
    tx.set(ref, { userId, day, analyses: used + 1 }, { merge: true })
  })
}

/** Free accounts get a few coach messages to see what Pro feels like. */
export async function reserveFreeCoachMessage(userId: string) {
  const ref = adminDb.collection('users').doc(userId)
  return adminDb.runTransaction(async (tx) => {
    const used = Number((await tx.get(ref)).data()?.coach_free_used) || 0
    if (used >= appConfig.pro.freeCoachMessages) return false
    tx.set(ref, { coach_free_used: used + 1 }, { merge: true })
    return true
  })
}
