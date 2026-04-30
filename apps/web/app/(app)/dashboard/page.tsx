import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getUserScans } from '@/lib/firebase/scans'
import { ResultsClient } from './results-client'

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const scans = await getUserScans(user.id)

  return <ResultsClient initialScans={scans} />
}
