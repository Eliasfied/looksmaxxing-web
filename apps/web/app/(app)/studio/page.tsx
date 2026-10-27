import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getLatestScan } from '@/lib/firebase/scans'
import { getPlan } from '@/lib/entitlement'
import { getCredits } from '@/lib/firebase/credits'
import { appConfig } from '@/lib/config'
import { StudioClient } from './studio-client'

export default async function StudioPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/studio')
  const [scan, plan, balance] = await Promise.all([getLatestScan(user.id), getPlan(user.id), getCredits(user.id)])
  return (
    <StudioClient
      pro={plan.pro}
      faceShape={scan?.details?.faceShape ?? null}
      tryOnsLeft={Math.floor(balance.total_credits / appConfig.credits.tryOn)}
    />
  )
}
