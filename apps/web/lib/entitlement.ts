import { adminDb } from './firebase/admin'
import { appConfig } from './config'

export interface Plan {
  /** Every Pro feature is unlocked, by a subscription or by the 30-day plan. */
  pro: boolean
  /** A paid subscription (renewing, or cancelled with time left). */
  subscribed: boolean
  /** The one-time 30-day glow-up plan, if this user ever bought it. */
  glow: GlowAccess | null
  planId: string | null
  status: string | null
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export interface GlowAccess {
  /** Pro features are unlocked by the plan right now. */
  active: boolean
  purchasedAt: string | null
  accessUntil: string
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
    subscribed: pro,
    glow: null,
    planId: typeof sub?.plan_id === 'string' ? sub.plan_id : null,
    status,
    periodEnd,
    cancelAtPeriodEnd: sub?.cancel_at_period_end === true
  }
}

export function glowFromDoc(doc: Record<string, unknown> | undefined, now = Date.now()): GlowAccess | null {
  if (!doc || typeof doc.access_until !== 'string') return null
  const until = Date.parse(doc.access_until)
  return {
    active: Number.isFinite(until) && until > now,
    purchasedAt: typeof doc.purchased_at === 'string' ? doc.purchased_at : null,
    accessUntil: doc.access_until
  }
}

export function combinePlan(
  sub: Record<string, unknown> | undefined,
  glowDoc: Record<string, unknown> | undefined,
  now = Date.now()
): Plan {
  const plan = planFromSubscription(sub, now)
  const glow = glowFromDoc(glowDoc, now)
  return { ...plan, glow, pro: plan.subscribed || Boolean(glow?.active) }
}

export async function getPlan(userId: string): Promise<Plan> {
  const [sub, glow] = await Promise.all([
    adminDb.collection('subscriptions').doc(userId).get(),
    adminDb.collection('glow_plans').doc(userId).get()
  ])
  return combinePlan(sub.data(), glow.data())
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
