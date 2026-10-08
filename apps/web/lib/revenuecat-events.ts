import { createHash } from 'node:crypto'
import type { Firestore } from 'firebase-admin/firestore'

type Event = Record<string, unknown> & {
  id: string
  type: string
  app_user_id: string
  product_id: string
}
const purchases = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'NON_RENEWING_PURCHASE',
  'NON_SUBSCRIPTION_PURCHASE'
])
const lifecycle = new Set(['CANCELLATION', 'EXPIRATION', 'UNCANCELLATION', 'SUBSCRIPTION_EXTENDED'])
const key = (s: string) => createHash('sha256').update(s).digest('hex')

// Receipt, credits and ledger commit together; concurrent retries cannot double-grant.
export async function applyRevenueCatEvent(db: Firestore, event: Event) {
  if (!purchases.has(event.type) && !lifecycle.has(event.type)) return { ignored: true }
  const isPack =
    event.type === 'NON_RENEWING_PURCHASE' || event.type === 'NON_SUBSCRIPTION_PURCHASE'
  const products = await db
    .collection(isPack ? 'credit_packs' : 'plans')
    .where('revenuecat_product_id', '==', event.product_id)
    .limit(1)
    .get()
  const product = products.docs[0],
    productData = product?.data()
  const amount = Number(isPack ? productData?.credits : productData?.monthly_credits)
  if (purchases.has(event.type) && (!product || !Number.isInteger(amount) || amount <= 0))
    throw new Error('Invalid billing product')
  const receipt = db.collection('revenuecat_events').doc(key(event.id))
  const userRef = db.collection('users').doc(event.app_user_id)
  const balanceRef = db.collection('credits').doc(event.app_user_id)
  const subRef = db.collection('subscriptions').doc(event.app_user_id)
  const occurred = Number(event.event_timestamp_ms)
  if (!Number.isFinite(occurred) || occurred <= 0) throw new Error('Missing event timestamp')
  const purchasedAt = Number(event.purchased_at_ms) || occurred
  const date = new Date(occurred).toISOString()
  const transactionKey =
    typeof event.transaction_id === 'string'
      ? key(`${event.store}:${event.app_user_id}:${event.product_id}:${event.transaction_id}`)
      : key(event.id)
  const purchaseRef = db.collection('billing_purchases').doc(transactionKey)
  return db.runTransaction(async (tx) => {
    const [seen, userDoc, balanceDoc, subscriptionDoc, paidReceipt] = await tx.getAll(
      receipt,
      userRef,
      balanceRef,
      subRef,
      purchaseRef
    )
    if (seen.exists) return { duplicate: true }
    if (!userDoc.exists) throw new Error('Billing user not found')
    const old = balanceDoc.data() ?? {},
      subscription = subscriptionDoc.data() ?? {}
    const sub = Number(old.subscription_credits) || 0,
      topup = Number(old.topup_credits) || 0
    const stale = occurred < (Number(subscription.last_event_at_ms) || 0)
    let nextSub = sub,
      nextTopup = topup
    const purchase = purchases.has(event.type) && !paidReceipt.exists
    if (purchase) {
      if (isPack) nextTopup += amount
      else if (!stale) {
        nextSub = amount
        tx.set(
          subRef,
          {
            plan_id: product!.id,
            plan_name: productData!.name,
            plan_monthly_credits: amount,
            monthly_credit_allowance: amount,
            revenuecat_product_id: event.product_id,
            revenuecat_customer_id: event.app_user_id,
            status: 'active',
            current_period_start: new Date(purchasedAt).toISOString(),
            current_period_end:
              typeof event.expiration_at_ms === 'number'
                ? new Date(event.expiration_at_ms).toISOString()
                : null,
            cancel_at_period_end: false,
            last_event_at_ms: occurred
          },
          { merge: true }
        )
      }
      tx.set(purchaseRef, {
        event_id: event.id,
        user_id: event.app_user_id,
        product_id: event.product_id,
        created_at: date
      })
      const dollars =
        typeof event.price === 'number' && Number.isFinite(event.price) ? event.price : null
      const paid = event.period_type !== 'TRIAL' && (dollars === null || dollars > 0)
      const firstBuyer = paid && userDoc.data()?.has_purchased !== true
      if (paid)
        tx.update(userRef, {
          has_purchased: true,
          ...(firstBuyer ? { first_purchase_at: date } : {})
        })
      tx.set(db.collection('tool_funnel_events').doc(`purchase-${transactionKey}`), {
        event: 'verified_purchase',
        userId: event.app_user_id,
        productId: event.product_id,
        firstBuyer,
        renewal: event.type === 'RENEWAL',
        environment: event.environment ?? 'UNKNOWN',
        lastTool: userDoc.data()?.last_tool_intent?.tool ?? null,
        lastToolSource: userDoc.data()?.last_tool_intent?.source ?? null,
        amountUsd: dollars,
        amount:
          typeof event.price_in_purchased_currency === 'number'
            ? event.price_in_purchased_currency
            : null,
        currency: typeof event.currency === 'string' ? event.currency : null,
        createdAt: date
      })
    } else if (
      !purchases.has(event.type) &&
      !stale &&
      subscriptionDoc.exists &&
      (!subscription.revenuecat_product_id ||
        subscription.revenuecat_product_id === event.product_id)
    ) {
      if (event.type === 'EXPIRATION') {
        nextSub = 0
        tx.update(subRef, { status: 'expired', last_event_at_ms: occurred })
      } else if (
        event.type === 'SUBSCRIPTION_EXTENDED' &&
        typeof event.expiration_at_ms === 'number'
      ) {
        tx.update(subRef, {
          current_period_end: new Date(event.expiration_at_ms).toISOString(),
          last_event_at_ms: occurred
        })
      } else if (event.type === 'CANCELLATION' || event.type === 'UNCANCELLATION') {
        const cancelled = event.type === 'CANCELLATION'
        tx.update(subRef, {
          status: cancelled ? 'cancelled' : 'active',
          cancel_at_period_end: cancelled,
          last_event_at_ms: occurred
        })
      }
    }
    if (nextSub !== sub || nextTopup !== topup) {
      tx.set(
        balanceRef,
        {
          subscription_credits: nextSub,
          topup_credits: nextTopup,
          ...(!isPack && purchase && !stale
            ? { subscription_credits_reset_at: new Date(purchasedAt).toISOString() }
            : {})
        },
        { merge: true }
      )
      tx.set(db.collection('credit_transactions').doc(`rc-${key(event.id)}`), {
        user_id: event.app_user_id,
        amount: nextSub + nextTopup - sub - topup,
        credit_type: isPack ? 'topup' : 'subscription',
        balance_after_subscription: nextSub,
        balance_after_topup: nextTopup,
        type: isPack ? 'topup_purchase' : 'subscription_reset',
        description: `RevenueCat ${event.type}`,
        reference_id: event.product_id,
        created_at: date
      })
    }
    tx.set(receipt, { type: event.type, processed_at: new Date().toISOString() })
    return { ok: true }
  })
}
