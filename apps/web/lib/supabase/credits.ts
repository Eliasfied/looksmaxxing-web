import { createClient } from '@supabase/supabase-js'

// Service role client – bypasses RLS. Never use on the client side.
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface CreditBalance {
  subscription_credits: number
  topup_credits: number
  total_credits: number
}

export async function getCredits(userId: string): Promise<CreditBalance> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('credits')
    .select('subscription_credits, topup_credits, total_credits')
    .eq('user_id', userId)
    .single()

  if (error) throw new Error(`Failed to fetch credits: ${error.message}`)

  return data
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
  const supabase = createServiceClient()

  const balance = await getCredits(userId)

  if (balance.total_credits < amount) {
    return { success: false, remaining: balance.total_credits, error: 'Insufficient credits' }
  }

  // Deduct subscription_credits first, then topup_credits
  let subDeduct = Math.min(amount, balance.subscription_credits)
  let topupDeduct = amount - subDeduct

  const newSubCredits = balance.subscription_credits - subDeduct
  const newTopupCredits = balance.topup_credits - topupDeduct

  const { error: updateError } = await supabase
    .from('credits')
    .update({
      subscription_credits: newSubCredits,
      topup_credits: newTopupCredits,
    })
    .eq('user_id', userId)

  if (updateError) throw new Error(`Failed to deduct credits: ${updateError.message}`)

  // Determine which pool was the primary source for the transaction record
  const creditType = subDeduct > 0 ? 'subscription' : 'topup'

  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    credit_type: creditType,
    balance_after_subscription: newSubCredits,
    balance_after_topup: newTopupCredits,
    type: 'generation_used',
    description,
    reference_id: referenceId,
  })

  return { success: true, remaining: newSubCredits + newTopupCredits }
}

export async function addTopupCredits(
  userId: string,
  amount: number,
  referenceId: string
): Promise<void> {
  const supabase = createServiceClient()

  const balance = await getCredits(userId)
  const newTopupCredits = balance.topup_credits + amount

  const { error: updateError } = await supabase
    .from('credits')
    .update({ topup_credits: newTopupCredits })
    .eq('user_id', userId)

  if (updateError) throw new Error(`Failed to add topup credits: ${updateError.message}`)

  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount,
    credit_type: 'topup',
    balance_after_subscription: balance.subscription_credits,
    balance_after_topup: newTopupCredits,
    type: 'topup_purchase',
    description: `Credit pack purchase`,
    reference_id: referenceId,
  })
}

export async function grantSubscriptionCredits(
  userId: string,
  amount: number,
  planId: string
): Promise<void> {
  const supabase = createServiceClient()

  const balance = await getCredits(userId)

  const { error: updateError } = await supabase
    .from('credits')
    .update({
      subscription_credits: amount,
      subscription_credits_reset_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) throw new Error(`Failed to grant subscription credits: ${updateError.message}`)

  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount,
    credit_type: 'subscription',
    balance_after_subscription: amount,
    balance_after_topup: balance.topup_credits,
    type: 'subscription_reset',
    description: `Subscription credits reset for plan ${planId}`,
    reference_id: planId,
  })
}
