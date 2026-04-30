import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getLatestScan } from '@/lib/firebase/scans'
import { HaircutsClient } from './haircuts-client'

export default async function HaircutsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const latestScan = await getLatestScan(user.id)
  const faceShape = latestScan?.details?.faceShape ?? null

  return <HaircutsClient defaultFaceShape={faceShape} />
}
