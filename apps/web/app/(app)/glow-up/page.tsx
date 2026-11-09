import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getScanById, getLatestScan, type FaceScan } from '@/lib/firebase/scans'
import { getGlowState, MAX_GENERATIONS } from '@/lib/glow-store'
import { GlowSales } from '@/components/glow-sales'
import { GlowIntake } from './glow-intake'
import { GlowPlanView, type ScanBrief } from './glow-plan-view'

export const metadata: Metadata = { title: '30-Day Glow-Up Plan' }

const brief = (s: FaceScan | null): ScanBrief | null =>
  s ? { id: s.id, createdAt: s.createdAt, overallPslScore: s.overallPslScore, skinClarityScore: s.skinClarityScore } : null

function isRecent(iso: string) {
  return Date.now() - Date.parse(iso) < 7 * 86_400_000
}

export default async function GlowUpPage({
  searchParams
}: {
  searchParams: Promise<{ rebuild?: string; checkout?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/glow-up')
  const [state, latest, { rebuild, checkout }] = await Promise.all([getGlowState(user.id), getLatestScan(user.id), searchParams])

  // `checkout=1`: the visitor clicked "Start my plan" on the sales page, then
  // signed up. Open the checkout instead of showing the same page again.
  if (!state.access) return <GlowSales signedIn placement="glow-up" autoCheckout={checkout === '1'} />

  const canRebuild = state.generations < MAX_GENERATIONS
  const recent = latest && isRecent(latest.createdAt) ? latest.id : null

  if (!state.plan || !state.startedAt || (rebuild === '1' && canRebuild && state.access.active)) {
    if (!state.access.active)
      return <GlowSales signedIn placement="glow-up-expired" />
    return <GlowIntake initial={state.plan ? state.intake : null} recentScanId={recent} />
  }

  const baseline = state.baselineScanId ? await getScanById(state.baselineScanId) : null
  return (
    <GlowPlanView
      plan={state.plan}
      initialDone={state.done}
      startedAt={state.startedAt}
      accessUntil={state.access.accessUntil}
      active={state.access.active}
      baseline={brief(baseline)}
      latest={brief(latest)}
      canRebuild={canRebuild}
    />
  )
}
