import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/firebase/server'
import { getPlan } from '@/lib/entitlement'
import { getCredits } from '@/lib/firebase/credits'
import { appConfig } from '@/lib/config'

// Lets the client wait for the RevenueCat webhook after checkout.
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ signedIn: false, pro: false }, { headers: { 'Cache-Control': 'no-store' } })
  const [plan, balance] = await Promise.all([getPlan(user.id), getCredits(user.id)])
  return NextResponse.json(
    {
      signedIn: true,
      pro: plan.pro,
      planId: plan.planId,
      tryOnsLeft: Math.floor(balance.total_credits / appConfig.credits.tryOn)
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
