import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { grantSubscriptionCredits, addTopupCredits, getCredits } from '@/lib/firebase/credits'

function verifySignature(request: Request): boolean {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[RC Webhook] REVENUECAT_WEBHOOK_SECRET not set – skipping verification')
    return true
  }
  const authHeader = request.headers.get('authorization')
  return authHeader === secret
}

async function getPlanByProductId(productId: string) {
  const snap = await adminDb
    .collection('plans')
    .where('revenuecat_product_id', '==', productId)
    .limit(1)
    .get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() } as { id: string; monthly_credits: number; name: string }
}

async function getCreditPackByProductId(productId: string) {
  const snap = await adminDb
    .collection('credit_packs')
    .where('revenuecat_product_id', '==', productId)
    .limit(1)
    .get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() } as { id: string; credits: number }
}

async function getUserById(appUserId: string) {
  const snap = await adminDb.collection('users').doc(appUserId).get()
  if (!snap.exists) return null
  const data = snap.data()!
  return { id: appUserId, email: data.email as string }
}

export async function POST(request: Request) {
  if (!verifySignature(request)) {
    console.error('[RC Webhook] Invalid signature')
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

  try {
    switch (eventType) {
      case 'INITIAL_PURCHASE': {
        const user = await getUserById(appUserId)
        if (!user) { console.error(`[RC Webhook] User not found: ${appUserId}`); break }

        const plan = await getPlanByProductId(productId)
        if (!plan) { console.error(`[RC Webhook] Plan not found: ${productId}`); break }

        const batch = adminDb.batch()
        batch.update(adminDb.collection('users').doc(user.id), { has_purchased: true })
        batch.set(adminDb.collection('subscriptions').doc(user.id), {
          plan_id: plan.id,
          plan_name: plan.name,
          plan_monthly_credits: plan.monthly_credits,
          revenuecat_customer_id: appUserId,
          status: 'active',
          monthly_credit_allowance: plan.monthly_credits,
          current_period_start: new Date().toISOString(),
          current_period_end: expirationAtMs ? new Date(expirationAtMs).toISOString() : null,
          cancel_at_period_end: false,
        }, { merge: true })
        await batch.commit()

        await grantSubscriptionCredits(user.id, plan.monthly_credits, plan.id)
        console.log(`[RC Webhook] INITIAL_PURCHASE: granted ${plan.monthly_credits} credits to ${user.id}`)
        break
      }

      case 'RENEWAL': {
        const user = await getUserById(appUserId)
        if (!user) { console.error(`[RC Webhook] User not found: ${appUserId}`); break }

        const plan = await getPlanByProductId(productId)
        if (!plan) { console.error(`[RC Webhook] Plan not found: ${productId}`); break }

        await adminDb.collection('subscriptions').doc(user.id).update({
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: expirationAtMs ? new Date(expirationAtMs).toISOString() : null,
          cancel_at_period_end: false,
        })

        await grantSubscriptionCredits(user.id, plan.monthly_credits, plan.id)
        console.log(`[RC Webhook] RENEWAL: reset ${plan.monthly_credits} credits for ${user.id}`)
        break
      }

      case 'CANCELLATION': {
        const user = await getUserById(appUserId)
        if (!user) { console.error(`[RC Webhook] User not found: ${appUserId}`); break }

        await adminDb.collection('subscriptions').doc(user.id).update({
          status: 'cancelled',
          cancel_at_period_end: true,
        })
        console.log(`[RC Webhook] CANCELLATION: marked cancelled for ${user.id}`)
        break
      }

      case 'EXPIRATION': {
        const user = await getUserById(appUserId)
        if (!user) { console.error(`[RC Webhook] User not found: ${appUserId}`); break }

        const balance = await getCredits(user.id)

        const batch = adminDb.batch()
        batch.update(adminDb.collection('subscriptions').doc(user.id), { status: 'expired' })
        batch.update(adminDb.collection('credits').doc(user.id), { subscription_credits: 0 })
        batch.set(adminDb.collection('credit_transactions').doc(), {
          user_id: user.id,
          amount: -balance.subscription_credits,
          credit_type: 'subscription',
          balance_after_subscription: 0,
          balance_after_topup: balance.topup_credits,
          type: 'subscription_reset',
          description: 'Subscription expired — subscription credits forfeited',
          reference_id: productId ?? null,
          created_at: new Date().toISOString(),
        })
        await batch.commit()

        console.log(`[RC Webhook] EXPIRATION: zeroed subscription credits for ${user.id}`)
        break
      }

      case 'NON_RENEWING_PURCHASE':
      case 'NON_SUBSCRIPTION_PURCHASE': {
        const user = await getUserById(appUserId)
        if (!user) { console.error(`[RC Webhook] User not found: ${appUserId}`); break }

        await adminDb.collection('users').doc(user.id).update({ has_purchased: true })

        const pack = await getCreditPackByProductId(productId)
        if (!pack) { console.warn(`[RC Webhook] Unknown credit pack product: ${productId}`); break }

        await addTopupCredits(user.id, pack.credits, productId)
        console.log(`[RC Webhook] NON_SUBSCRIPTION_PURCHASE: added ${pack.credits} topup credits to ${user.id}`)
        break
      }

      default:
        console.log(`[RC Webhook] Unhandled event type: ${eventType}`)
    }
  } catch (err) {
    console.error(`[RC Webhook] Error handling ${eventType}:`, err)
  }

  return NextResponse.json({ ok: true })
}
