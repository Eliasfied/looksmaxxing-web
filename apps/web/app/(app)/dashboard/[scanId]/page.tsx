import { notFound, redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getScanById } from '@/lib/firebase/scans'
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

  return <ScanDetailClient scan={scan} />
}
