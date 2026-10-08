import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
import { cookies } from 'next/headers'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from './firebase/admin'
import { getSessionUser } from './firebase/server'
import { appConfig } from './config'
import type { ToolReport } from './tool-report'
import { findTool } from './tool-report'
import { getCredits } from './firebase/credits'

export const GUEST_COOKIE = 'aura_tool_guest'
const DAY = 86_400_000
type SealedReport = {
  report: ToolReport
  tool: string
  guestHash: string
  createdAt: number
  source: string
  audience: string
}

function secret() {
  const value = process.env.TOOL_REPORT_SECRET
  if (!value || value.length < 32) throw new Error('Tool previews are not configured yet.')
  return createHash('sha256').update(value).digest()
}
function signature(value: string) {
  return createHmac('sha256', secret()).update(value).digest('hex')
}
function seal(value: SealedReport, id: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', secret(), iv)
  cipher.setAAD(Buffer.from(id))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64')).join('.')
}
function unseal(value: string, id: string): SealedReport {
  const parts = value.split('.').map((part) => Buffer.from(part, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', secret(), parts[0])
  decipher.setAAD(Buffer.from(id))
  decipher.setAuthTag(parts[1])
  return JSON.parse(Buffer.concat([decipher.update(parts[2]), decipher.final()]).toString('utf8'))
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return (
    origin === (process.env.APP_ORIGIN ?? appConfig.brand.appUrl) ||
    (process.env.NODE_ENV !== 'production' && origin === new URL(request.url).origin)
  )
}

export async function guestToken() {
  const cookieStore = await cookies()
  const existing = cookieStore.get(GUEST_COOKIE)?.value
  if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing
  const token = randomBytes(32).toString('hex')
  cookieStore.set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 86400
  })
  return token
}

// Reserve before inference, transactionally, across serverless instances.
// The global limit also bounds spending if an attacker rotates IP addresses.
export async function reservePreview(request: Request, token: string) {
  const now = Date.now(),
    hour = Math.floor(now / 3_600_000),
    day = Math.floor(now / DAY)
  const ip = (
    request.headers.get('x-vercel-forwarded-for') ??
    request.headers.get('x-forwarded-for') ??
    'local'
  )
    .split(',')[0]
    .trim()
  const limits = [
    { id: `ip-${signature(ip)}-${hour}`, max: 6 },
    { id: `guest-${signature(token)}-${day}`, max: 3 },
    {
      id: `global-${day}`,
      max: Math.max(1, Math.min(1000, Number(process.env.DAILY_TOOL_PREVIEW_LIMIT) || 100))
    }
  ]
  await adminDb.runTransaction(async (tx) => {
    const refs = limits.map((limit) => adminDb.collection('private_tool_limits').doc(limit.id))
    const snapshots = await tx.getAll(...refs)
    if (snapshots.some((snap, i) => (snap.data()?.count ?? 0) >= limits[i].max))
      throw new Error('Preview limit reached. Please try again later.')
    refs.forEach((ref, i) =>
      tx.set(ref, {
        count: (snapshots[i].data()?.count ?? 0) + 1,
        expiresAt: Timestamp.fromMillis(now + DAY * 2)
      })
    )
  })
}

export async function saveToolReport(
  tool: string,
  report: ToolReport,
  token: string,
  source: string,
  audience: string
) {
  const id = randomBytes(20).toString('hex')
  const payload: SealedReport = {
    report,
    tool,
    guestHash: signature(token),
    createdAt: Date.now(),
    source,
    audience
  }
  await adminDb
    .collection('private_tool_reports')
    .doc(id)
    .set({
      sealed: seal(payload, id),
      expiresAt: Timestamp.fromMillis(Date.now() + DAY),
      userId: null,
      claimProof: null,
      unlockProof: null
    })
  return id
}

export async function accessReport(id: string) {
  if (!/^[a-f0-9]{40}$/.test(id)) return null
  const ref = adminDb.collection('private_tool_reports').doc(id)
  const doc = await ref.get()
  if (!doc.exists) return null
  const record = doc.data()!
  if (record.expiresAt && record.expiresAt.toMillis() <= Date.now()) return null
  let payload: SealedReport
  try {
    payload = unseal(record.sealed, id)
  } catch {
    return null
  }
  const user = await getSessionUser()
  const owner =
    user && record.userId === user.id && record.claimProof === signature(`claim:${id}:${user.id}`)
  const token = (await cookies()).get(GUEST_COOKIE)?.value
  const guest =
    token &&
    payload.guestHash === signature(token) &&
    Date.now() - payload.createdAt < DAY &&
    !record.claimProof
  if (!owner && !guest) return null
  return {
    ref,
    payload,
    user,
    owner: Boolean(owner),
    unlocked: Boolean(owner && record.unlockProof === signature(`unlock:${id}:${user!.id}`))
  }
}

export async function claimReport(id: string) {
  const access = await accessReport(id)
  if (!access?.user) throw new Error('Sign in to continue')
  if (access.owner) return access
  const userId = access.user.id
  await adminDb.runTransaction(async (tx) => {
    const current = await tx.get(access.ref)
    if (current.data()?.claimProof === signature(`claim:${id}:${userId}`)) return
    if (current.data()?.claimProof) throw new Error('This report already belongs to an account')
    tx.update(access.ref, {
      userId,
      claimProof: signature(`claim:${id}:${userId}`),
      expiresAt: Timestamp.fromMillis(Date.now() + DAY * 7)
    })
    tx.set(
      adminDb.collection('users').doc(userId),
      {
        last_tool_intent: {
          tool: access.payload.tool,
          source: access.payload.source,
          at: new Date().toISOString()
        }
      },
      { merge: true }
    )
  })
  return { ...access, owner: true }
}

export async function listToolReports(userId: string) {
  const snapshot = await adminDb
    .collection('private_tool_reports')
    .where('userId', '==', userId)
    .limit(100)
    .get()
  return snapshot.docs
    .flatMap((doc) => {
      const data = doc.data()
      if (
        data.claimProof !== signature(`claim:${doc.id}:${userId}`) ||
        (data.expiresAt && data.expiresAt.toMillis() <= Date.now())
      )
        return []
      try {
        const payload = unseal(data.sealed, doc.id)
        return [
          {
            id: doc.id,
            name: findTool(payload.tool)?.name ?? 'Tool report',
            createdAt: payload.createdAt,
            unlocked: data.unlockProof === signature(`unlock:${doc.id}:${userId}`)
          }
        ]
      } catch {
        return []
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function unlockToolReport(id: string) {
  const access = await claimReport(id)
  const userId = access.user!.id
  const cost = appConfig.credits.toolReport
  await getCredits(userId)
  const creditRef = adminDb.collection('credits').doc(userId)
  const userRef = adminDb.collection('users').doc(userId)
  await adminDb.runTransaction(async (tx) => {
    const [reportDoc, balanceDoc, userDoc] = await tx.getAll(access.ref, creditRef, userRef)
    if (reportDoc.data()?.unlockProof === signature(`unlock:${id}:${userId}`)) return
    if (userDoc.data()?.has_purchased !== true) throw new Error('PAYMENT_REQUIRED')
    const balance = balanceDoc.data() ?? {}
    const subscription = Math.max(0, Number(balance.subscription_credits) || 0)
    const topup = Math.max(0, Number(balance.topup_credits) || 0)
    if (subscription + topup < cost) throw new Error('PAYMENT_REQUIRED')
    const fromSubscription = Math.min(subscription, cost)
    tx.update(creditRef, {
      subscription_credits: subscription - fromSubscription,
      topup_credits: topup - (cost - fromSubscription)
    })
    tx.update(access.ref, {
      unlockProof: signature(`unlock:${id}:${userId}`),
      unlockedAt: Timestamp.now(),
      expiresAt: FieldValue.delete()
    })
    tx.set(adminDb.collection('credit_transactions').doc(`tool-${id}`), {
      user_id: userId,
      amount: -cost,
      type: 'tool_report_unlock',
      reference_id: id,
      tool: access.payload.tool,
      source: access.payload.source,
      created_at: new Date().toISOString()
    })
    // No photos, facial metrics or report text in funnel analytics.
    tx.set(adminDb.collection('tool_funnel_events').doc(`unlock-${id}`), {
      event: 'report_unlocked',
      userId,
      reportId: id,
      tool: access.payload.tool,
      source: access.payload.source,
      createdAt: new Date().toISOString()
    })
  })
}
