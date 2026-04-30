import { adminDb } from './admin'
import { FieldValue } from 'firebase-admin/firestore'

export interface CreditBalance {
  subscription_credits: number
  topup_credits: number
  total_credits: number
}

export async function getCredits(userId: string): Promise<CreditBalance> {
  const snap = await adminDb.collection('credits').doc(userId).get()

  if (!snap.exists) {
    // Auto-create if missing (e.g. legacy user)
    const initial = { subscription_credits: 0, topup_credits: 0 }
    await adminDb.collection('credits').doc(userId).set(initial)
    return { ...initial, total_credits: 0 }
  }

  const data = snap.data()!
  const subscription_credits: number = data.subscription_credits ?? 0
  const topup_credits: number = data.topup_credits ?? 0
  return {
    subscription_credits,
    topup_credits,
    total_credits: subscription_credits + topup_credits,
  }
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
  const balance = await getCredits(userId)

  if (balance.total_credits < amount) {
    return { success: false, remaining: balance.total_credits, error: 'Insufficient credits' }
  }

  // Deduct subscription_credits first, then topup_credits
  const subDeduct = Math.min(amount, balance.subscription_credits)
  const topupDeduct = amount - subDeduct

  const newSubCredits = balance.subscription_credits - subDeduct
  const newTopupCredits = balance.topup_credits - topupDeduct

  const creditType = subDeduct > 0 ? 'subscription' : 'topup'

  const batch = adminDb.batch()

  batch.update(adminDb.collection('credits').doc(userId), {
    subscription_credits: newSubCredits,
    topup_credits: newTopupCredits,
  })

  batch.set(adminDb.collection('credit_transactions').doc(), {
    user_id: userId,
    amount: -amount,
    credit_type: creditType,
    balance_after_subscription: newSubCredits,
    balance_after_topup: newTopupCredits,
    type: 'generation_used',
    description,
    reference_id: referenceId,
    created_at: new Date().toISOString(),
  })

  await batch.commit()

  return { success: true, remaining: newSubCredits + newTopupCredits }
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
