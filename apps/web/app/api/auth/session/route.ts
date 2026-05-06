import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

const SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000 // 5 days
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 5 // 5 days in seconds

/** POST /api/auth/session – exchange a Firebase ID token for a session cookie */
export async function POST(request: Request) {
  let idToken: string
  try {
    const body = await request.json()
    idToken = body.idToken
    if (!idToken) throw new Error('missing idToken')
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  try {
    // Verify the ID token
    const decoded = await adminAuth.verifyIdToken(idToken)

    // Create a long-lived session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    })

    // Create user + credits documents on first sign-in
    const userRef = adminDb.collection('users').doc(decoded.uid)
    const userSnap = await userRef.get()
    let hasPurchased = false
    if (!userSnap.exists) {
      const batch = adminDb.batch()
      batch.set(userRef, {
        email: decoded.email ?? '',
        has_purchased: false,
        created_at: new Date().toISOString(),
      })
      batch.set(adminDb.collection('credits').doc(decoded.uid), {
        subscription_credits: 0,
        topup_credits: 0,
        subscription_credits_reset_at: null,
      })
      await batch.commit()
    } else {
      hasPurchased = userSnap.data()?.has_purchased === true
    }

    const cookieStore = await cookies()
    cookieStore.set('__session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_S,
      path: '/',
    })

    return NextResponse.json({ ok: true, hasPurchased })
  } catch (err) {
    console.error('[Session POST]', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/** DELETE /api/auth/session – clear the session cookie on sign-out */
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('__session')
  return NextResponse.json({ ok: true })
}
