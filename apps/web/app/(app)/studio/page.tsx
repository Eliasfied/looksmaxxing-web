import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getLatestScan } from '@/lib/firebase/scans'
import { getPlan } from '@/lib/entitlement'
import { getCredits } from '@/lib/firebase/credits'
import { appConfig } from '@/lib/config'
import { findTryOn } from '@/lib/tryon-catalog'
import { StudioClient } from './studio-client'

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ type?: string; option?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/studio')
  const [scan, plan, balance, query] = await Promise.all([getLatestScan(user.id), getPlan(user.id), getCredits(user.id), searchParams])
  const picked = query.type && query.option ? findTryOn(query.type, query.option) : null
  return (
    <StudioClient
      pro={plan.pro}
      faceShape={scan?.details?.faceShape ?? null}
      tryOnsLeft={Math.floor(balance.total_credits / appConfig.credits.tryOn)}
      initialType={picked?.category.type}
      highlight={picked?.option.id}
    />
  )
}
