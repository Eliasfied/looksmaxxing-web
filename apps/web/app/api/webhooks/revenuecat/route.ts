import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { applyRevenueCatEvent } from '@/lib/revenuecat-events'

export async function POST(request: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  const header = Buffer.from(request.headers.get('authorization') ?? ''), expected = Buffer.from(secret)
  if (header.length !== expected.length || !timingSafeEqual(header, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let event
  try { event = (await request.json())?.event } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }
  if (event?.type === 'TEST') return NextResponse.json({ ok: true })
  if (!event || !['id', 'type', 'app_user_id', 'product_id'].every(k => typeof event[k] === 'string' && event[k].length > 0 && event[k].length < 256 && !event[k].includes('/'))) return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  if (process.env.NODE_ENV === 'production' && event.environment !== 'PRODUCTION' && process.env.ALLOW_SANDBOX_PAYMENTS !== 'true') return NextResponse.json({ ignored: true })
  try { return NextResponse.json(await applyRevenueCatEvent(adminDb, event)) }
  catch {
    // Let RevenueCat retry a failed grant; acknowledging it would lose payment.
    console.error('[RC Webhook] Failed to process event', event.id, event.type)
    return NextResponse.json({ error: 'Please retry' }, { status: 500 })
  }
}
