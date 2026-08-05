import { notFound, redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getScanById, redactLockedScan } from '@/lib/firebase/scans'
import { getCredits } from '@/lib/firebase/credits'
import { ScanDetailClient } from './scan-detail-client'

interface Props {
  params: Promise<{ scanId: string }>
}

export default async function ScanDetailPage({ params }: Props) {
  const { scanId } = await params
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const scan = await getScanById(scanId)
  if (!scan || scan.userId !== user.id) notFound()

  const balance = await getCredits(user.id)

  return <ScanDetailClient scan={redactLockedScan(scan)} availableCredits={balance.total_credits} />
}
