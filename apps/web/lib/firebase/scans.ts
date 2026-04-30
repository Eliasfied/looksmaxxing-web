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
}

export type CreateFaceScanInput = Omit<FaceScan, 'id' | 'createdAt'>

export async function createFaceScan(data: CreateFaceScanInput): Promise<FaceScan> {
  const ref = adminDb.collection('face_scans').doc()
  const createdAt = new Date().toISOString()
  await ref.set({ ...data, createdAt })
  return { ...data, id: ref.id, createdAt }
}

export async function getUserScans(userId: string): Promise<FaceScan[]> {
  const snap = await adminDb
    .collection('face_scans')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get()

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FaceScan))
}

export async function getLatestScan(userId: string): Promise<FaceScan | null> {
  const snap = await adminDb
    .collection('face_scans')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() } as FaceScan
}
