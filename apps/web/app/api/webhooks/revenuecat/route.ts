import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { grantSubscriptionCredits, addTopupCredits } from '@/lib/supabase/credits'

// Service role client for direct DB writes (bypasses RLS)
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// RevenueCat sends the webhook secret in the Authorization header
function verifySignature(request: Request): boolean {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[RC Webhook] REVENUECAT_WEBHOOK_SECRET not set – skipping verification')
    return true
  }
  const authHeader = request.headers.get('authorization')
  return authHeader === secret
}

// Map RevenueCat product_id to credit_packs table
async function getCreditPackByProductId(productId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('credit_packs')
    .select('id, credits')
    .eq('revenuecat_product_id', productId)
    .single()
  return data
}

// Map RevenueCat product_id to our plans table id
async function getPlanByProductId(productId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('plans')
    .select('id, monthly_credits')
    .eq('revenuecat_product_id', productId)
    .single()
  return data
}

// Find our user by RevenueCat app_user_id (we set it to the Supabase user id)
async function getUserByRevenueCatId(appUserId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('id', appUserId)
    .single()
  return data
}

export async function POST(request: Request) {
  if (!verifySignature(request)) {
    console.error('[RC Webhook] Invalid signature')
    // Still return 200 so RevenueCat doesn't keep retrying with a bad secret
    return NextResponse.json({ error: 'Unauthorized' }, { status: 200 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    console.error('[RC Webhook] Failed to parse body')
    return NextResponse.json({ error: 'Bad request' }, { status: 200 })
  }

  const event = body.event as Record<string, unknown> | undefined
  if (!event) {
    console.warn('[RC Webhook] No event in body')
    return NextResponse.json({ ok: true })
  }

  const eventType = event.type as string
  const appUserId = event.app_user_id as string
  const productId = event.product_id as string
  const expirationAtMs = event.expiration_at_ms as number | undefined

  console.log(`[RC Webhook] ${eventType} | user=${appUserId} | product=${productId}`)

  const supabase = createServiceClient()

  try {
    switch (eventType) {
      case 'INITIAL_PURCHASE': {
        const user = await getUserByRevenueCatId(appUserId)
        if (!user) { console.error(`[RC Webhook] User not found: ${appUserId}`); break }

        const plan = await getPlanByProductId(productId)
        if (!plan) { console.error(`[RC Webhook] Plan not found: ${productId}`); break }

        await supabase.from('profiles').update({ has_purchased: true }).eq('id', user.id)

        await supabase.from('subscriptions').upsert({
          user_id: user.id,
          plan_id: plan.id,
          revenuecat_customer_id: appUserId,
          status: 'active',
          monthly_credit_allowance: plan.monthly_credits,
          current_period_start: new Date().toISOString(),
          current_period_end: expirationAtMs ? new Date(expirationAtMs).toISOString() : null,
          cancel_at_period_end: false,
        }, { onConflict: 'user_id' })

        await grantSubscriptionCredits(user.id, plan.monthly_credits, plan.id)
        console.log(`[RC Webhook] INITIAL_PURCHASE: granted ${plan.monthly_credits} credits to ${user.id}`)
        break
      }

      case 'RENEWAL': {
        const user = await getUserByRevenueCatId(appUserId)
        if (!user) { console.error(`[RC Webhook] User not found: ${appUserId}`); break }

        const plan = await getPlanByProductId(productId)
        if (!plan) { console.error(`[RC Webhook] Plan not found: ${productId}`); break }

        await supabase.from('subscriptions')
          .update({
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: expirationAtMs ? new Date(expirationAtMs).toISOString() : null,
            cancel_at_period_end: false,
          })
          .eq('user_id', user.id)

        await grantSubscriptionCredits(user.id, plan.monthly_credits, plan.id)
        console.log(`[RC Webhook] RENEWAL: reset ${plan.monthly_credits} credits for ${user.id}`)
        break
      }

      case 'CANCELLATION': {
        const user = await getUserByRevenueCatId(appUserId)
        if (!user) { console.error(`[RC Webhook] User not found: ${appUserId}`); break }

        await supabase.from('subscriptions')
          .update({ status: 'cancelled', cancel_at_period_end: true })
          .eq('user_id', user.id)

        console.log(`[RC Webhook] CANCELLATION: marked cancelled for ${user.id}`)
        break
      }

      case 'EXPIRATION': {
        const user = await getUserByRevenueCatId(appUserId)
        if (!user) { console.error(`[RC Webhook] User not found: ${appUserId}`); break }

        await supabase.from('subscriptions')
          .update({ status: 'expired' })
          .eq('user_id', user.id)

        const { data: currentCredits } = await supabase
          .from('credits')
          .select('subscription_credits, topup_credits')
          .eq('user_id', user.id)
          .single()

        await supabase.from('credits')
          .update({ subscription_credits: 0 })
          .eq('user_id', user.id)

        await supabase.from('credit_transactions').insert({
          user_id: user.id,
          amount: -(currentCredits?.subscription_credits ?? 0),
          credit_type: 'subscription',
          balance_after_subscription: 0,
          balance_after_topup: currentCredits?.topup_credits ?? 0,
          type: 'subscription_reset',
          description: 'Subscription expired — subscription credits forfeited',
          reference_id: productId ?? null,
        })

        console.log(`[RC Webhook] EXPIRATION: zeroed subscription credits for ${user.id}`)
        break
      }

      case 'NON_RENEWING_PURCHASE':
      case 'NON_SUBSCRIPTION_PURCHASE': {
        const user = await getUserByRevenueCatId(appUserId)
        if (!user) { console.error(`[RC Webhook] User not found: ${appUserId}`); break }

        await supabase.from('profiles').update({ has_purchased: true }).eq('id', user.id)

        const pack = await getCreditPackByProductId(productId)
        if (!pack) { console.warn(`[RC Webhook] Unknown credit pack product: ${productId}`); break }

        await addTopupCredits(user.id, pack.credits, productId)
        console.log(`[RC Webhook] NON_SUBSCRIPTION_PURCHASE: added ${pack.credits} topup credits to ${user.id} (${productId})`)
        break
      }

      default:
        console.log(`[RC Webhook] Unhandled event type: ${eventType}`)
    }
  } catch (err) {
    // Log but always return 200 – RevenueCat retries on non-200
    console.error(`[RC Webhook] Error handling ${eventType}:`, err)
  }

  return NextResponse.json({ ok: true })
}
