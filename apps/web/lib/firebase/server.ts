import { cookies } from 'next/headers'
import { adminAuth } from './admin'

export interface SessionUser {
  id: string
  email: string | undefined
}

/**
 * Reads the __session cookie and verifies it with Firebase Admin.
 * Returns null if the cookie is missing or invalid.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('__session')?.value
  if (!sessionCookie) return null

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    return { id: decoded.uid, email: decoded.email }
  } catch {
    return null
  }
}
