import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/server'
import { adminDb } from '@/lib/firebase/admin'

const ALLOWED_KEYS = ['gender', 'age', 'goal', 'concern', 'experience', 'timeBudget'] as const

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const answers: Record<string, string> = {}
  for (const key of ALLOWED_KEYS) {
    const value = body[key]
    if (typeof value === 'string' && value.length <= 100) answers[key] = value
  }

  await adminDb.collection('users').doc(user.id).set(
    { onboarding: { ...answers, completed_at: new Date().toISOString() } },
    { merge: true }
  )

  return NextResponse.json({ ok: true })
}
