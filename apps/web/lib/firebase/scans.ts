import { adminDb } from './admin'

export interface CategoryAnalysis {
  [key: string]: string[]
}

export interface Recommendations {
  boneStructure?: string
  eyeArea?: string
  skinAndHair?: string
  symmetry?: string
  style?: string
  lifestyle?: string
  [key: string]: string | undefined
}

export interface FaceScanDetails {
  faceShape?: string
  strongestFeature?: string
  mainImprovement?: string
}

export interface FaceScan {
  id: string
  userId: string
  createdAt: string
  photoUrl?: string
  overallPslScore: number
  potentialPslScore: number
  gonialAngleScore: number
  midfaceRatioScore: number
  cheekboneScore: number
  canthalTiltScore: number
  upperEyelidScore: number
  ipdScore: number
  skinClarityScore: number
  hairlineScore: number
  symmetryScore: number
  skinType?: string
  confidence?: number
  categoryAnalysis: CategoryAnalysis
  recommendations: Recommendations
  details: FaceScanDetails
  unlocked: boolean
}

export type CreateFaceScanInput = Omit<FaceScan, 'id' | 'createdAt' | 'unlocked'>

export async function createFaceScan(data: CreateFaceScanInput): Promise<FaceScan> {
  const ref = adminDb.collection('face_scans').doc()
  const createdAt = new Date().toISOString()
  const scan = { ...data, createdAt, unlocked: false }
  await ref.set(scan)
  return { ...scan, id: ref.id }
}

export async function countUserScans(userId: string): Promise<number> {
  const snap = await adminDb
    .collection('face_scans')
    .where('userId', '==', userId)
    .count()
    .get()
  return snap.data().count
}

export async function unlockScan(scanId: string): Promise<void> {
  await adminDb.collection('face_scans').doc(scanId).update({ unlocked: true })
}

/**
 * Replaces the paid detail metrics with placeholders. The locked UI only blurs
 * its children, so the real values must never reach the client.
 */
export function redactLockedScan(scan: FaceScan): FaceScan {
  if (scan.unlocked) return scan

  const placeholder = ['Unlock to see your breakdown', 'Unlock to see your breakdown', 'Unlock to see your breakdown']

  return {
    ...scan,
    gonialAngleScore: 62,
    midfaceRatioScore: 69,
    cheekboneScore: 55,
    canthalTiltScore: 61,
    upperEyelidScore: 58,
    ipdScore: 72,
    skinClarityScore: 66,
    hairlineScore: 74,
    symmetryScore: 64,
    categoryAnalysis: Object.fromEntries(
      Object.keys(scan.categoryAnalysis ?? {}).map(key => [key, placeholder])
    ),
    recommendations: Object.fromEntries(
      Object.keys(scan.recommendations ?? {}).map(key => [key, 'Unlock to see your personalized recommendation.'])
    ),
  }
}

export async function getUserScans(userId: string): Promise<FaceScan[]> {
  try {
    const snap = await adminDb
      .collection('face_scans')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FaceScan))
  } catch (err: unknown) {
    // Index still building — return empty list instead of crashing
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('index') || msg.includes('FAILED_PRECONDITION')) {
      console.warn('[getUserScans] Index not ready yet, returning empty list')
      return []
    }
    throw err
  }
}

export async function getScanById(scanId: string): Promise<FaceScan | null> {
  const doc = await adminDb.collection('face_scans').doc(scanId).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as FaceScan
}

export async function getLatestScan(userId: string): Promise<FaceScan | null> {
  try {
    const snap = await adminDb
      .collection('face_scans')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
    if (snap.empty) return null
    const doc = snap.docs[0]
    return { id: doc.id, ...doc.data() } as FaceScan
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('index') || msg.includes('FAILED_PRECONDITION')) {
      console.warn('[getLatestScan] Index not ready yet, returning null')
      return null
    }
    throw err
  }
}
