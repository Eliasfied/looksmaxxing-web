import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/firebase/server'
import { getPlan } from '@/lib/entitlement'
import { getStoredPlan } from '@/lib/routines'
import { UpgradeNudge } from '@/components/pro-paywall'
import { PlanChecklist } from './plan-checklist'

const STARTERS = [
  ['glow-up-planner', '30-day glow-up plan', 'Four weeks of grooming, hair and style tasks.'],
  ['haircut-recommendation-tool', 'Haircut plan', 'Three cuts that suit you and a barber brief.'],
  ['hairstyle-finder-for-women', 'Hair and fringe plan', 'Cuts, fringes and a salon brief.']
] as const

export default async function PlanPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/plan')
  const [plan, stored] = await Promise.all([getPlan(user.id), getStoredPlan(user.id)])

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">My plan</p>
        <h1 className="mt-2 text-4xl font-black">{stored ? stored.title : 'Pick a plan to follow'}</h1>
        <p className="mt-2 text-white/60">
          Small daily steps beat big one-off changes. Your coach sees what is still open.
        </p>
      </header>

      {!plan.pro && <UpgradeNudge text="Personal plans are part of Aura Pro." />}

      {stored ? (
        <PlanChecklist plan={stored} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {STARTERS.map(([slug, title, text]) => (
            <Link
              key={slug}
              href={`/tools/${slug}?source=/dashboard`}
              className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-fuchsia-400/40"
            >
              <p className="font-bold">{title}</p>
              <p className="mt-2 text-sm text-white/55">{text}</p>
              <p className="mt-4 text-sm font-semibold text-fuchsia-300">Create →</p>
            </Link>
          ))}
        </div>
      )}
      {stored && (
        <p className="text-sm text-white/45">
          Want a different plan? Create one with the{' '}
          <Link href="/tools/glow-up-planner?source=/dashboard" className="text-fuchsia-300">
            glow-up planner
          </Link>{' '}
          and choose “Make this my plan”.
        </p>
      )}
    </div>
  )
}
