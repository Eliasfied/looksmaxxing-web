import { adminDb } from './admin'
import { creditCycleStart } from '../credit-cycle'

export interface CreditBalance {
  subscription_credits: number
  topup_credits: number
  total_credits: number
}

export async function getCredits(userId: string): Promise<CreditBalance> {
  const creditRef = adminDb.collection('credits').doc(userId)
  const subRef = adminDb.collection('subscriptions').doc(userId)
  return adminDb.runTransaction(async tx => {
    const [snap, subDoc] = await tx.getAll(creditRef, subRef)
    const data = snap.data() ?? {}, sub = subDoc.data()
    let subscription_credits = Math.max(0, Number(data.subscription_credits) || 0)
    const topup_credits = Math.max(0, Number(data.topup_credits) || 0)
    const cycle = sub && ['active', 'cancelled'].includes(sub.status)
      ? creditCycleStart(sub.current_period_start, sub.current_period_end) : null
    const allowance = Number(sub?.monthly_credit_allowance)
    if (cycle !== null && Number.isInteger(allowance) && allowance > 0 &&
      (!data.subscription_credits_reset_at || Date.parse(data.subscription_credits_reset_at) < cycle)) {
      subscription_credits = allowance
      tx.set(creditRef, { subscription_credits, topup_credits, subscription_credits_reset_at: new Date(cycle).toISOString() }, { merge: true })
      tx.set(adminDb.collection('credit_transactions').doc(`monthly-${userId}-${cycle}`), { user_id: userId, amount: allowance, credit_type: 'subscription', type: 'subscription_reset', description: 'Monthly credit allowance', created_at: new Date().toISOString() })
    } else if (sub?.current_period_end && Date.parse(sub.current_period_end) <= Date.now() && subscription_credits > 0) {
      subscription_credits = 0
      tx.set(creditRef, { subscription_credits: 0 }, { merge: true })
    } else if (!snap.exists) tx.set(creditRef, { subscription_credits, topup_credits })
    return { subscription_credits, topup_credits, total_credits: subscription_credits + topup_credits }
  })
}

export interface DeductResult {
  success: boolean
  remaining: number
  error?: string
}

export async function deductCredits(
  userId: string,
  amount: number,
  referenceId: string,
  description: string
): Promise<DeductResult> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Invalid credit amount')
  await getCredits(userId)
  const ref = adminDb.collection('credits').doc(userId)
  return adminDb.runTransaction(async tx => {
    const data = (await tx.get(ref)).data() ?? {}
    const sub = Math.max(0, Number(data.subscription_credits) || 0)
    const topup = Math.max(0, Number(data.topup_credits) || 0)
    if (sub + topup < amount) return { success: false, remaining: sub + topup, error: 'Insufficient credits' }
    const fromSub = Math.min(sub, amount), newSub = sub - fromSub, newTopup = topup - (amount - fromSub)
    tx.update(ref, { subscription_credits: newSub, topup_credits: newTopup })
    tx.set(adminDb.collection('credit_transactions').doc(), {
      user_id: userId, amount: -amount, credit_type: fromSub ? 'subscription' : 'topup',
      balance_after_subscription: newSub, balance_after_topup: newTopup,
      type: 'generation_used', description, reference_id: referenceId, created_at: new Date().toISOString()
    })
    return { success: true, remaining: newSub + newTopup }
  })
}

export async function addTopupCredits(
  userId: string,
  amount: number,
  referenceId: string
): Promise<void> {
  const balance = await getCredits(userId)
  const newTopupCredits = balance.topup_credits + amount

  const batch = adminDb.batch()

  batch.update(adminDb.collection('credits').doc(userId), {
    topup_credits: newTopupCredits,
  })

  batch.set(adminDb.collection('credit_transactions').doc(), {
    user_id: userId,
    amount,
    credit_type: 'topup',
    balance_after_subscription: balance.subscription_credits,
    balance_after_topup: newTopupCredits,
    type: 'topup_purchase',
    description: 'Credit pack purchase',
    reference_id: referenceId,
    created_at: new Date().toISOString(),
  })

  await batch.commit()
}

export async function grantSubscriptionCredits(
  userId: string,
  amount: number,
  planId: string
): Promise<void> {
  const balance = await getCredits(userId)

  const batch = adminDb.batch()

  batch.update(adminDb.collection('credits').doc(userId), {
    subscription_credits: amount,
    subscription_credits_reset_at: new Date().toISOString(),
  })

  batch.set(adminDb.collection('credit_transactions').doc(), {
    user_id: userId,
    amount,
    credit_type: 'subscription',
    balance_after_subscription: amount,
    balance_after_topup: balance.topup_credits,
    type: 'subscription_reset',
    description: `Subscription credits reset for plan ${planId}`,
    reference_id: planId,
    created_at: new Date().toISOString(),
  })

  await batch.commit()
}
