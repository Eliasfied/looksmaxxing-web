import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function initAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
    })
  }

  // Fallback: Application Default Credentials (works on Google Cloud / Firebase hosting)
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
}

initAdminApp()

export const adminAuth = getAuth()
export const adminDb = getFirestore()
