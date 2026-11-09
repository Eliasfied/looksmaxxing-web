import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getGlowState } from '@/lib/glow-store'
import { PlanDocument } from './plan-document'

export const metadata: Metadata = { title: 'My 30-Day Glow-Up Plan (PDF)' }

// Printable version of the plan. "Save as PDF" in the print dialog turns it
// into the downloadable PDF on every desktop and mobile browser.
export default async function PlanPdfPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/glow-up')
  const state = await getGlowState(user.id)
  if (!state.plan || !state.startedAt) redirect('/glow-up')
  return <PlanDocument plan={state.plan} startedAt={state.startedAt} audience={state.intake?.audience === 'women' ? 'women' : 'men'} />
}
